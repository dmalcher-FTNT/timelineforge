import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { verifyDocExport, verifyPdfExport, verifyPngExport } from '../e2e/export-verify.mjs';

describe('export file verification helpers', () => {
  it('accepts a non-blank PNG', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'tf-png-'));
    const base = join(dir, 'base.png');
    const path = join(dir, 'test.png');
    await sharp({
      create: { width: 400, height: 300, channels: 3, background: { r: 240, g: 240, b: 240 } },
    }).png().toFile(base);
    await sharp(base)
      .composite([{
        input: await sharp({
          create: { width: 200, height: 120, channels: 3, background: { r: 220, g: 38, b: 38 } },
        }).png().toBuffer(),
        top: 50,
        left: 80,
      }])
      .toFile(path);
    await verifyPngExport(path);
  });

  it('accepts a minimal PDF with a page', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tf-pdf-'));
    const path = join(dir, 'test.pdf');
    const body = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj
4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
5 0 obj<</Length 44>>stream
BT /F1 12 Tf 100 700 Td (TimelineForge export test) Tj ET
endstream
endobj
6 0 obj<</Length 9000>>stream
${'0'.repeat(9000)}
endstream
endobj
xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000250 00000 n 
0000000320 00000 n 
trailer<</Size 6/Root 1 0 R>>
startxref
420
%%EOF`;
    writeFileSync(path, body.padEnd(2500, ' ') + ' '.repeat(9000));
    verifyPdfExport(path);
  });

  it('accepts Word-compatible HTML doc export shape', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tf-doc-'));
    const path = join(dir, 'test.doc');
    const rows = Array.from({ length: 12 }, (_, i) => `<tr><td>2024-01-0${(i % 9) + 1}</td><td>HOST-${i}</td><td>user</td><td>recon</td><td></td><td>EDR</td><td>Event ${i} details for export verification</td></tr>`).join('');
    writeFileSync(path, `\ufeff<!DOCTYPE html><html><body><h1>Insider Threat (Template)</h1><h2>Event data</h2><table>${rows}</table></body></html>`);
    verifyDocExport(path, { titleHint: 'Insider' });
  });
});
