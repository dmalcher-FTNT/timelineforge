// @ts-check
import { test, expect } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  exportFromHeaderMenu,
  exportFromPublishPanel,
  loadSample,
  pickExportSamplePair,
  saveDownload,
} from './helpers.js';
import { verifyDocExport, verifyPdfExport, verifyPngExport } from './export-verify.mjs';

test.describe('Sample export formats', () => {
  test.describe.configure({ timeout: 120000 });

  for (const sampleLabel of pickExportSamplePair()) {
    test(`${sampleLabel} — PNG, PDF, and Word exports are valid files`, async ({ page }) => {
      const outDir = mkdtempSync(join(tmpdir(), 'timelineforge-export-'));

      await loadSample(page, sampleLabel);

      const titleHint = await page.locator('.incident-title-input').inputValue();

      const pngDownload = await exportFromPublishPanel(page, 'PNG image', 'Export PNG');
      expect(pngDownload.suggestedFilename()).toMatch(/\.png$/i);
      const pngPath = await saveDownload(pngDownload, outDir);
      await verifyPngExport(pngPath);

      const pdfDownload = await exportFromPublishPanel(page, 'PDF document', 'Export PDF');
      expect(pdfDownload.suggestedFilename()).toMatch(/\.pdf$/i);
      const pdfPath = await saveDownload(pdfDownload, outDir);
      verifyPdfExport(pdfPath);

      const docDownload = await exportFromHeaderMenu(page, 'Word document', 'Export Word');
      expect(docDownload.suggestedFilename()).toMatch(/\.doc$/i);
      const docPath = await saveDownload(docDownload, outDir);
      verifyDocExport(docPath, { titleHint: titleHint || sampleLabel.split(' ')[0] });
    });
  }
});
