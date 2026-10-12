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
get('app-version').textContent = 'Versija ' + config.version;
const i18n = createI18n({
  lt: { intro: 'Tavo naujos programėlės pradžia.', home: 'Pradžia', settings: 'Nustatymai', modules: 'Moduliai', account: 'Paskyra', welcome: 'Sveiki!', welcomeText: 'Čia bus tavo programėlės turinys.', install: 'Safari bendrinimo meniu pasirink „Pridėti prie pradžios ekrano“.', share: 'Bendrinti', copy: 'Kopijuoti nuorodą', theme: 'Tema', language: 'Kalba', save: 'Išsaugoti', moduleText: 'Pasirink ir prijunk savo projektui reikalingas funkcijas.', update: 'Yra nauja versija. Prieš atnaujindamas išsaugok pakeitimus.', updateButton: 'Atnaujinti', saved: 'Nustatymai išsaugoti.', copied: 'Nuoroda nukopijuota.', offline: 'Nėra interneto. Serverio funkcijos laikinai nepasiekiamos.' },
  en: { intro: 'Your next app starts here.', home: 'Home', settings: 'Settings', modules: 'Modules', account: 'Account', welcome: 'Welcome!', welcomeText: 'Your app content goes here.', install: 'In Safari, choose Share → Add to Home Screen.', share: 'Share', copy: 'Copy link', theme: 'Theme', language: 'Language', save: 'Save', moduleText: 'Choose the features your project needs.', update: 'An update is available. Save your changes before updating.', updateButton: 'Update', saved: 'Settings saved.', copied: 'Link copied.', offline: 'You are offline. Server features are temporarily unavailable.' }
}, settings.state.get().language);
const network = watchNetwork();
function translate() { document.documentElement.lang = i18n.language; for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = i18n.t(node.dataset.i18n); get('network-status').textContent = network.state.get().online ? '' : i18n.t('offline'); }
settings.state.subscribe(value => { theme.set(value.theme); i18n.setLanguage(value.language); get('settings-form').elements.theme.value = value.theme; get('settings-form').elements.language.value = value.language; translate(); }, true);
network.state.subscribe(translate);
const dirty = trackDirty(get('settings-form'));
bindForm(get('settings-form'), async data => { settings.update(data); dirty.reset(); toast.show(i18n.t('saved')); }, { onError: error => toast.show(error.message, true) });
get('share-app').addEventListener('click', async () => { try { const result = await share({ title: config.name, url: new URL('./', location.href).href }); if (!result.supported) toast.show('Šiame įrenginyje bendrinimas nepalaikomas.'); } catch (error) { toast.show(error.message, true); } });
get('copy-link').addEventListener('click', async () => { try { await copyText(new URL('./', location.href).href); toast.show(i18n.t('copied')); } catch (error) { toast.show(error.message, true); } });
const groups = ['PWA · iPhone ekranas · gestai · atnaujinimai', 'API · paskyros · vartotojų valdymas', 'Saugojimas · IndexedDB · juodraščiai · siuntimo eilė', 'Navigacija · formos · dialogai · būsenos', 'Tema · kalbos · datos · skaičiai', 'Paieška · rikiavimas · puslapiavimas', 'Pranešimai · ntfy adapteris', 'Failai · kamera · vieta · bendrinimas · kopijavimas'];
for (const text of groups) get('module-list').append(element('li', { text }));
if (config.features.auth) {
  if (!config.apiUrl) throw new Error('Paskyrų moduliui reikia API adreso.');
  const fragment = await (await fetch('./account.html')).text();
  // Trusted, locally bundled template only; user data is always rendered with textContent.
  get('account-screen').append(document.createRange().createContextualFragment(fragment));
  get('account-link').hidden = false;
  const { setupAccount } = await import('./modules/auth-screen.js');
  setupAccount(config);
}
const routes = Object.fromEntries(['/', '/settings', '/modules', ...(config.features.auth ? ['/account'] : [])].map(path => [path, () => { for (const node of document.querySelectorAll('[data-screen]')) node.hidden = node.dataset.screen !== path; for (const link of document.querySelectorAll('[data-route]')) { if (link.dataset.route === path) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); } document.querySelector('main').scrollTop = 0; }]));
createRouter({ routes, onNotFound: () => { location.hash = '/'; } });
let applyUpdate;
const canReload = () => !dirty.dirty && !document.querySelector('form[aria-busy="true"]') && ![...document.querySelectorAll('input[type="password"]')].some(input => input.value);
const accountDirty = new Set();
get('account-screen').addEventListener('input', event => { const form = event.target.closest('form'); if (form) accountDirty.add(form); });
get('account-screen').addEventListener('reset', event => accountDirty.delete(event.target), true);
get('account-screen').addEventListener('app:saved', event => accountDirty.delete(event.target));
await setupPwa({ canReload: () => canReload() && accountDirty.size === 0, onUpdate: ({ apply }) => { applyUpdate = apply; get('update-card').hidden = false; }, onError: () => { if (navigator.onLine) toast.show('Atnaujinimo tikrinimas laikinai nepavyko.', true); } });
get('update-button').addEventListener('click', () => { try { applyUpdate?.(); } catch (error) { toast.show(error.message, true); } });
