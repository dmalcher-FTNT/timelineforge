#!/usr/bin/env node
/**
 * Build a deployable static bundle in dist/ (app shell + vendor, no dev files).
 * Run: npm run build
 *
 * GitHub Pages blocks the /vendor path — dependencies ship as /lib in dist/.
 */
import { cp, mkdir, readFile, writeFile, rm, stat, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

const COPY = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'css',
  'js',
  'assets',
  'data',
];

async function assertVendor() {
  const manifest = join(root, 'vendor', 'alpinejs.mjs');
  try {
    await stat(manifest);
  } catch {
    throw new Error('vendor/ is missing — run npm install && npm run vendor first');
  }
}

async function readVersion() {
  const src = await readFile(join(root, 'js', 'version.js'), 'utf8');
  return src.match(/APP_VERSION = '([^']+)'/)?.[1] ?? 'unknown';
}

/** Rewrite vendor/ → lib/ in built static assets (Pages-safe path). */
async function rewriteVendorToLib(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await rewriteVendorToLib(path);
      continue;
    }
    if (!/\.(html|js|mjs|webmanifest)$/.test(entry.name) && entry.name !== 'sw.js') continue;
    const text = await readFile(path, 'utf8');
    if (!text.includes('vendor/')) continue;
    await writeFile(path, text.replaceAll('vendor/', 'lib/'), 'utf8');
  }
}

async function main() {
  await assertVendor();
  const version = await readVersion();

  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  for (const item of COPY) {
    await cp(join(root, item), join(dist, item), { recursive: true });
  }

  await cp(join(root, 'vendor'), join(dist, 'lib'), { recursive: true });
  await rewriteVendorToLib(dist);
  await writeFile(join(dist, '.nojekyll'), '\n', 'utf8');

  await writeFile(
    join(dist, 'VERSION.txt'),
    `TimelineForge ${version}\nBuilt ${new Date().toISOString().slice(0, 10)}\n`,
    'utf8',
  );

  const indexHtml = await readFile(join(dist, 'index.html'), 'utf8');
  if (indexHtml.includes('vendor/')) {
    throw new Error('dist/index.html still references vendor/ — GitHub Pages requires lib/');
  }
  await stat(join(dist, 'lib', 'alpinejs.mjs'));

  console.log(`TimelineForge ${version} → dist/`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
