#!/usr/bin/env node
/**
 * Build dist/ and create portable archives for macOS + Linux (no Node required to run).
 * Output: release/timelineforge-<version>.tar.gz and .zip
 * Run: npm run package
 */
import { cp, mkdir, readFile, writeFile, rm, stat, chmod, readdir } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { zipSync } from 'fflate';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const scripts = join(root, 'scripts');
const releaseDir = join(root, 'release');
const dist = join(root, 'dist');

async function readVersion() {
  const src = await readFile(join(root, 'js', 'version.js'), 'utf8');
  return src.match(/APP_VERSION = '([^']+)'/)?.[1] ?? 'unknown';
}

async function collectFiles(dir, base = dir) {
  /** @type {Record<string, Uint8Array>} */
  const out = {};
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      Object.assign(out, await collectFiles(full, base));
    } else {
      const rel = relative(base, full).split('\\').join('/');
      out[rel] = new Uint8Array(await readFile(full));
    }
  }
  return out;
}

async function main() {
  execSync('npm run build', { cwd: root, stdio: 'inherit' });

  const version = await readVersion();
  const bundleName = `timelineforge-${version}`;
  const bundleDir = join(releaseDir, bundleName);

  await rm(releaseDir, { recursive: true, force: true });
  await mkdir(bundleDir, { recursive: true });

  for (const item of await readdir(dist)) {
    await cp(join(dist, item), join(bundleDir, item), { recursive: true });
  }

  await cp(join(scripts, 'run-local.sh'), join(bundleDir, 'run.sh'));
  await cp(join(scripts, 'RUN.txt'), join(bundleDir, 'RUN.txt'));
  await chmod(join(bundleDir, 'run.sh'), 0o755);

  const files = await collectFiles(bundleDir);
  const zipPath = join(releaseDir, `${bundleName}.zip`);
  await writeFile(zipPath, zipSync(files, { level: 6 }));

  const tarPath = join(releaseDir, `${bundleName}.tar.gz`);
  execSync(`tar -czf "${tarPath}" -C "${releaseDir}" "${bundleName}"`, { stdio: 'inherit' });

  const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;
  const zipStat = await stat(zipPath);
  const tarStat = await stat(tarPath);

  console.log('');
  console.log(`Packaged ${bundleName}`);
  console.log(`  ${zipPath} (${mb(zipStat.size)})`);
  console.log(`  ${tarPath} (${mb(tarStat.size)})`);
  console.log('');
  console.log('Send either archive to your colleague. They unpack and run ./run.sh');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
