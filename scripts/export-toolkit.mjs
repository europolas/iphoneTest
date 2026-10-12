import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildStarter } from './build-starter.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const build = path.join(root, 'build');
const run = promisify(execFile);
export async function exportToolkit() {
  const modules = path.join(build, 'app-modules'); const starter = path.join(build, 'app-starter'); const downloads = path.join(build, 'downloads');
  for (const folder of [modules, starter, downloads]) { await rm(folder, { recursive: true, force: true }); await mkdir(folder, { recursive: true }); }
  await cp(path.join(root, 'packages/app-modules'), modules, { recursive: true });
  await cp(path.join(root, 'starter'), path.join(starter, 'starter'), { recursive: true });
  await cp(path.join(root, 'packages/app-modules'), path.join(starter, 'packages/app-modules'), { recursive: true });
  await cp(path.join(root, 'toolkit-tests'), path.join(starter, 'toolkit-tests'), { recursive: true });
  await mkdir(path.join(starter, 'scripts'));
  for (const name of ['build-starter.mjs', 'create-app.mjs', 'serve-starter.mjs']) await cp(path.join(root, 'scripts', name), path.join(starter, 'scripts', name));
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  pkg.name = 'europolas-app-starter'; pkg.scripts = { build: 'node scripts/build-starter.mjs --output docs', start: 'node scripts/serve-starter.mjs --dir docs', test: 'node --test toolkit-tests/*.test.mjs', 'create-app': 'node scripts/create-app.mjs' };
  await writeFile(path.join(starter, 'package.json'), JSON.stringify(pkg, null, 2));
  const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8')); lock.name = pkg.name; lock.packages[''].name = pkg.name; await writeFile(path.join(starter, 'package-lock.json'), JSON.stringify(lock, null, 2));
  await writeFile(path.join(starter, '.gitignore'), 'node_modules/\n.runtime/\nstarter/.runtime/\nbuild/\n*.tgz\n');
  await mkdir(path.join(starter, '.github/workflows'), { recursive: true });
  await cp(path.join(root, 'starter/deploy-pages.yml'), path.join(starter, '.github/workflows/deploy-pages.yml'));
  const readme = (await readFile(path.join(root, 'starter/PROJECT-README.md'), 'utf8')).replaceAll('src/app.config.json', 'starter/app.config.json').replaceAll('src/index.html', 'starter/index.html').replaceAll('src/app.js', 'starter/app.js').replaceAll('`modules/`', '`packages/app-modules/`').replaceAll('modules/README.md', 'packages/app-modules/README.md').replaceAll('modules/package.json', 'packages/app-modules/package.json');
  await writeFile(path.join(starter, 'README.md'), readme + '\n\nSavarankišką projektą su serveriu sukurk komanda `npm run create-app -- --id mano-app --name "Mano app" --with-server`. Pirmą kartą pritaikyk ID savo projektui prieš publikuodamas.\n');
  await buildStarter({ source: path.join(starter, 'starter'), modules: path.join(starter, 'packages/app-modules'), output: path.join(starter, 'docs') });
  // Only explicitly assembled source trees are archived; build/apps and .runtime are excluded.
  for (const [folder, name] of [[modules, 'app-modules.zip'], [starter, 'app-starter.zip']]) await run('python3', ['-c', 'import shutil,sys; shutil.make_archive(sys.argv[1], "zip", root_dir=sys.argv[2])', path.join(downloads, name.replace('.zip', '')), folder]);
  const { stdout } = await run('npm', ['pack', '--json', '--pack-destination', downloads], { cwd: modules });
  const packed = JSON.parse(stdout)[0];
  return { modules, starter, downloads, package: packed.filename };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { const result = await exportToolkit(); console.log('Prepared independent app-starter and app-modules repositories and downloads in ' + result.downloads); }
