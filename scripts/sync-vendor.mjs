#!/usr/bin/env node
/**
 * Download pinned vendor bundles + esbuild true offline bundles.
 * Run: npm install && npm run vendor
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const vendor = join(root, 'vendor');

const PDFJS_VERSION = '4.10.38';
const TESSERACT_VERSION = '5.1.1';

const DOWNLOADS = [
  { url: 'https://cdn.jsdelivr.net/npm/alpinejs@3.14.1/dist/module.esm.js', dest: 'alpinejs.mjs' },
  { url: 'https://cdn.jsdelivr.net/npm/lz-string@1.5.0/+esm', dest: 'lz-string.mjs' },
  { url: 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm', dest: 'html2canvas.mjs' },
  { url: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.mjs`, dest: 'pdfjs-dist/build/pdf.mjs' },
  { url: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.mjs`, dest: 'pdfjs-dist/build/pdf.worker.mjs' },
  { url: `https://cdn.jsdelivr.net/npm/tesseract.js@${TESSERACT_VERSION}/dist/tesseract.esm.min.js`, dest: 'tesseract/tesseract.esm.min.js' },
  { url: `https://cdn.jsdelivr.net/npm/tesseract.js@${TESSERACT_VERSION}/dist/worker.min.js`, dest: 'tesseract/worker.min.js' },
  { url: `https://cdn.jsdelivr.net/npm/tesseract.js-core@v5.1.1/tesseract-core-simd.wasm.js`, dest: 'tesseract/tesseract-core-simd.wasm.js' },
  { url: 'https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz', dest: 'tesseract/lang/eng.traineddata.gz' },
];

const ESBUILD_BUNDLES = [
  { entry: 'd3', outfile: 'd3.mjs' },
  { entry: 'mammoth', outfile: 'mammoth.mjs' },
  { entry: 'jspdf', outfile: 'jspdf.mjs' },
  { entry: 'pptxgenjs', outfile: 'pptxgenjs.mjs' },
  { entry: 'fflate', outfile: 'fflate.mjs' },
  { entry: 'svg2pdf.js', outfile: 'svg2pdf.mjs' },
  { entry: 'mermaid', outfile: 'mermaid.esm.min.mjs' },
];

async function download(url, destPath) {
  await mkdir(dirname(destPath), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  await pipeline(res.body, createWriteStream(destPath));
}

async function bundleWithEsbuild() {
  let esbuild;
  try {
    esbuild = await import('esbuild');
  } catch {
    console.warn('esbuild not installed — run npm install');
    return;
  }

  for (const { entry, outfile } of ESBUILD_BUNDLES) {
    process.stdout.write(`bundle ${outfile}… `);
    try {
      await esbuild.build({
        entryPoints: [entry],
        bundle: true,
        format: 'esm',
        platform: 'browser',
        outfile: join(vendor, outfile),
        logLevel: 'silent',
      });
      console.log('ok');
    } catch (err) {
      console.log('fail');
      throw new Error(`Failed to bundle ${entry}: ${err.message}`);
    }
  }
}

async function generatePwaIcons() {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.warn('sharp not installed — skip PNG icons');
    return;
  }
  const svgPath = join(root, 'assets/timelineforge-logo.svg');
  const svg = await readFile(svgPath);
  for (const size of [192, 512]) {
    const out = join(root, `assets/icon-${size}.png`);
    await sharp(svg).resize(size, size, { fit: 'contain', background: { r: 26, g: 26, b: 26, alpha: 1 } }).png().toFile(out);
    console.log('wrote', out);
  }
}

async function writeManifest() {
  const files = [
    ...DOWNLOADS.map((f) => f.dest),
    ...ESBUILD_BUNDLES.map((f) => f.outfile),
  ];
  await writeFile(join(vendor, 'manifest.json'), `${JSON.stringify({ version: '2', generated: new Date().toISOString(), files }, null, 2)}\n`);
}

async function main() {
  await mkdir(vendor, { recursive: true });
  for (const { url, dest } of DOWNLOADS) {
    const destPath = join(vendor, dest);
    process.stdout.write(`fetch ${dest}… `);
    await download(url, destPath);
    console.log('ok');
  }
  await bundleWithEsbuild();
  await writeManifest();
  await generatePwaIcons();
  console.log('Vendor sync complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
