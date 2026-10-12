/**
 * Create an independent app without overwriting existing projects. Copy versioned modules and documentation; generate fresh per-project secrets only for --with-server. This never starts or deploys a server.
 * See AGENTS.md and the reusable library docs/ARCHITECTURE.md.
 */
import { cp, mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createConfig } from '../packages/app-modules/src/config.js';
import { buildStarter } from './build-starter.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
export async function createApp({ id, name, output, apiUrl = '', auth = false, withServer = false, appUrl = 'http://localhost:4173/', port = 8092 }) {
  const config = createConfig({ id, name, apiUrl, features: { auth } });
  if (auth && !apiUrl) throw new Error('Auth requires --api-url');
  const app = new URL(appUrl);
  if (app.username || app.password || app.search || app.hash || /[\r\n]/.test(appUrl) || (app.protocol !== 'https:' && !(app.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(app.hostname)))) throw new Error('Invalid HTTPS app URL');
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid API port');
  output = path.resolve(output);
  try { await access(output); throw new Error('Output already exists; choose a new directory'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(output, { recursive: true });
  await mkdir(path.join(output, 'src'));
  for (const name of ['index.html', 'app.js', 'account.html', 'icon-192.png', 'icon-512.png']) await cp(path.join(root, 'starter', name), path.join(output, 'src', name));
  await writeFile(path.join(output, 'src/app.config.json'), JSON.stringify(config, null, 2) + '\n');
  await cp(path.join(root, 'packages/app-modules'), path.join(output, 'modules'), { recursive: true });
  await mkdir(path.join(output, 'scripts'));
  let build = await readFile(path.join(root, 'scripts/build-starter.mjs'), 'utf8');
  build = build.replace('../packages/app-modules/src/config.js', '../modules/src/config.js').replace("path.join(root, 'starter')", "path.join(root, 'src')").replace("path.join(root, 'build/starter')", "path.join(root, 'docs')").replace("path.join(root, 'packages/app-modules')", "path.join(root, 'modules')");
  await writeFile(path.join(output, 'scripts/build.mjs'), build);
  let serve = await readFile(path.join(root, 'scripts/serve-starter.mjs'), 'utf8');
  serve = serve.replace("'build/starter'", "'docs'");
  await writeFile(path.join(output, 'scripts/serve.mjs'), serve);
  await writeFile(path.join(output, 'package.json'), JSON.stringify({ name: id, private: true, type: 'module', scripts: { build: 'node scripts/build.mjs', start: 'node scripts/serve.mjs' }, dependencies: { '@europolas/app-modules': 'file:./modules' } }, null, 2));
  await writeFile(path.join(output, '.gitignore'), 'node_modules/\n.runtime/\n*.tgz\n');
  await mkdir(path.join(output, '.github/workflows'), { recursive: true });
  await cp(path.join(root, 'starter/deploy-pages.yml'), path.join(output, '.github/workflows/deploy-pages.yml'));
  await buildStarter({ source: path.join(output, 'src'), output: path.join(output, 'docs'), modules: path.join(output, 'modules'), config });
  if (withServer) {
    await cp(path.join(root, 'starter/server'), path.join(output, 'server'), { recursive: true });
    for (const name of ['AuthApi.mjs', 'security.mjs', 'migrations.mjs']) await cp(path.join(root, 'packages/app-modules/server', name), path.join(output, 'server/src', name));
    await mkdir(path.join(output, '.runtime'), { mode: 0o700 });
    for (const name of ['db_root', 'db_app', 'api_secret', 'mail_key', 'smtp_password']) await writeFile(path.join(output, '.runtime', name), randomBytes(32).toString('hex') + '\n', { mode: 0o600, flag: 'wx' });
    const database = id.replaceAll('-', '_');
    await writeFile(path.join(output, '.runtime/compose.env'), `COMPOSE_PROJECT_NAME=${id}\nDB_NAME=${database}_db\nDB_USER=${database}_app\nLOCAL_UID=${process.getuid?.() ?? 1000}\nLOCAL_GID=${process.getgid?.() ?? 1000}\nAPI_PORT=${port}\n`, { mode: 0o600 });
    await writeFile(path.join(output, '.runtime/api.env'), `APP_NAME=${name}\nAPP_URL=${app.href}\nALLOWED_ORIGINS=${app.origin}\nSMTP_HOST=\nSMTP_PORT=587\nSMTP_USER=\nSMTP_FROM=\nMAIL_DELIVERY_READY=false\n`, { mode: 0o600 });
  }
  await cp(path.join(root, 'starter/PROJECT-README.md'), path.join(output, 'README.md'));
  await cp(path.join(root, 'starter/PROJECT-AGENTS.md'), path.join(output, 'AGENTS.md'));
  return { output, config, withServer };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const options = {}; const args = process.argv.slice(2);
  const names = { '--id': 'id', '--name': 'name', '--output': 'output', '--api-url': 'apiUrl', '--app-url': 'appUrl', '--port': 'port' };
  for (let i = 0; i < args.length; i++) { if (args[i] === '--auth') options.auth = true; else if (args[i] === '--with-server') options.withServer = true; else if (names[args[i]] && args[i + 1] && !args[i + 1].startsWith('--')) { const key = names[args[i]]; options[key] = key === 'port' ? Number(args[++i]) : args[++i]; } else throw new Error('Unknown or incomplete option: ' + args[i]); }
  if (!options.output) options.output = path.join(root, 'build/apps', options.id || 'new-app');
  const result = await createApp(options); console.log(`Created ${result.config.id} at ${result.output}. Private server secrets, when requested, are in ignored .runtime only.`);
}
