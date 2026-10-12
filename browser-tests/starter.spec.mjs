import { test, expect } from '@playwright/test';

test('starter boots without script errors and its scroller reaches the viewport bottom', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#app-version')).toHaveText('Versija 1.0.0');
  const layout = await page.evaluate(() => ({ bottom: document.querySelector('main').getBoundingClientRect().bottom, height: innerHeight, blur: getComputedStyle(document.body, '::after').backdropFilter, scrollbar: getComputedStyle(document.querySelector('main')).scrollbarWidth }));
  expect(layout.bottom).toBe(layout.height); expect(layout.blur).toBe('blur(14px)'); expect(layout.scrollbar).toBe('none');
  await expect(page.locator('#account-link')).toBeHidden(); expect(errors).toEqual([]);
});
test('theme and language settings survive reloads', async ({ page }) => {
  await page.goto('/'); await page.getByRole('link', { name: 'Nustatymai' }).click();
  await page.locator('[name="theme"]').selectOption('light'); await page.locator('[name="language"]').selectOption('en');
  await page.locator('#settings-form button').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light'); await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'light'); await expect(page.locator('[data-i18n="intro"]')).toHaveText('Your next app starts here.');
});
test('screen navigation supports browser back', async ({ page }) => {
  await page.goto('/'); await page.getByRole('link', { name: 'Nustatymai' }).click(); await page.getByRole('link', { name: 'Moduliai' }).click();
  await expect(page.locator('[data-screen="/modules"]')).toBeVisible(); await page.goBack(); await expect(page.locator('[data-screen="/settings"]')).toBeVisible();
});
test('installed files open offline after the service worker activates', async ({ page, context }) => {
  await page.goto('/'); await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true); await page.reload();
  await expect(page.locator('#app-version')).toHaveText('Versija 1.0.0'); await expect(page.locator('#network-status')).toContainText('Nėra interneto');
});
test.describe('optional account module', () => {
  test.use({ serviceWorkers: 'block' });
  test('login, profile, logout and confirmed account deletion never save the password', async ({ page }) => {
    const user = { id: 'one', email: 'test@example.invalid', name: 'Test', role: 'user' };
    await page.route('**/app.config.json', route => route.fulfill({ json: { id: 'account-demo', name: 'Account demo', apiUrl: 'http://127.0.0.1:4173/api', features: { auth: true } } }));
    let deletion;
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/login')) return route.fulfill({ json: { token: 'a'.repeat(64), expiresAt: '2099-01-01', user } });
      if (path.endsWith('/me') && route.request().method() === 'PATCH') user.name = route.request().postDataJSON().name;
      if (path.endsWith('/me') && route.request().method() === 'DELETE') deletion = route.request().postDataJSON();
      return route.fulfill({ json: path.endsWith('/health') ? { ok: true, passwordRecoveryAvailable: false } : { user, message: 'Done' } });
    });
    await page.goto('/'); await expect(page.locator('#account-link')).toBeVisible(); await page.locator('#account-link').click();
    await page.locator('#login-form [name="email"]').fill(user.email); await page.locator('#login-form [name="password"]').fill('A long private password phrase'); await page.locator('#login-form button[type="submit"]').click();
    await expect(page.locator('#auth-profile')).toBeVisible(); await expect(page.locator('#admin-panel')).toBeHidden();
    const stored = await page.evaluate(() => sessionStorage.getItem('account-demo:auth')); expect(stored).not.toContain('password'); expect(stored).not.toContain(user.email);
    await page.locator('#profile-form [name="name"]').fill('Changed'); await page.locator('#profile-form button').click(); await expect(page.locator('#auth-status')).toHaveText('Vardas išsaugotas.');
    await page.locator('#logout-button').click(); await expect(page.locator('#auth-guest')).toBeVisible(); expect(await page.evaluate(() => sessionStorage.getItem('account-demo:auth'))).toBeNull();
    await page.locator('#login-form [name="email"]').fill(user.email); await page.locator('#login-form [name="password"]').fill('A long private password phrase'); await page.locator('#login-form button[type="submit"]').click();
    await expect(page.locator('#auth-profile')).toBeVisible(); await page.locator('summary').filter({ hasText: 'Ištrinti paskyrą' }).click();
    await page.locator('#delete-account-form [name="currentPassword"]').fill('A long private password phrase'); await page.locator('#delete-account-form button').click(); expect(deletion).toBeUndefined();
    await page.locator('#delete-account-form [name="confirmDelete"]').check(); await page.locator('#delete-account-form button').click(); await expect(page.locator('#auth-guest')).toBeVisible();
    expect(deletion.confirmation).toBe('DELETE'); expect(await page.evaluate(() => sessionStorage.getItem('account-demo:auth'))).toBeNull();
  });
});
test('UI helpers render untrusted text literally and confirm dialogs support cancellation', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => { const { element, confirmDialog } = await import('./modules/ui.js'); document.querySelector('[data-screen="/"]').append(element('p', { text: '<img src=x onerror=alert(1)>' })); window.confirmed = confirmDialog('Ar tęsti?'); });
  await expect(page.locator('dialog')).toBeVisible(); await page.getByRole('button', { name: 'Atšaukti', exact: true }).click(); expect(await page.evaluate(() => window.confirmed)).toBe(false);
  await expect(page.locator('[data-screen="/"]')).toContainText('<img src=x onerror=alert(1)>');
});
