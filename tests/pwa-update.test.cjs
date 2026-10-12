const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '..', 'docs', name), 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));

function app(controlled = true) {
  const elements = Object.fromEntries(['count', 'increment', 'reset', 'storage-note']
    .map(id => [id, { addEventListener(type, fn) { this[type] = fn; } }]));
  const events = {};
  const values = new Map([['iphoneTest.tapCount', '7']]);
  const state = { reloads: 0, checks: 0 };
  const document = {
    visibilityState: 'visible',
    getElementById: id => elements[id],
    addEventListener: (type, fn) => { events[type] = fn; }
  };
  const navigator = {
    onLine: true,
    serviceWorker: {
      controller: controlled ? {} : null,
      addEventListener: (type, fn) => { events[type] = fn; },
      register: async (url, options) => {
        state.registration = { url, options };
        return { update: async () => { state.checks++; } };
      }
    }
  };
  const window = {
    location: { reload: () => { state.reloads++; } },
    addEventListener: (type, fn) => { events[type] = fn; },
    setInterval: (fn, delay) => { state.timer = fn; state.delay = delay; }
  };
  vm.runInNewContext(read('app.js'), {
    document, navigator, window,
    localStorage: { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) }
  });
  return { state, events, document, navigator, values, elements };
}

test('checks on startup, return, reconnect, and each visible minute', async () => {
  const a = app();
  await flush();
  assert.equal(a.state.registration.options.updateViaCache, 'none');
  assert.equal(a.state.checks, 1);
  assert.equal(a.state.delay, 60000);
  a.events.visibilitychange();
  a.events.online();
  a.events.pageshow();
  a.state.timer();
  assert.equal(a.state.checks, 5);
  a.document.visibilityState = 'hidden';
  a.state.timer();
  a.document.visibilityState = 'visible';
  a.navigator.onLine = false;
  a.state.timer();
  assert.equal(a.state.checks, 5);
});

test('new controller reloads once and preserves the saved counter', async () => {
  const a = app();
  await flush();
  a.elements.increment.click();
  a.events.controllerchange();
  a.events.controllerchange();
  assert.equal(a.state.reloads, 1);
  assert.equal(a.values.get('iphoneTest.tapCount'), '8');
});

test('first installation does not reload; later updates do', async () => {
  const a = app(false);
  await flush();
  a.events.controllerchange();
  assert.equal(a.state.reloads, 0);
  a.events.controllerchange();
  assert.equal(a.state.reloads, 1);
});

function worker(failDownload = false) {
  const events = {};
  const state = { skipped: 0, claimed: 0, deleted: [], opened: [], requests: [] };
  const cache = {
    addAll: async requests => {
      state.requests = requests;
      if (failDownload) throw Error('offline');
    },
    match: async request => {
      const url = typeof request === 'string' ? request : request.url || request.href;
      return url.endsWith('/index.html') ? 'cached-page' : undefined;
    }
  };
  vm.runInNewContext(read('sw.js').replace('__BUILD_VERSION__', 'new-version'), {
    URL, Request,
    self: {
      registration: { scope: 'https://example.com/iphoneTest/' },
      location: { origin: 'https://example.com' },
      addEventListener: (type, fn) => { events[type] = fn; },
      skipWaiting: async () => { state.skipped++; },
      clients: { claim: async () => { state.claimed++; } }
    },
    caches: {
      open: async name => { state.opened.push(name); return cache; },
      keys: async () => ['iphoneTest-v1', 'iphoneTest-new-version', 'another-app'],
      delete: async name => { state.deleted.push(name); }
    },
    fetch: async () => { throw Error('offline'); }
  });
  const lifecycle = async type => {
    let pending;
    events[type]({ waitUntil: promise => { pending = promise; } });
    await pending;
  };
  return { state, events, lifecycle };
}

test('download all fresh files before immediate activation, then remove old cache', async () => {
  const w = worker();
  await w.lifecycle('install');
  assert.equal(w.state.skipped, 1);
  assert.equal(w.state.requests.length, 7);
  assert.ok(w.state.requests.every(request => request.cache === 'reload'));
  await w.lifecycle('activate');
  assert.deepEqual(w.state.deleted, ['iphoneTest-v1']);
  assert.equal(w.state.claimed, 1);
});

test('failed download never replaces the working version', async () => {
  const w = worker(true);
  await assert.rejects(w.lifecycle('install'), /offline/);
  assert.equal(w.state.skipped, 0);
  assert.equal(w.state.claimed, 0);
  assert.deepEqual(w.state.deleted, []);
});

test('offline navigation uses the page from the current version', async () => {
  const w = worker();
  let response;
  w.events.fetch({
    request: { method: 'GET', url: 'https://example.com/iphoneTest/?home=1', mode: 'navigate' },
    respondWith: promise => { response = promise; }
  });
  assert.equal(await response, 'cached-page');
  assert.deepEqual(w.state.opened, ['iphoneTest-new-version']);
});
