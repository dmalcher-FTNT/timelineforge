// @ts-check
/** Run with: npm run screenshots */
import { test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '../../docs/screenshots');
mkdirSync(outDir, { recursive: true });

const SCREENSHOT_CSS = `
  .preview-quality-bar { display: none !important; }
  .status-bar { display: none !important; }
`;

async function loadAptSample(page) {
  await page.goto('/');
  await page.locator('.brand-title').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('button', { name: 'File', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Samples' }).click();
  await page.locator('.header-submenu').waitFor({ state: 'visible' });
  await page.locator('.header-submenu').getByRole('menuitem', { name: 'APT breach' }).click();
  await page.locator('.incident-overview').waitFor({ state: 'visible', timeout: 15000 });
  await page.addStyleTag({ content: SCREENSHOT_CSS });
}

async function shot(locator, path) {
  await locator.scrollIntoViewIfNeeded();
  await locator.waitFor({ state: 'visible', timeout: 15000 });
  await locator.page().waitForTimeout(250);
  await locator.screenshot({ path, animations: 'disabled' });
}

test('capture README screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await loadAptSample(page);

  await page.getByRole('button', { name: 'PUBLISH', exact: true }).click();
  await page.locator('.publish-deliver').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('.design-gallery-card').filter({ hasText: 'Leadership board' }).click();
  await page.locator('#viz-preview .viz-ciso').waitFor({ state: 'visible', timeout: 15000 });
  await shot(page.locator('.publish-main'), join(outDir, 'design-preview.png'));

  await page.getByRole('button', { name: 'EDIT', exact: true }).click();
  await page.locator('.edit-workspace').waitFor({ state: 'visible', timeout: 15000 });
  await page.evaluate(() => {
    document.querySelector('.incident-overview')?.setAttribute('style', 'display:none');
  });
  await shot(page.locator('.edit-workspace'), join(outDir, 'edit-workspace.png'));

  await page.getByRole('button', { name: 'PUBLISH', exact: true }).click();
  await page.locator('.publish-deliver').waitFor({ state: 'visible', timeout: 15000 });
  await page.evaluate(() => {
    document.querySelector('.incident-overview')?.setAttribute('style', 'display:none');
  });
  await shot(page.locator('.publish-deliver'), join(outDir, 'output-exports.png'));
});
