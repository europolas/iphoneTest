import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
test.use({ serviceWorkers: 'block' });

for (const language of ['en', 'lt']) test(`MP4 preview plays, pauses and seeks with ${language} status`, async ({ page }) => {
  // Use the demo source with only its media observer active: no production API calls.
  await page.route('**/*', async route => {
    const name = new URL(route.request().url()).pathname;
    if (name === '/') {
      const html = (await readFile(new URL('docs/index.html', root), 'utf8')).replace(/<script src="(?:app|auth|reminders)\.js" defer><\/script>/g, '').replace('data-video-language="en"', `data-video-language="${language}"`);
      return route.fulfill({ body: html, contentType: 'text/html' });
    }
    const file = name.startsWith('/video-locales/') ? 'packages/app-modules/src/translations/' + name.split('/').at(-1) : 'docs' + name;
    if (!/^\/(video-locales\/(en|lt)\.js|video\.js|viewport\.js|style\.css|icon-512\.png|assets\/demo\.mp4|manifest\.webmanifest)$/.test(name)) return route.abort();
    const body = await readFile(new URL(file, root));
    if (name.endsWith('.mp4')) {
      const range = /^bytes=(\d+)-(\d*)$/.exec(route.request().headers().range || '');
      if (range) {
        const start = Number(range[1]); const end = Math.min(range[2] ? Number(range[2]) : body.length - 1, body.length - 1);
        return route.fulfill({ status: 206, body: body.subarray(start, end + 1), contentType: 'video/mp4', headers: { 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${body.length}` } });
      }
      return route.fulfill({ body, contentType: 'video/mp4', headers: { 'Accept-Ranges': 'bytes' } });
    }
    return route.fulfill({ body, contentType: name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : name.endsWith('.png') ? 'image/png' : 'application/manifest+json' });
  });
  await page.goto('/');
  const video = page.locator('#demo-video'); const status = page.locator('#video-status');
  await expect(page.locator('#video-title')).toHaveText(language === 'en' ? 'MP4 video preview' : 'MP4 vaizdo peržiūra');
  await expect.poll(() => video.evaluate(node => Number.isFinite(node.duration))).toBe(true);
  await video.evaluate(async node => { node.muted = true; await node.play(); });
  await expect.poll(() => video.evaluate(node => node.currentTime)).toBeGreaterThan(0);
  await video.evaluate(node => node.pause());
  await expect(status).toContainText(language === 'en' ? 'State: paused' : 'Būsena: pauzė');
  await expect(status).toContainText(language === 'en' ? 'Event: pause' : 'Įvykis: pause');
  await video.evaluate(node => { node.currentTime = node.duration / 2; });
  await expect(status).toContainText(language === 'en' ? 'Event: seeked' : 'Įvykis: seeked');
  await video.evaluate(node => node.dispatchEvent(new Event('timeupdate')));
  await expect(status).toContainText('seeked');
  await video.evaluate(async node => { node.currentTime = node.duration - 0.1; await node.play(); });
  await expect.poll(() => video.evaluate(node => node.ended)).toBe(true);
  await expect(status).toContainText(language === 'en' ? 'State: ended' : 'Būsena: baigta');
});
