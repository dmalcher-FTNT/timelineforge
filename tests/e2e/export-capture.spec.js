// @ts-check
import { test, expect } from '@playwright/test';
import { loadAptSample, loadSample, waitForExportPreview, goToDeliver } from './helpers.js';

test.describe('Export capture', () => {
  test('swimlane chart scroll width exceeds preview viewport', async ({ page }) => {
    await loadAptSample(page);
    await goToDeliver(page);
    await expect(page.locator('#viz-preview .viz-overview')).toBeVisible({ timeout: 15000 });

    const sizes = await page.evaluate(() => {
      const wrap = document.querySelector('.viz-preview-wrap');
      const chart = document.querySelector('.overview-chart');
      return {
        wrapClient: wrap?.clientWidth || 0,
        chartScroll: chart?.scrollWidth || 0,
      };
    });

    expect(sizes.chartScroll).toBeGreaterThan(sizes.wrapClient);
    expect(sizes.chartScroll).toBeGreaterThan(1100);
  });

  test('measureExportBounds matches chart scroll width in browser', async ({ page }) => {
    await loadAptSample(page);
    await goToDeliver(page);
    await expect(page.locator('.overview-chart')).toBeVisible({ timeout: 15000 });

    const result = await page.evaluate(async () => {
      const { measureExportBounds } = await import('/js/output/export-capture.js');
      const wrap = document.querySelector('.viz-preview-wrap');
      const chart = document.querySelector('.overview-chart');
      const bounds = measureExportBounds(wrap);
      return { boundsWidth: bounds.width, chartScroll: chart?.scrollWidth || 0 };
    });

    expect(result.boundsWidth).toBeGreaterThanOrEqual(result.chartScroll);
  });

  test('supply chain case-file layout captures timeline body', async ({ page }) => {
    await loadSample(page, 'Supply chain');
    await goToDeliver(page);
    await page.locator('#viz-preview .viz-soc').waitFor({ state: 'visible', timeout: 15000 });
    await waitForExportPreview(page);

    const result = await page.evaluate(async () => {
      const { capturePreviewCanvas, verifyRasterExport } = await import('/js/output/export-capture.js');
      const canvas = await capturePreviewCanvas(document.getElementById('viz-preview'));
      const verify = verifyRasterExport(canvas);
      const ctx = canvas.getContext('2d');
      const d = ctx.getImageData(
        Math.floor(canvas.width / 2) - 32,
        Math.floor(canvas.height * 0.4),
        64,
        64,
      ).data;
      let ink = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] < 245 || d[i + 1] < 245 || d[i + 2] < 245) ink += 1;
      }
      return {
        ok: verify.ok,
        items: verify.items,
        centerInk: ink / (d.length / 4),
      };
    });

    expect(result.ok, result.items?.map((i) => i.message).join('; ')).toBe(true);
    expect(result.centerInk).toBeGreaterThan(0.02);
  });
});
