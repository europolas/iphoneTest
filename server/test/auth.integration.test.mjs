import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';
import { AuthApi } from '../src/AuthApi.mjs';
import { hashPassword, decrypt, digest } from '../src/security.mjs';

test('authentication security against a real MariaDB database', async t => {
  const host = process.env.DB_TEST_HOST || 'db';
  const root = await mysql.createConnection({ host, user: 'root', password: readFileSync(process.env.DB_ROOT_PASSWORD_FILE || '/run/secrets/db_root', 'utf8').trim(), multipleStatements: true });
  const database = 'iphone_checks_' + randomBytes(6).toString('hex');
  const account = 'checks_' + randomBytes(6).toString('hex');
  const secret = randomBytes(32).toString('hex');
  let pool;
  try {
    await root.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4`);
    await root.query(`USE \`${database}\``);
    await root.query(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
    await root.query('CREATE USER ?@\'%\' IDENTIFIED BY ?', [account, secret]);
    await root.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON \`${database}\`.* TO ?@'%'`, [account]);
    pool = mysql.createPool({ host, user: account, password: secret, database, timezone: 'Z', connectionLimit: 4 });
    const config = { secret: randomBytes(32).toString('hex'), encryptionKey: randomBytes(32), appUrl: 'https://example.com/', mailConfigured: true };
    const api = new AuthApi(pool, config, await hashPassword(randomUUID()));
    const firstPassword = 'A long initial password phrase';
    const nextPassword = 'A different secure password phrase';
    let alice;
    let bob;
    let admin;

    await t.test('register validates passwords and ignores requested admin privileges', async () => {
      await assert.rejects(api.register({ email: 'bad@example.com', name: 'Bad', password: 'short' }, 'register-short'), e => e.status === 400);
      await api.register({ email: 'alice@example.com', name: '<b>Alice</b>', password: firstPassword, role: 'admin' }, 'register-a');
      await api.register({ email: 'bob@example.com', name: 'Bob', password: firstPassword }, 'register-b');
      const [users] = await pool.query('SELECT * FROM users ORDER BY email');
      assert.equal(users.length, 2);
      assert.equal(users[0].role, 'user');
      assert.notEqual(users[0].password_hash, firstPassword);
      assert.ok(users[0].password_hash.startsWith('scrypt$131072$'));
    });
    await t.test('duplicate registration is generic and cannot replace a password', async () => {
      const response = await api.register({ email: 'alice@example.com', name: 'Replacement', password: nextPassword }, 'duplicate');
      assert.ok(response.message.includes('užklausa apdorota'));
      await assert.rejects(api.login({ email: 'alice@example.com', password: nextPassword }, 'wrong-login'), e => e.status === 401);
      alice = await api.login({ email: 'alice@example.com', password: firstPassword }, 'login-a');
      bob = await api.login({ email: 'bob@example.com', password: firstPassword }, 'login-b');
      assert.notEqual(alice.token, bob.token);
      const [sessions] = await pool.query('SELECT token_hash FROM auth_sessions');
      assert.ok(sessions.some(row => row.token_hash === digest(alice.token)));
      assert.ok(sessions.every(row => row.token_hash !== alice.token));
    });
    await t.test('invalid credentials and nonexistent accounts have the same error', async () => {
      for (const email of ['alice@example.com', 'missing@example.com']) {
        await assert.rejects(api.login({ email, password: 'wrong' }, 'wrong-' + email), e => e.status === 401 && e.message === 'Neteisingi prisijungimo duomenys.');
      }
    });
    await t.test('ordinary users cannot manage other users; profile is always their own', async () => {
      await assert.rejects(api.dispatch('GET', '/users', {}, `Bearer ${alice.token}`, 'list-denied'), e => e.status === 403);
      await assert.rejects(api.dispatch('PATCH', `/users/${bob.user.id}`, { disabled: true }, `Bearer ${alice.token}`, 'block-denied'), e => e.status === 403);
      await api.dispatch('PATCH', '/me', { name: 'Alice updated', id: bob.user.id, role: 'admin' }, `Bearer ${alice.token}`, 'profile');
      const auth = await api.authenticate(`Bearer ${alice.token}`);
      assert.equal(auth.user.name, 'Alice updated');
      assert.equal(auth.user.role, 'user');
      assert.equal((await api.authenticate(`Bearer ${bob.token}`)).user.name, 'Bob');
    });
    await t.test('recovery responses hide account existence and encrypt mail payloads', async () => {
      const exists = await api.forgot({ email: 'alice@example.com' }, 'reset-exists');
      const absent = await api.forgot({ email: 'missing@example.com' }, 'reset-missing');
      assert.deepEqual(exists, absent);
      const [jobs] = await pool.query('SELECT encrypted_payload FROM email_outbox');
      assert.equal(jobs.length, 1);
      assert.equal(jobs[0].encrypted_payload.includes('alice@example.com'), false);
      const mail = decrypt(jobs[0].encrypted_payload, config.encryptionKey);
      assert.equal(mail.to, 'alice@example.com');
      const resetToken = new URL(mail.link).hash.slice('#reset='.length);
      const [rows] = await pool.query('SELECT token_hash FROM password_resets');
      assert.equal(rows[0].token_hash, digest(resetToken));
      await api.reset({ token: resetToken, password: nextPassword }, 'reset-valid');
      await assert.rejects(api.reset({ token: resetToken, password: firstPassword }, 'reset-replay'), e => e.status === 400);
      await assert.rejects(api.authenticate(`Bearer ${alice.token}`), e => e.status === 401);
      await assert.rejects(api.login({ email: 'alice@example.com', password: firstPassword }, 'old-password'), e => e.status === 401);
      alice = await api.login({ email: 'alice@example.com', password: nextPassword }, 'new-password');
    });
    await t.test('expired reset links cannot reset passwords', async () => {
      await api.forgot({ email: 'alice@example.com' }, 'forgot-expiry');
      const [jobs] = await pool.query('SELECT encrypted_payload FROM email_outbox WHERE sent_at IS NULL');
      const resetToken = new URL(decrypt(jobs[0].encrypted_payload, config.encryptionKey).link).hash.slice('#reset='.length);
      await pool.query('UPDATE password_resets SET expires_at = DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 1 SECOND)');
      await assert.rejects(api.reset({ token: resetToken, password: firstPassword }, 'expired-reset'), e => e.status === 400);
    });
    await t.test('password change requires current password and revokes every session', async () => {
      const auth = await api.authenticate(`Bearer ${alice.token}`);
      await assert.rejects(api.changePassword(auth, { currentPassword: 'wrong', password: firstPassword }, 'change-wrong'), e => e.status === 400);
      await api.changePassword(auth, { currentPassword: nextPassword, password: firstPassword }, 'change-valid');
      await assert.rejects(api.authenticate(`Bearer ${alice.token}`), e => e.status === 401);
      alice = await api.login({ email: 'alice@example.com', password: firstPassword }, 'changed-login');
    });
    await t.test('admin blocking revokes sessions and prevents login', async () => {
      await root.query('UPDATE users SET role = \'admin\' WHERE id = ?', [alice.user.id]);
      admin = await api.login({ email: 'alice@example.com', password: firstPassword }, 'admin-login');
      await api.dispatch('PATCH', `/users/${bob.user.id}`, { disabled: true }, `Bearer ${admin.token}`, 'admin-block');
      await assert.rejects(api.authenticate(`Bearer ${bob.token}`), e => e.status === 401);
      await assert.rejects(api.login({ email: 'bob@example.com', password: firstPassword }, 'blocked-login'), e => e.status === 401);
      await assert.rejects(api.dispatch('PATCH', `/users/${admin.user.id}`, { disabled: true }, `Bearer ${admin.token}`, 'self-block'), e => e.status === 400);
    });
    await t.test('logout revokes the token immediately and expired sessions are rejected', async () => {
      await api.dispatch('POST', '/logout', {}, `Bearer ${admin.token}`, 'logout');
      await assert.rejects(api.authenticate(`Bearer ${admin.token}`), e => e.status === 401);
      await pool.query('UPDATE auth_sessions SET expires_at = DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 1 SECOND)');
      await assert.rejects(api.authenticate(`Bearer ${alice.token}`), e => e.status === 401);
    });
    await t.test('rate limits are persisted; DB account cannot create tables or read system users', async () => {
      await api.limit('check', 'rate', 2, 60);
      await api.limit('check', 'rate', 2, 60);
      await assert.rejects(api.limit('check', 'rate', 2, 60), e => e.status === 429);
      await assert.rejects(pool.query('CREATE TABLE unauthorized (id INT)'), e => e.code === 'ER_TABLEACCESS_DENIED_ERROR');
      await assert.rejects(pool.query('SELECT * FROM mysql.user'), e => e.code === 'ER_TABLEACCESS_DENIED_ERROR');
    });
  } finally {
    if (pool) await pool.end();
    await root.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await root.query("DROP USER IF EXISTS ?@'%'", [account]);
    await root.end();
  }
});
