/**
 * Compose optional modules into the clean starter. Keep app-specific behavior here; translate all UI text through the shared i18n instance. Dirty settings and account forms protect PWA updates.
 * See AGENTS.md and the reusable library docs/ARCHITECTURE.md.
 */
import { createConfig, createStorage, createSettings, createTheme, createI18n, createRouter, createToast, bindForm, trackDirty, setupViewport, setupGestures, setupPwa, watchNetwork, copyText, share, element } from './modules/index.js';

const config = createConfig(await (await fetch('./app.config.json')).json());
const get = id => document.getElementById(id);
const storage = createStorage(config.id);
const settings = createSettings(storage, { theme: config.theme, language: config.language }, { theme: value => ['dark', 'light', 'system'].includes(value), language: value => ['lt', 'en'].includes(value) });
const theme = createTheme({ storage });
const toast = createToast(get('toast'));
setupViewport(); setupGestures(config.interaction);
document.title = config.name;
get('app-name').textContent = config.name;
get('footer-name').textContent = config.name + ' · ' + config.version;
const i18n = createI18n(undefined, settings.state.get().language);
const network = watchNetwork();
function translate() {
  i18n.render(document);
  get('app-version').textContent = i18n.t('version', { version: config.version });
  get('network-status').textContent = network.state.get().online ? '' : i18n.t('offline');
  get('module-list').replaceChildren(...['groupPwa', 'groupAuth', 'groupStorage', 'groupUi', 'groupLocale', 'groupSearch', 'groupPush', 'groupDevice'].map(key => element('li', { text: i18n.t(key) })));
}
settings.state.subscribe(value => { theme.set(value.theme); i18n.setLanguage(value.language); get('settings-form').elements.theme.value = value.theme; get('settings-form').elements.language.value = value.language; translate(); }, true);
network.state.subscribe(translate);
const dirty = trackDirty(get('settings-form'));
bindForm(get('settings-form'), async data => { settings.update(data); dirty.reset(); toast.show(i18n.t('saved')); }, { onError: error => toast.show(i18n.message(error.message), true) });
get('share-app').addEventListener('click', async () => { try { const result = await share({ title: config.name, url: new URL('./', location.href).href }); if (!result.supported) toast.show(i18n.t('shareUnsupported')); } catch (error) { toast.show(i18n.message(error.message), true); } });
get('copy-link').addEventListener('click', async () => { try { await copyText(new URL('./', location.href).href); toast.show(i18n.t('copied')); } catch (error) { toast.show(i18n.message(error.message), true); } });
if (config.features.auth) {
  if (!config.apiUrl) throw new Error('The account module requires an API URL.');
  const fragment = await (await fetch('./account.html')).text();
  // Trusted, locally bundled template only; user data is always rendered with textContent.
  get('account-screen').append(document.createRange().createContextualFragment(fragment));
  get('account-link').hidden = false;
  const { setupAccount } = await import('./modules/auth-screen.js');
  setupAccount(config, { i18n });
  translate();
}
const routes = Object.fromEntries(['/', '/settings', '/modules', ...(config.features.auth ? ['/account'] : [])].map(path => [path, () => { for (const node of document.querySelectorAll('[data-screen]')) node.hidden = node.dataset.screen !== path; for (const link of document.querySelectorAll('[data-route]')) { if (link.dataset.route === path) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); } document.querySelector('main').scrollTop = 0; }]));
createRouter({ routes, onNotFound: () => { location.hash = '/'; } });
let applyUpdate;
const canReload = () => !dirty.dirty && !document.querySelector('form[aria-busy="true"]') && ![...document.querySelectorAll('input[type="password"]')].some(input => input.value);
const accountDirty = new Set();
get('account-screen').addEventListener('input', event => { const form = event.target.closest('form'); if (form) accountDirty.add(form); });
get('account-screen').addEventListener('reset', event => accountDirty.delete(event.target), true);
get('account-screen').addEventListener('app:saved', event => accountDirty.delete(event.target));
await setupPwa({ canReload: () => canReload() && accountDirty.size === 0, onUpdate: ({ apply }) => { applyUpdate = apply; get('update-card').hidden = false; }, onError: () => { if (navigator.onLine) toast.show(i18n.t('updateFailed'), true); } });
get('update-button').addEventListener('click', () => { try { applyUpdate?.(); } catch (error) { toast.show(i18n.message(error.message), true); } });
