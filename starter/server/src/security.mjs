import { randomBytes, scrypt as callbackScrypt, timingSafeEqual, createHash, createHmac, createCipheriv, createDecipheriv } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(callbackScrypt);
const options = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
let running = 0;
const waiting = [];
async function limited(task) {
  if (running >= 2) {
    if (waiting.length >= 16) throw new ApiError(503, 'Serveris užimtas. Bandyk vėliau.');
    await new Promise(resolve => waiting.push(resolve));
  } else running++;
  try { return await task(); }
  finally { if (waiting.length) waiting.shift()(); else running--; }
}

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function digest(value) { return createHash('sha256').update(value).digest('hex'); }
export function bucket(key, value) { return createHmac('sha256', key).update(value).digest('hex'); }
export function token() { return randomBytes(32).toString('hex'); }
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await limited(() => scrypt(password, salt, 64, options));
  return `scrypt$${options.N}$8$1$${salt}$${key.toString('hex')}`;
}
export async function verifyPassword(password, encoded) {
  const parts = encoded.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt' || parts[1] !== String(options.N) || parts[2] !== '8' || parts[3] !== '1' || !/^[a-f0-9]{32}$/.test(parts[4]) || !/^[a-f0-9]{128}$/.test(parts[5])) return false;
  const key = await limited(() => scrypt(password, parts[4], 64, options));
  return timingSafeEqual(key, Buffer.from(parts[5], 'hex'));
}
export function email(value) {
  if (typeof value !== 'string') throw new ApiError(400, 'Įvesk tinkamą el. pašto adresą.');
  const result = value.trim().toLowerCase();
  if (result.length > 254 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/.test(result)) throw new ApiError(400, 'Įvesk tinkamą el. pašto adresą.');
  return result;
}
export function password(value) {
  if (typeof value !== 'string' || [...value].length < 15 || [...value].length > 128 || Buffer.byteLength(value) > 512) throw new ApiError(400, 'Slaptažodis turi būti nuo 15 iki 128 simbolių.');
  return value;
}
export function name(value) {
  if (typeof value !== 'string' || !value.trim() || [...value.trim()].length > 80 || /[\u0000-\u001f\u007f]/.test(value)) throw new ApiError(400, 'Vardas turi būti nuo 1 iki 80 simbolių.');
  return value.trim();
}
export function encrypt(value, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
}
export function decrypt(value, key) {
  const packed = Buffer.from(value, 'base64');
  const cipher = createDecipheriv('aes-256-gcm', key, packed.subarray(0, 12));
  cipher.setAuthTag(packed.subarray(12, 28));
  return JSON.parse(Buffer.concat([cipher.update(packed.subarray(28)), cipher.final()]).toString('utf8'));
}
