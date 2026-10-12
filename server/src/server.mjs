import http from 'node:http';
import { readFileSync } from 'node:fs';
import mysql from 'mysql2/promise';
import nodemailer from 'nodemailer';
import { randomBytes } from 'node:crypto';
import { AuthApi } from './AuthApi.mjs';
import { ApiError, hashPassword, decrypt } from './security.mjs';

const readSecret = variable => readFileSync(process.env[variable], 'utf8').trim();
const config = {
  secret: readSecret('API_SECRET_FILE'),
  encryptionKey: Buffer.from(readSecret('MAIL_KEY_FILE'), 'hex'),
  appUrl: process.env.APP_URL || 'https://europolas.github.io/iphoneTest/',
  mailConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM && process.env.MAIL_DELIVERY_READY === 'true')
};
if (config.encryptionKey.length !== 32 || config.secret.length < 32) throw Error('Invalid private configuration');
const origins = new Set((process.env.ALLOWED_ORIGINS || 'https://europolas.github.io').split(','));
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'db', user: process.env.DB_USER || 'iphone_app',
  password: readSecret('DB_PASSWORD_FILE'), database: 'iphone_test',
  connectionLimit: 8, queueLimit: 32, waitForConnections: true,
  timezone: 'Z', charset: 'utf8mb4', multipleStatements: false
});
await pool.query('SELECT 1');
const api = new AuthApi(pool, config, await hashPassword(randomBytes(32).toString('hex')));
const transport = process.env.SMTP_HOST && process.env.SMTP_FROM ? nodemailer.createTransport({
  host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_PORT === '465', requireTLS: true,
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: readSecret('SMTP_PASSWORD_FILE') } : undefined,
  tls: {
    minVersion: 'TLSv1.2', rejectUnauthorized: true,
    ...(process.env.SMTP_CA_FILE ? { ca: readFileSync(process.env.SMTP_CA_FILE) } : {})
  },
  ...(process.env.DKIM_KEY_FILE ? { dkim: { domainName: 'perimove.com', keySelector: 'iphone', privateKey: readSecret('DKIM_KEY_FILE') } } : {}),
  connectionTimeout: 10000, socketTimeout: 15000
}) : null;
let sending = false;
async function flushMail() {
  if (!transport || sending) return;
  sending = true;
  try {
    const [rows] = await pool.execute('SELECT id, encrypted_payload FROM email_outbox WHERE sent_at IS NULL AND attempts < 3 AND available_at <= UTC_TIMESTAMP(3) ORDER BY available_at LIMIT 1');
    if (!rows.length) return;
    const job = rows[0];
    const mail = decrypt(job.encrypted_payload, config.encryptionKey);
    try {
      await transport.sendMail({
        from: process.env.SMTP_FROM, to: mail.to,
        subject: 'Mano Demo – slaptažodžio atkūrimas',
        text: `Slaptažodžiui pakeisti atidaryk šią nuorodą:\n${mail.link}\n\nNuoroda galioja 30 minučių ir gali būti panaudota vieną kartą. Jei atkūrimo neprašei, šį laišką ignoruok.`,
        disableFileAccess: true, disableUrlAccess: true
      });
      await pool.execute("UPDATE email_outbox SET sent_at = UTC_TIMESTAMP(3), encrypted_payload = '' WHERE id = ?", [job.id]);
    } catch {
      await pool.execute('UPDATE email_outbox SET attempts = attempts + 1, available_at = DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 60 SECOND) WHERE id = ?', [job.id]);
      console.error('Password recovery email delivery failed; retry queued');
    }
  } catch { console.error('Email queue processing failed'); }
  finally { sending = false; }
}
const cleanup = setInterval(async () => {
  try {
    await pool.query('DELETE FROM auth_sessions WHERE expires_at < UTC_TIMESTAMP(3)');
    await pool.query('DELETE FROM auth_rate_limits WHERE expires_at < UTC_TIMESTAMP(3)');
    await pool.query('DELETE FROM password_resets WHERE expires_at < UTC_TIMESTAMP(3)');
    await pool.query('DELETE FROM email_outbox WHERE available_at < DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 1 DAY)');
  } catch { console.error('Expired authentication data cleanup failed'); }
}, 600000);
const mailTimer = setInterval(flushMail, 5000);

function body(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > 16384) { reject(new ApiError(413, 'Užklausa per didelė.')); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error();
        resolve(data);
      } catch { reject(new ApiError(400, 'Netinkami užklausos duomenys.')); }
    });
    req.on('error', reject);
  });
}
export const server = http.createServer({ requestTimeout: 20000, headersTimeout: 10000, maxHeaderSize: 8192 }, async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Vary', 'Origin');
  const respond = (status, data) => { res.writeHead(status); res.end(JSON.stringify(data)); };
  try {
    const origin = req.headers.origin;
    if (origin && !origins.has(origin)) throw new ApiError(403, 'Šis programėlės adresas neleidžiamas.');
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/health' && req.method === 'GET') { await pool.query('SELECT 1'); respond(200, { ok: true, passwordRecoveryAvailable: config.mailConfigured }); return; }
    if (!path.startsWith('/v1/')) throw new ApiError(404, 'Užklausa nerasta.');
    let payload = {};
    if (req.method === 'POST' || req.method === 'PATCH') {
      if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) throw new ApiError(415, 'Reikalingas JSON užklausos formatas.');
      payload = await body(req);
    }
    // Konteinerio portas pasiekiamas tik loopback. Šį header perrašo vietinis nginx.
    const ip = process.env.TRUST_PROXY === 'true' ? req.headers['x-real-ip'] || req.socket.remoteAddress : req.socket.remoteAddress;
    const [status, data] = await api.dispatch(req.method, path.slice(3), payload, req.headers.authorization, ip);
    respond(status, data);
  } catch (error) {
    if (error instanceof ApiError) { if (error.status === 429) res.setHeader('Retry-After', '60'); respond(error.status, { error: error.message }); }
    else { console.error('API request failed', { code: typeof error.code === 'string' ? error.code : 'internal' }); respond(500, { error: 'Serverio klaida. Bandyk vėliau.' }); }
  }
});
server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('iPhone authentication API ready'));
async function shutdown() { clearInterval(cleanup); clearInterval(mailTimer); server.close(); await pool.end(); }
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
