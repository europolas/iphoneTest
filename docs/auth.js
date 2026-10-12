'use strict';

(() => {
  const base = 'https://perimove.com/iphone-api';
  const sessionKey = 'iphoneTest.authSession';
  const status = document.getElementById('auth-status');
  const guest = document.getElementById('auth-guest');
  const profile = document.getElementById('auth-profile');
  let session = null;
  let resetToken = null;
  let busy = false;
  let generation = 0;
  try {
    const stored = JSON.parse(sessionStorage.getItem(sessionKey));
    if (stored && /^[a-f0-9]{64}$/.test(stored.token) && Date.parse(stored.expiresAt) > Date.now()) session = stored;
    else sessionStorage.removeItem(sessionKey);
  } catch { /* Be sessionStorage sesija saugoma tik atmintyje. */ }

  function notify(message, error = false) {
    status.textContent = message;
    status.dataset.error = String(error);
  }
  function remember(value) {
    generation++;
    session = value;
    try {
      if (value) sessionStorage.setItem(sessionKey, JSON.stringify(value));
      else sessionStorage.removeItem(sessionKey);
    } catch { /* Nenaudojama localStorage ilgalaikiam prisijungimui. */ }
  }
  function mode(value) {
    for (const item of ['login', 'register', 'forgot', 'reset']) {
      document.getElementById(`${item}-form`).hidden = value !== item;
    }
    for (const button of document.querySelectorAll('[data-auth-mode]')) {
      if (button.hasAttribute('aria-pressed')) button.setAttribute('aria-pressed', String(button.dataset.authMode === value));
    }
  }
  function showUser(user) {
    guest.hidden = Boolean(user);
    profile.hidden = !user;
    document.getElementById('admin-panel').hidden = user?.role !== 'admin';
    document.getElementById('admin-users').replaceChildren();
    if (user) {
      document.getElementById('profile-email').textContent = user.email;
      document.getElementById('profile-form').elements.name.value = user.name;
    }
  }
  class UserApi {
    async request(path, method = 'GET', body) {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 20000);
      const headers = {};
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      if (session) headers.Authorization = `Bearer ${session.token}`;
      try {
        const response = await fetch(`${base}${path}`, {
          method, headers, body: body === undefined ? undefined : JSON.stringify(body),
          credentials: 'omit', cache: 'no-store', signal: controller.signal
        });
        const result = await response.json();
        if (!response.ok) {
          if (response.status === 401 && session) { remember(null); showUser(null); mode('login'); notify(result.error || 'Prisijunk iš naujo.', true); }
          throw new Error(result.error || 'Užklausa nepavyko.');
        }
        return result;
      } catch (error) {
        if (error.name === 'AbortError' || error instanceof TypeError) throw new Error('Serveris nepasiekiamas. Patikrink ryšį ir bandyk dar kartą.');
        throw error;
      } finally { window.clearTimeout(timeout); }
    }
  }
  const api = new UserApi();
  async function action(task) {
    if (busy) return;
    busy = true;
    const controls = [...document.querySelectorAll('.account-card button')];
    controls.forEach(control => { control.disabled = true; });
    notify('Vykdoma…');
    try { await task(); }
    catch (error) { notify(error.message, true); }
    finally { busy = false; controls.forEach(control => { control.disabled = false; }); }
  }
  function bind(id, task) {
    const form = document.getElementById(id);
    form.addEventListener('submit', event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      action(async () => {
        if ('confirmation' in data && data.password !== data.confirmation) throw new Error('Slaptažodžiai nesutampa.');
        delete data.confirmation;
        await task(data, form);
      });
    });
  }
  for (const button of document.querySelectorAll('[data-auth-mode]')) {
    button.addEventListener('click', () => { mode(button.dataset.authMode); notify(''); });
  }
  bind('login-form', async (data, form) => {
    const result = await api.request('/v1/login', 'POST', data);
    remember({ token: result.token, expiresAt: result.expiresAt });
    showUser(result.user);
    form.reset();
    notify(`Labas, ${result.user.name}! Prisijungei.`);
  });
  bind('register-form', async (data, form) => {
    const result = await api.request('/v1/register', 'POST', data);
    form.reset();
    mode('login');
    document.getElementById('login-form').elements.email.value = data.email;
    notify(result.message);
  });
  bind('forgot-form', async data => {
    const result = await api.request('/v1/forgot-password', 'POST', data);
    notify(result.message);
  });
  bind('reset-form', async (data, form) => {
    const result = await api.request('/v1/reset-password', 'POST', { token: resetToken, password: data.password });
    resetToken = null;
    remember(null);
    showUser(null);
    form.reset();
    mode('login');
    notify(result.message);
  });
  bind('profile-form', async data => {
    const result = await api.request('/v1/me', 'PATCH', data);
    showUser(result.user);
    notify('Vardas išsaugotas.');
  });
  bind('password-form', async (data, form) => {
    const result = await api.request('/v1/change-password', 'POST', data);
    remember(null);
    showUser(null);
    form.reset();
    mode('login');
    notify(result.message);
  });
  document.getElementById('logout-button').addEventListener('click', () => action(async () => {
    try { await api.request('/v1/logout', 'POST', {}); }
    finally { remember(null); showUser(null); mode('login'); }
    notify('Atsijungei.');
  }));
  document.getElementById('load-users').addEventListener('click', () => action(async () => {
    const result = await api.request('/v1/users');
    const list = document.getElementById('admin-users');
    list.replaceChildren();
    for (const user of result.users) {
      const item = document.createElement('li');
      const text = document.createElement('span');
      text.textContent = `${user.name} · ${user.email} · ${user.disabled ? 'užblokuotas' : 'aktyvus'}`;
      item.append(text);
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'text-button';
      button.textContent = user.disabled ? 'Atblokuoti' : 'Blokuoti';
      button.addEventListener('click', () => action(async () => {
        const changed = await api.request(`/v1/users/${user.id}`, 'PATCH', { disabled: !user.disabled });
        notify(changed.message);
        list.replaceChildren();
      }));
      item.append(button); list.append(item);
    }
    notify('Vartotojų sąrašas atnaujintas.');
  }));

  const fragment = new URLSearchParams(window.location.hash.slice(1));
  if (fragment.has('reset')) {
    resetToken = fragment.get('reset');
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    remember(null); showUser(null); mode('reset');
    notify('Pasirink naują slaptažodį.');
  } else if (session) {
    const currentGeneration = generation;
    api.request('/v1/me').then(result => {
      if (generation === currentGeneration) { showUser(result.user); notify(`Labas, ${result.user.name}!`); }
    }).catch(error => { if (generation === currentGeneration) notify(error.message, true); });
  } else {
    const currentGeneration = generation;
    api.request('/health').then(result => {
      if (generation === currentGeneration && !busy) notify(result.passwordRecoveryAvailable
        ? 'Prisijunk arba susikurk paskyrą.'
        : 'Prisijungimas ir registracija veikia. Slaptažodžio atkūrimo el. pašto siuntimas dar ruošiamas.');
    }).catch(error => { if (generation === currentGeneration && !busy) notify(error.message, true); });
  }
})();
