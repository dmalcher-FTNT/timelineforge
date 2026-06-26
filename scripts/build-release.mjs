#!/usr/bin/env node
/**
 * Build a deployable static bundle in dist/ (app shell + vendor, no dev files).
 * Run: npm run build
 */
import { cp, mkdir, readFile, writeFile, rm, stat } from 'node:fs/promises';
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
  'vendor',
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

async function main() {
  await assertVendor();
  const version = await readVersion();

  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  for (const item of COPY) {
    await cp(join(root, item), join(dist, item), { recursive: true });
  }

  await writeFile(
    join(dist, 'VERSION.txt'),
    `TimelineForge ${version}\nBuilt ${new Date().toISOString().slice(0, 10)}\n`,
    'utf8',
  );

  console.log(`TimelineForge ${version} → dist/`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
