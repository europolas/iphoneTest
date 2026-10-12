import { createAuth } from './auth.js';
import { bindForm } from './forms.js';
export function setupAccount(config, { document: doc = globalThis.document, window: win = globalThis.window } = {}) {
  const auth = createAuth({ id: config.id, baseUrl: config.apiUrl });
  const get = id => doc.getElementById(id);
  const cleanup = [];
  let resetToken;
  const notify = (text, error = false) => { get('auth-status').textContent = text; get('auth-status').dataset.error = String(error); };
  function mode(value) { for (const name of ['login', 'register', 'forgot', 'reset']) get(name + '-form').hidden = name !== value; for (const button of doc.querySelectorAll('[data-auth-mode][aria-pressed]')) button.setAttribute('aria-pressed', String(button.dataset.authMode === value)); }
  function listen(node, event, fn) { node.addEventListener(event, fn); cleanup.push(() => node.removeEventListener(event, fn)); }
  function bind(id, fn) { cleanup.push(bindForm(get(id), async (data, form) => { if (data.confirmation !== undefined && data.password !== data.confirmation) throw new Error('Slaptažodžiai nesutampa.'); delete data.confirmation; await fn(data, form); form.dispatchEvent(new Event('app:saved', { bubbles: true })); }, { onBusy: value => { if (value) notify('Vykdoma…'); }, onError: error => notify(error.message, true) })); }
  cleanup.push(auth.state.subscribe(({ user }) => { get('auth-guest').hidden = Boolean(user); get('auth-profile').hidden = !user; get('admin-panel').hidden = user?.role !== 'admin'; get('admin-users').replaceChildren(); if (user) { get('profile-email').textContent = user.email; get('profile-form').elements.name.value = user.name; } }, true));
  for (const button of doc.querySelectorAll('[data-auth-mode]')) listen(button, 'click', () => { mode(button.dataset.authMode); notify(''); });
  bind('login-form', async (data, form) => { const user = await auth.login(data); form.reset(); notify(`Labas, ${user.name}!`); });
  bind('register-form', async (data, form) => { const result = await auth.register(data); form.reset(); mode('login'); get('login-form').elements.email.value = data.email; notify(result.message); });
  bind('forgot-form', async data => notify((await auth.forgotPassword(data.email)).message));
  bind('reset-form', async (data, form) => { const result = await auth.resetPassword(resetToken, data.password); resetToken = null; form.reset(); mode('login'); notify(result.message); });
  bind('profile-form', async data => { await auth.updateProfile(data.name); notify('Vardas išsaugotas.'); });
  bind('password-form', async (data, form) => { const result = await auth.changePassword(data.currentPassword, data.password); form.reset(); mode('login'); notify(result.message); });
  bind('delete-account-form', async (data, form) => { if (data.confirmDelete !== 'DELETE') throw new Error('Patvirtink paskyros ištrynimą.'); const result = await auth.deleteAccount(data.currentPassword); form.reset(); mode('login'); notify(result.message); });
  listen(get('logout-button'), 'click', async () => { const button = get('logout-button'); if (button.disabled) return; button.disabled = true; try { await auth.logout(); mode('login'); notify('Atsijungei.'); } catch (error) { notify(error.message, true); } finally { button.disabled = false; } });
  listen(get('load-users'), 'click', async () => {
    const button = get('load-users'); if (button.disabled) return; button.disabled = true;
    try { const result = await auth.listUsers(); const list = get('admin-users'); list.replaceChildren(); for (const user of result.users) { const row = doc.createElement('li'); const label = doc.createElement('span'); label.textContent = `${user.name} · ${user.email} · ${user.disabled ? 'užblokuotas' : 'aktyvus'}`; const action = doc.createElement('button'); action.type = 'button'; action.className = 'text-button'; action.textContent = user.disabled ? 'Atblokuoti' : 'Blokuoti'; action.disabled = user.id === auth.state.get().user?.id; action.addEventListener('click', async () => { action.disabled = true; try { notify((await auth.setBlocked(user.id, !user.disabled)).message); list.replaceChildren(); } catch (error) { notify(error.message, true); action.disabled = false; } }); row.append(label, action); list.append(row); } notify('Vartotojų sąrašas atnaujintas.'); } catch (error) { notify(error.message, true); } finally { button.disabled = false; }
  });
  const fragment = new URLSearchParams(win.location.hash.slice(1));
  if (fragment.has('reset')) { resetToken = fragment.get('reset'); win.history.replaceState(null, '', win.location.pathname + win.location.search + '#/account'); mode('reset'); notify('Pasirink naują slaptažodį.'); }
  else if (auth.getToken()) auth.restore().then(user => { if (auth.state.get().user === user) notify(`Labas, ${user.name}!`); }).catch(error => { mode('login'); notify(error.message, true); });
  else auth.api.get('/health').then(result => { if (!auth.state.get().user && get('auth-status').textContent === 'Tikrinamas ryšys su serveriu…') notify(result.passwordRecoveryAvailable ? 'Prisijunk arba susikurk paskyrą.' : 'Prisijungimas veikia. Slaptažodžio atkūrimo siuntimas dar ruošiamas.'); }).catch(error => notify(error.message, true));
  return { auth, destroy() { cleanup.forEach(remove => remove()); } };
}
