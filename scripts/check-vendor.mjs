#!/usr/bin/env node
/** Fail fast with a clear message when vendor/ has not been built. */
import { access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'vendor/alpinejs.mjs',
  'vendor/d3.mjs',
  'vendor/lz-string.mjs',
];

async function main() {
  for (const rel of required) {
    try {
      await access(join(root, rel));
    } catch {
      console.error('vendor/ is missing or incomplete.');
      console.error('Run:  npm install && npm run vendor');
      process.exit(1);
    }
  }
}

main();
