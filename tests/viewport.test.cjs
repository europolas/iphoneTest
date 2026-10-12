const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup({ installed = true, userAgent = 'iPhone', angle = 0, visual = true } = {}) {
  const events = {};
  const properties = {};
  const root = { dataset: {}, style: { setProperty: (name, value) => { properties[name] = value; } } };
  const document = { documentElement: root, activeElement: null, addEventListener: (name, fn) => { events[name] = fn; } };
  const viewport = { height: 812, offsetTop: 0, addEventListener: (name, fn) => { events['visual-' + name] = fn; } };
  const window = {
    screen: { width: 402, height: 874, orientation: { angle } }, innerHeight: 812,
    matchMedia: () => ({ matches: installed }), visualViewport: visual ? viewport : undefined,
    addEventListener: (name, fn) => { events[name] = fn; }, setTimeout: fn => fn()
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../docs/viewport.js'), 'utf8'), {
    window, document, navigator: { standalone: installed, userAgent }
  });
  return { window, document, viewport, root, events, properties };
}

test('installed iPhone uses full 874px screen despite a reported 812px viewport', () => {
  const a = setup();
  assert.equal(a.properties['--app-height'], '874px');
  assert.equal(a.root.dataset.keyboard, 'false');
  a.events.pageshow();
  assert.equal(a.properties['--app-height'], '874px');
});

test('focusing an input does not create a gap before the keyboard opens', () => {
  const a = setup();
  a.document.activeElement = { matches: () => true };
  a.events.focusin();
  assert.equal(a.properties['--app-height'], '874px');
  assert.equal(a.root.dataset.keyboard, 'false');
});

test('keyboard resize keeps the bottom reachable and restores screen height on dismissal', () => {
  const a = setup();
  a.document.activeElement = { matches: () => true };
  a.viewport.height = 430;
  a.events['visual-resize']();
  assert.equal(a.properties['--app-height'], '430px');
  assert.equal(a.root.dataset.keyboard, 'true');
  a.viewport.offsetTop = 50;
  a.events['visual-scroll']();
  assert.equal(a.properties['--app-height'], '480px');
  a.viewport.height = 812;
  a.viewport.offsetTop = 0;
  a.events['visual-resize']();
  assert.equal(a.properties['--app-height'], '874px');
  a.document.activeElement = null;
  a.events.focusout();
  assert.equal(a.root.dataset.keyboard, 'false');
});

test('rotation uses the short screen dimension and restores portrait height', () => {
  const a = setup();
  a.window.screen.orientation.angle = 90;
  a.events.orientationchange();
  assert.equal(a.properties['--app-height'], '402px');
  a.window.screen.orientation.angle = 0;
  a.events.orientationchange();
  assert.equal(a.properties['--app-height'], '874px');
});

test('ordinary browser tabs and other devices keep their CSS viewport behavior', () => {
  assert.deepEqual(setup({ installed: false }).properties, {});
  assert.deepEqual(setup({ userAgent: 'Android' }).properties, {});
  assert.deepEqual(setup({ userAgent: 'iPad' }).properties, {});
});

test('older iOS can use window orientation and innerHeight without VisualViewport', () => {
  const a = setup({ visual: false });
  delete a.window.screen.orientation;
  a.window.orientation = -90;
  a.events.orientationchange();
  assert.equal(a.properties['--app-height'], '402px');
});
