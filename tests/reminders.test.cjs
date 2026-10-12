const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup({ permission = 'granted', failRequest = false, installed = true } = {}) {
  const elements = Object.fromEntries(['reminder-toggle', 'reminder-status', 'received-reminder']
    .map(id => [id, { hidden: true, addEventListener(type, fn) { this[type] = fn; } }]));
  const stored = new Map();
  const calls = [];
  const state = { permissions: 0, subscribed: 0 };
  const subscription = { toJSON: () => ({ endpoint: 'https://web.push.apple.com/test', keys: { auth: 'test-auth', p256dh: 'test-key' } }) };
  const registration = {
    pushManager: {
      getSubscription: async () => state.subscribed ? subscription : null,
      subscribe: async options => { state.subscribed++; state.options = options; return subscription; }
    }
  };
  const Notification = { requestPermission: async () => { state.permissions++; return permission; } };
  const window = {
    Notification, PushManager: {},
    location: { href: 'https://example.com/iphoneTest/' },
    matchMedia: () => ({ matches: installed }),
    setTimeout: () => 1,
    clearTimeout: () => {},
    setInterval: fn => { state.expire = fn; }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../docs/reminders.js'), 'utf8'), {
    window, Notification, URL, Uint8Array, atob, AbortController,
    navigator: { userAgent: 'iPhone', standalone: installed, serviceWorker: { ready: Promise.resolve(registration) } },
    document: { getElementById: id => elements[id], addEventListener: () => {} },
    crypto: { randomUUID: () => '12345678-1234-1234-1234-123456789abc' },
    localStorage: { getItem: key => stored.get(key) || null, setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) },
    fetch: async (url, options) => {
      calls.push({ url, body: JSON.parse(options.body) });
      if (failRequest) throw new Error('Network unavailable');
      return { ok: true, json: async () => ({ time: Math.floor(Date.now() / 1000) + 60 }) };
    }
  });
  const toggle = async checked => {
    elements['reminder-toggle'].checked = checked;
    await elements['reminder-toggle'].change();
  };
  return { elements, stored, calls, state, toggle };
}

test('one checkbox action schedules one server reminder and sends image data', async () => {
  const a = setup();
  await a.toggle(true);
  assert.equal(a.state.permissions, 1);
  assert.equal(a.state.subscribed, 1);
  assert.equal(a.state.options.userVisibleOnly, true);
  assert.equal(a.calls.length, 2);
  const subscriptionRequest = a.calls[0];
  const publishRequest = a.calls[1];
  assert.equal(subscriptionRequest.url, 'https://ntfy.sh/v1/webpush');
  assert.equal(subscriptionRequest.body.topics[0], publishRequest.body.topic);
  assert.equal(publishRequest.body.delay, '1m');
  assert.ok(publishRequest.body.attach.endsWith('/icon-512.png'));
  assert.ok(publishRequest.body.message.includes('Praėjo viena minutė'));
  assert.ok(a.stored.has('iphoneTest.reminder'));
  assert.equal(a.elements['reminder-toggle'].checked, true);
  assert.equal(a.elements['reminder-toggle'].disabled, false);
});

test('unchecking removes server topic subscription and local pending state', async () => {
  const a = setup();
  await a.toggle(true);
  await a.toggle(false);
  assert.deepEqual(a.calls[2].body.topics, []);
  assert.equal(a.stored.has('iphoneTest.reminder'), false);
  assert.equal(a.elements['reminder-toggle'].checked, false);
});

test('denied permission schedules nothing and resets checkbox', async () => {
  const a = setup({ permission: 'denied' });
  await a.toggle(true);
  assert.equal(a.calls.length, 0);
  assert.equal(a.elements['reminder-toggle'].checked, false);
  assert.ok(a.elements['reminder-status'].textContent.includes('neleidžiami'));
});

test('failed registration never claims the reminder was scheduled', async () => {
  const a = setup({ failRequest: true });
  await a.toggle(true);
  assert.equal(a.calls.length, 1);
  assert.equal(a.stored.has('iphoneTest.reminder'), false);
  assert.equal(a.elements['reminder-toggle'].checked, false);
  assert.equal(a.elements['reminder-status'].textContent, 'Network unavailable');
});

test('iPhone Safari tab directs user to the home screen app', () => {
  const a = setup({ installed: false });
  assert.equal(a.elements['reminder-toggle'].disabled, true);
  assert.ok(a.elements['reminder-status'].textContent.includes('pradžios ekrano'));
});
