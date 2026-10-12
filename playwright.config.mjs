import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './browser-tests',
  timeout: 30000,
  fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:4173', viewport: { width: 402, height: 874 }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'node scripts/build-starter.mjs && node scripts/serve-starter.mjs', url: 'http://127.0.0.1:4173', reuseExistingServer: false }
});
