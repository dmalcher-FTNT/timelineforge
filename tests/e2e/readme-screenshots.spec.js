// @ts-check
/** Run with: npm run screenshots */
import { test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAptSample as loadAptSampleHelper, goToDeliver, goToRefine, goToCollect } from './helpers.js';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '../../docs/screenshots');
mkdirSync(outDir, { recursive: true });

const SCREENSHOT_CSS = `
  .status-bar { display: none !important; }
  .demo-banner { display: none !important; }
  .app-toast { display: none !important; }
  .modal-backdrop { display: none !important; }
`;

async function loadAptSample(page) {
  await loadAptSampleHelper(page);
  await page.addStyleTag({ content: SCREENSHOT_CSS });
  await page.evaluate(() => {
    document.querySelectorAll('.modal-backdrop').forEach((el) => el.classList.remove('is-open'));
  });
}

/** Collapse incident overview so workspace nav + panel dominate the frame. */
async function collapseIncidentOverview(page) {
  await page.evaluate(() => {
    const app = document.body._x_dataStack?.[0];
    if (app && !app.incidentOverviewCollapsed) app.toggleIncidentOverview();
  });
  await page.locator('.incident-panel.is-collapsed').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
}

async function shot(locator, path) {
  await locator.scrollIntoViewIfNeeded();
  await locator.waitFor({ state: 'visible', timeout: 15000 });
  await locator.page().waitForTimeout(250);
  await locator.screenshot({ path, animations: 'disabled' });
}

/** Clip from top of page through the bottom of `endLocator`. */
async function shotFromTopThrough(page, endLocator, path, maxHeight = 900) {
  await endLocator.scrollIntoViewIfNeeded();
  await endLocator.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(250);
  const endBox = await endLocator.boundingBox();
  if (!endBox) throw new Error('Could not measure screenshot region');
  const viewport = page.viewportSize();
  const width = viewport?.width ?? 1280;
  await page.screenshot({
    path,
    animations: 'disabled',
    clip: {
      x: 0,
      y: 0,
      width,
      height: Math.min(endBox.y + endBox.height + 16, maxHeight),
    },
  });
}

test('capture README screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await loadAptSample(page);

  // Hero: full app shell with expanded timeline overview (Refine active)
  await goToRefine(page);
  await page.locator('.incident-overview').waitFor({ state: 'visible', timeout: 15000 });
  await shotFromTopThrough(page, page.locator('.incident-panel-body'), join(outDir, 'main-overview.png'), 640);

  await collapseIncidentOverview(page);

  await goToCollect(page);
  await page.locator('.input-workspace').waitFor({ state: 'visible', timeout: 15000 });
  await shotFromTopThrough(page, page.locator('.input-workspace'), join(outDir, 'collect-import.png'), 720);

  await goToRefine(page);
  await page.locator('.edit-workspace').waitFor({ state: 'visible', timeout: 15000 });
  await shotFromTopThrough(page, page.locator('.edit-workspace'), join(outDir, 'edit-workspace.png'));

  await goToDeliver(page);
  await page.locator('.publish-deliver').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('.design-gallery-card').filter({ hasText: 'Leadership board' }).click();
  await page.locator('#viz-preview .viz-ciso').waitFor({ state: 'visible', timeout: 15000 });
  await shotFromTopThrough(page, page.locator('.publish-main'), join(outDir, 'design-preview.png'));
});
