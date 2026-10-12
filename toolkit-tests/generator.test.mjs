import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../scripts/create-app.mjs';
import { buildStarter } from '../scripts/build-starter.mjs';
test('generator creates isolated projects, secret files and self-contained deployable assets', async () => {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'app-toolkit-'));
  try {
    for (const id of ['first-app', 'second-app']) await createApp({ id, name: id, output: path.join(folder, id), withServer: true });
    const first = path.join(folder, 'first-app'); const second = path.join(folder, 'second-app');
    assert.notEqual(await readFile(path.join(first, '.runtime/db_app'), 'utf8'), await readFile(path.join(second, '.runtime/db_app'), 'utf8'));
    assert.equal((await stat(path.join(first, '.runtime/db_app'))).mode & 0o777, 0o600);
    assert.equal((await stat(path.join(first, '.runtime'))).mode & 0o777, 0o700);
    const sw = await readFile(path.join(first, 'docs/sw.js'), 'utf8'); assert.ok(sw.includes('first-app')); assert.ok(sw.includes('modules/viewport.js')); assert.ok(sw.includes('modules/auth-screen.js')); assert.ok(!sw.includes('.runtime'));
    const server = await readFile(path.join(first, 'server/src/server.mjs'), 'utf8'); assert.ok(!server.includes('perimove.com')); assert.ok(server.includes('process.env.DB_NAME'));
    assert.ok((await readFile(path.join(first, 'scripts/build.mjs'), 'utf8')).includes('../modules/src/config.js'));
    await assert.rejects(createApp({ id: 'first-app', name: 'Overwrite', output: first }), /already exists/);
    await assert.rejects(createApp({ id: 'bad-app', name: 'Bad', output: path.join(folder, 'bad'), auth: true }), /api-url/);
    await assert.rejects(readFile(path.join(first, 'docs/server/src/server.mjs')));
  } finally { await rm(folder, { recursive: true, force: true }); }
});
test('build stamps all browser modules, changes cache versions and refuses unmanaged output', async () => {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'app-build-'));
  try {
    const output = path.join(folder, 'docs'); const a = await buildStarter({ output, config: { id: 'build-app', name: 'One' } }); const b = await buildStarter({ output, config: { id: 'build-app', name: 'Two' } }); assert.notEqual(a.version, b.version);
    assert.ok(b.assets.includes('modules/worker.js')); assert.ok(!b.assets.some(name => name.startsWith('server/')));
    await mkdir(path.join(folder, 'personal')); await writeFile(path.join(folder, 'personal/keep.txt'), 'keep');
    await assert.rejects(buildStarter({ output: path.join(folder, 'personal') }), /unmanaged/); assert.equal(await readFile(path.join(folder, 'personal/keep.txt'), 'utf8'), 'keep');
  } finally { await rm(folder, { recursive: true, force: true }); }
});
