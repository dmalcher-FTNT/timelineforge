// @ts-check
import { test, expect } from '@playwright/test';
import { loadAptSample } from './helpers.js';

const GALLERY_LAYOUTS = [
  { label: 'Horizon strip', selector: '.viz-activity-strip' },
  { label: 'Leadership board', selector: '.viz-ciso' },
  { label: 'Swimlane timeline', selector: '.viz-overview' },
  { label: 'Kill-chain board', selector: '.viz-phase-columns' },
  { label: 'Report appendix', selector: '.viz-appendix', tableSelector: '.appendix-table tbody tr', minRows: 10 },
  { label: 'Investigator log', selector: '.viz-event-stack', itemSelector: '.event-stack-item', minItems: 5 },
  { label: 'Host lanes', selector: '.viz-host-lanes', itemSelector: '.host-lane', minItems: 1 },
  { label: 'Evidence table', selector: '.viz-evidence-table', itemSelector: '.evidence-table tbody tr', minItems: 5 },
  { label: 'Milestone storyboard', selector: '.viz-storyboard', itemSelector: '.storyboard-card', minItems: 1 },
  { label: 'MITRE coverage', selector: '.viz-mitre-heatmap' },
  { label: 'Containment lanes', selector: '.viz-containment-lanes', itemSelector: '.containment-lane', minItems: 2 },
];

const KEY_STYLES = [
  { label: 'Gantt phases', selector: '.viz-gantt' },
  { label: 'Host journey', selector: '.viz-fahrplan' },
  { label: 'Attack graph', selector: '.viz-attack-flow' },
];

/** @param {import('@playwright/test').Page} page */
async function selectDesignLayout(page, label) {
  await page.locator('.design-gallery-card').filter({ hasText: label }).click();
}

async function loadExampleOnPublish(page) {
  await loadAptSample(page);
  await page.getByRole('button', { name: 'PUBLISH', exact: true }).click();
  await expect(page.locator('.publish-deliver')).toBeVisible({ timeout: 15000 });
}

test.describe('PUBLISH preview visual QA', () => {
  test('suggests swimlane layout after sample load', async ({ page }) => {
    await loadExampleOnPublish(page);
    await expect(page.locator('#viz-preview .viz-overview')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.design-gallery-card.active')).toContainText('Swimlane timeline');
  });

  test('audience filter shows executive layouts only', async ({ page }) => {
    await loadExampleOnPublish(page);
    await page.locator('.design-audience-chip').filter({ hasText: 'Executive' }).click();
    await expect(page.locator('.design-gallery-card')).toHaveCount(2);
    await selectDesignLayout(page, 'Leadership board');
    await expect(page.locator('#viz-preview .viz-ciso')).toBeVisible({ timeout: 10000 });
  });

  test('deliver panel shows this view exports', async ({ page }) => {
    await loadExampleOnPublish(page);
    await expect(page.locator('.publish-deliver-lead')).toBeVisible();
    await expect(page.locator('.publish-primary-actions .publish-primary-btn').first()).toBeVisible();
  });

  test('case file spine renders alternating cards', async ({ page }) => {
    await loadExampleOnPublish(page);
    await page.locator('.design-audience-chip').filter({ hasText: 'Analyst' }).click();
    await selectDesignLayout(page, 'Case file · Spine');
    await expect(page.locator('#viz-preview .viz-soc')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.soc-card')).not.toHaveCount(0);
  });

  for (const layout of GALLERY_LAYOUTS) {
    test(`renders ${layout.label}`, async ({ page }) => {
      await loadExampleOnPublish(page);
      await selectDesignLayout(page, layout.label);

      const root = page.locator(`#viz-preview ${layout.selector}`);
      await expect(root).toBeVisible({ timeout: 10000 });

      if (layout.tableSelector) {
        const count = await page.locator(layout.tableSelector).count();
        expect(count).toBeGreaterThanOrEqual(layout.minRows);
      }

      if (layout.itemSelector) {
        const count = await page.locator(layout.itemSelector).count();
        expect(count).toBeGreaterThanOrEqual(layout.minItems);
      }
    });
  }

  for (const style of KEY_STYLES) {
    test(`style ${style.label} renders preview`, async ({ page }) => {
      await loadExampleOnPublish(page);
      await selectDesignLayout(page, style.label);
      await expect(page.locator(`#viz-preview ${style.selector}`)).toBeVisible({ timeout: 15000 });
    });
  }

  test('clicking preview event opens detail popup', async ({ page }) => {
    await loadExampleOnPublish(page);
    await page.locator('.design-audience-chip').filter({ hasText: 'Analyst' }).click();
    await selectDesignLayout(page, 'Case file · Spine');
    await expect(page.locator('#viz-preview .viz-soc')).toBeVisible({ timeout: 10000 });
    await page.locator('.soc-card').first().click();
    await expect(page.locator('.event-detail-modal')).toBeVisible();
    await page.locator('.event-detail-close').click();
  });
});
