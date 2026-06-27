// @ts-check
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const MIN_PNG_BYTES = 1024;
const MIN_PDF_BYTES = 2048;
const MIN_DOC_BYTES = 256;

/**
 * @param {string} filePath
 * @param {{ minWidth?: number, minHeight?: number }} [opts]
 */
export async function verifyPngExport(filePath, opts = {}) {
  const minWidth = opts.minWidth ?? 200;
  const minHeight = opts.minHeight ?? 200;
  const buf = readFileSync(filePath);
  assert.ok(buf.length >= MIN_PNG_BYTES, `PNG too small (${buf.length} bytes)`);
  assert.equal(buf[0], 0x89);
  assert.equal(buf.toString('ascii', 1, 4), 'PNG');

  const meta = await sharp(filePath).metadata();
  assert.ok(meta.width && meta.width >= minWidth, `PNG width ${meta.width} < ${minWidth}`);
  assert.ok(meta.height && meta.height >= minHeight, `PNG height ${meta.height} < ${minHeight}`);

  const stats = await sharp(filePath).stats();
  const channels = stats.channels || [];
  assert.ok(channels.length > 0, 'PNG has no color channels');
  const hasInk = channels.some((c) => c.min < 245 || c.max > 0 && c.max < 250);
  const notFlatWhite = !(channels.every((c) => c.min >= 248 && c.max <= 255));
  assert.ok(hasInk && notFlatWhite, 'PNG looks blank or flat white');

  if (meta.height && meta.height > 400 && meta.width) {
    const centerTop = Math.floor(meta.height * 0.3);
    const centerH = Math.min(80, Math.max(24, Math.floor(meta.height * 0.15)));
    const centerW = Math.min(120, Math.max(48, Math.floor(meta.width * 0.15)));
    const centerLeft = Math.floor((meta.width - centerW) / 2);
    const centerStats = await sharp(filePath)
      .extract({ left: centerLeft, top: centerTop, width: centerW, height: centerH })
      .stats();
    const centerHasInk = centerStats.channels.some((c) => c.min < 245);
    assert.ok(centerHasInk, 'PNG center chart area looks empty');
  }
}

/** @param {string} filePath */
export function verifyPdfExport(filePath) {
  const buf = readFileSync(filePath);
  assert.ok(buf.length >= MIN_PDF_BYTES, `PDF too small (${buf.length} bytes)`);
  assert.match(buf.slice(0, 8).toString('ascii'), /^%PDF-/);

  const text = buf.toString('latin1');
  assert.ok(/\/Type\s*\/Page/.test(text) || /\/Pages/.test(text), 'PDF missing page objects');
  assert.ok(text.includes('/Image') || text.includes('/Font') || text.includes('stream'),
    'PDF missing content streams');

  const streams = text.match(/stream[\s\S]*?endstream/g) || [];
  const largestStream = streams.reduce((max, s) => Math.max(max, s.length), 0);
  assert.ok(largestStream > 8000, `PDF content stream too small (${largestStream} bytes) — export likely blank`);
}

/** Word-compatible HTML .doc export from TimelineForge. */
export function verifyDocExport(filePath, { titleHint = '' } = {}) {
  const text = readFileSync(filePath, 'utf8');
  assert.ok(text.length >= MIN_DOC_BYTES, `DOC too small (${text.length} bytes)`);
  assert.match(text, /Event data/i);
  assert.match(text, /<table/i);
  assert.match(text, /<\/html>/i);
  if (titleHint) assert.match(text, new RegExp(titleHint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
}
