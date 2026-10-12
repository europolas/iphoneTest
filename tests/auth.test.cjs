const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const sessionKey = 'iphoneTest.authSession';
const token = 'a'.repeat(64);
const tick = () => new Promise(resolve => setImmediate(resolve));
function setup({ saved, hash = '', reply = () => ({ status: 200, data: { passwordRecoveryAvailable: false } }) } = {}) {
  const elements = new Map();
  const stored = new Map(saved ? [[sessionKey, JSON.stringify(saved)]] : []);
  const calls = [];
  let replaced;
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      hidden: false, dataset: {}, elements: { name: { value: '' }, email: { value: '' } },
      addEventListener(type, fn) { this[type] = fn; },
      replaceChildren() {}, reset() { this.wasReset = true; }
    });
    return elements.get(id);
  }
  vm.runInNewContext(fs.readFileSync(require.resolve('../docs/auth.js'), 'utf8'), {
    document: { getElementById: element, querySelectorAll: () => [] },
    sessionStorage: { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) },
    window: { setTimeout: () => 1, clearTimeout() {}, location: { hash, pathname: '/iphoneTest/', search: '' }, history: { replaceState: (_, __, value) => { replaced = value; } } },
    FormData: class { constructor(form) { return Object.entries(form.data); } },
    URLSearchParams, AbortController,
    fetch: async (url, options) => {
      calls.push({ url, options });
      const result = reply(url, options);
      return { ok: result.status < 400, status: result.status, json: async () => result.data };
    }
  });
  return { element, calls, stored, replaced: () => replaced, async submit(id, data) { const form = element(id); form.data = data; form.submit({ preventDefault() {} }); await tick(); } };
}

test('login uses HTTPS without cookies and stores only the opaque session', async () => {
  const a = setup({ reply: url => url.endsWith('/health') ? { status: 200, data: {} } : { status: 200, data: { token, expiresAt: '2099-01-01', user: { email: 'me@example.com', name: '<img onerror=bad()>', role: 'user' } } } });
  await tick();
  await a.submit('login-form', { email: 'me@example.com', password: 'a long private password' });
  const call = a.calls.at(-1);
  assert.equal(call.url, 'https://perimove.com/iphone-api/v1/login');
  assert.equal(call.options.credentials, 'omit');
  assert.equal(call.options.cache, 'no-store');
  assert.deepEqual(JSON.parse(a.stored.get(sessionKey)), { token, expiresAt: '2099-01-01' });
  assert.equal(a.element('auth-profile').hidden, false);
  assert.equal(a.element('admin-panel').hidden, true);
  assert.equal(a.element('login-form').wasReset, true);
  assert.ok(a.element('auth-status').textContent.includes('<img onerror=bad()>'));
});

test('expired server sessions clear credentials and show the server message', async () => {
  const a = setup({ saved: { token, expiresAt: '2099-01-01' }, reply: () => ({ status: 401, data: { error: 'Sesija baigėsi.' } }) });
  await tick();
  assert.equal(a.stored.has(sessionKey), false);
  assert.equal(a.element('auth-profile').hidden, true);
  assert.equal(a.element('auth-status').textContent, 'Sesija baigėsi.');
});

test('reset token is removed from the URL and used once in the reset request', async () => {
  const a = setup({ hash: '#reset=' + token, reply: () => ({ status: 200, data: { message: 'Pakeista.' } }) });
  assert.equal(a.replaced(), '/iphoneTest/');
  assert.equal(a.calls.length, 0);
  await a.submit('reset-form', { password: 'a new long password', confirmation: 'a new long password' });
  assert.deepEqual(JSON.parse(a.calls[0].options.body), { token, password: 'a new long password' });
  assert.equal(a.element('reset-form').hidden, true);
  assert.equal(a.element('login-form').hidden, false);
});

test('password mismatch sends nothing and unavailable email does not claim delivery', async () => {
  const a = setup({ reply: url => url.endsWith('/health') ? { status: 200, data: { passwordRecoveryAvailable: false } } : { status: 503, data: { error: 'Siuntimas dar nesukonfigūruotas.' } } });
  await tick();
  await a.submit('register-form', { password: 'a long password', confirmation: 'different' });
  assert.equal(a.calls.length, 1);
  assert.equal(a.element('auth-status').textContent, 'Slaptažodžiai nesutampa.');
  await a.submit('forgot-form', { email: 'me@example.com' });
  assert.equal(a.element('auth-status').textContent, 'Siuntimas dar nesukonfigūruotas.');
  assert.equal(a.element('auth-status').dataset.error, 'true');
});
