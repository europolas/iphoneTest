'use strict';

(() => {
  const service = 'https://ntfy.sh';
  // Viešas ntfy Web Push raktas. Privataus rakto ar paskyros slaptažodžio čia nėra.
  const publicKey = 'BEMjM0sNxh41x0a6Lz3YaqkJ7AUhZefxsOQgw-at69i0fM1CybVBcj7-QQXf4N_tPCgFnOXdRbQ5jrSrr9Yg9Lc';
  const storageKey = 'iphoneTest.reminder';
  const checkbox = document.getElementById('reminder-toggle');
  const status = document.getElementById('reminder-status');
  let pending = null;
  let busy = false;

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && Number.isFinite(saved.due) && saved.due > Date.now()) pending = saved;
  } catch { /* Priminimas gali veikti ir be naršyklės duomenų saugojimo. */ }

  function persist() {
    try {
      if (pending) localStorage.setItem(storageKey, JSON.stringify(pending));
      else localStorage.removeItem(storageKey);
    } catch { /* Push pristatymas nepriklauso nuo localStorage. */ }
  }

  function render() {
    checkbox.checked = Boolean(pending);
    if (pending) {
      status.textContent = 'Suplanuotas vienas pranešimas maždaug po minutės. Gali uždaryti programėlę. Atžymėjęs jį atšauksi.';
    }
  }

  async function request(url, body) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: controller.signal
      });
      if (!response.ok) throw new Error(`Siuntimo paslauga atsakė ${response.status}. Bandyk vėliau.`);
      return await response.json();
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function keyBytes(key) {
    const base64 = key.replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64 + '='.repeat((4 - base64.length % 4) % 4));
    return Uint8Array.from(raw, char => char.charCodeAt(0));
  }

  async function updateTopics(subscription, topics) {
    const serialized = subscription.toJSON();
    return request(`${service}/v1/webpush`, {
      endpoint: serialized.endpoint,
      auth: serialized.keys.auth,
      p256dh: serialized.keys.p256dh,
      topics
    });
  }

  function expired() {
    if (!busy && pending && pending.due <= Date.now()) {
      pending = null;
      persist();
      render();
      status.textContent = 'Minutė praėjo. Pranešimas gali kiek vėluoti dėl ryšio ar telefono nustatymų. Gali suplanuoti naują.';
    }
  }

  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  if (isIOS && !standalone) {
    checkbox.disabled = true;
    status.textContent = 'Pranešimams atidaryk programėlę per pradžios ekrano ikoną.';
    return;
  }
  if (!('Notification' in window) || !('PushManager' in window) || !('serviceWorker' in navigator)) {
    checkbox.disabled = true;
    status.textContent = 'Ši naršyklė nepalaiko pranešimų. iPhone reikia iOS 16.4 ar naujesnės ir pradžios ekrano programėlės.';
    return;
  }

  render();
  checkbox.addEventListener('change', async () => {
    if (busy) return;
    const enabled = checkbox.checked;
    busy = true;
    checkbox.disabled = true;
    status.textContent = enabled ? 'Ruošiamas pranešimas…' : 'Atšaukiamas pranešimas…';
    try {
      // Leidimas prašomas tiesiogiai po vartotojo paspaudimo, prieš kitus await.
      if (enabled) {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') throw new Error('Pranešimai neleidžiami. Leidimą gali pakeisti iPhone pranešimų nustatymuose.');
      }
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!enabled) {
        if (subscription) await updateTopics(subscription, []);
        pending = null;
        persist();
        render();
        status.textContent = 'Priminimas atšauktas. Jau pristatyto pranešimo atšaukti negalima.';
        return;
      }
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true, applicationServerKey: keyBytes(publicKey)
        });
      }
      // Naujas atsitiktinis kanalas kiekvienam bandymui: kitų vartotojų priminimai nesimaišo.
      const topic = `iphoneTest-${crypto.randomUUID().replace(/-/g, '')}`;
      await updateTopics(subscription, [topic]);
      const result = await request(service, {
        topic,
        title: 'Mano Demo · priminimas',
        message: 'Praėjo viena minutė! Tavo bandomasis pranešimas atkeliavo.',
        delay: '1m',
        icon: new URL('./icon-192.png', window.location.href).href,
        attach: new URL('./icon-512.png', window.location.href).href,
        click: new URL('./?reminder=1', window.location.href).href
      });
      if (!Number.isFinite(result.time)) throw new Error('Siuntimo paslauga nepatvirtino priminimo laiko. Bandyk dar kartą.');
      pending = { due: result.time * 1000, topic };
      persist();
      render();
    } catch (error) {
      render();
      status.textContent = error.name === 'AbortError'
        ? 'Paslauga neatsakė laiku. Priminimas nepatvirtintas — bandyk dar kartą.'
        : error.message || 'Nepavyko suplanuoti pranešimo. Patikrink interneto ryšį.';
    } finally {
      busy = false;
      checkbox.disabled = false;
    }
  });

  if (new URL(window.location.href).searchParams.has('reminder')) {
    document.getElementById('received-reminder').hidden = false;
  }
  window.setInterval(expired, 1000);
  document.addEventListener('visibilitychange', expired);
})();
