// @ts-check
import { test, expect } from '@playwright/test';

const SAMPLE_VIZ_TYPES = [
  { label: 'SOC event cards', selector: '.viz-soc', cardSelector: '.soc-card', minCards: 5 },
  { label: 'Executive summary', selector: '.viz-ciso' },
  { label: 'Phase swimlanes', selector: '.viz-overview' },
  { label: 'Phase columns', selector: '.viz-phase-columns' },
  { label: 'Activity overview', selector: '.viz-activity-strip' },
  { label: 'Appendix timeline', selector: '.viz-appendix', tableSelector: '.appendix-table tbody tr', minRows: 10 },
];

const KEY_STYLES = [
  { label: 'Gantt bars', selector: '.viz-gantt' },
  { label: 'Metro map', selector: '.viz-fahrplan' },
  { label: 'Attack flow', selector: '.viz-attack-flow' },
];

async function loadExampleOnDesign(page) {
  await page.goto('/');
  await expect(page.locator('.brand-title')).toHaveText('TimelineForge', { timeout: 15000 });
  await page.getByRole('button', { name: 'File', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Samples' }).click();
  await expect(page.locator('.header-submenu')).toBeVisible();
  await page.locator('.header-submenu').getByRole('menuitem', { name: 'APT breach' }).click();
  await expect(page.locator('.incident-overview')).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'DESIGN', exact: true }).click();
  await expect(page.locator('.design-toolbar')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.design-export-btns button').filter({ hasText: 'PNG' })).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.preview-quality-bar')).toBeVisible();
}

async function selectVizType(page, label) {
  await page.locator('.design-toolbar-select').first().selectOption({ label });
}

async function selectVizStyle(page, label) {
  await page.locator('.design-toolbar-select').nth(1).selectOption({ label });
}

test.describe('DESIGN preview visual QA', () => {
  test('defaults to activity overview on load', async ({ page }) => {
    await loadExampleOnDesign(page);
    await expect(page.locator('#viz-preview .viz-activity-strip')).toBeVisible({ timeout: 10000 });
  });

  test('SOC preview has anchored spine', async ({ page }) => {
    await loadExampleOnDesign(page);
    await selectVizType(page, 'SOC event cards');

    await expect(page.locator('#viz-preview .viz-soc')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.soc-card')).not.toHaveCount(0);

    const spineAnchor = await page.locator('.soc-timeline').evaluate((el) => {
      const style = getComputedStyle(el);
      const header = el.closest('.viz-soc')?.querySelector('.viz-header');
      const timelineRect = el.getBoundingClientRect();
      const headerRect = header?.getBoundingClientRect();
      const before = getComputedStyle(el, '::before');
      return {
        position: style.position,
        hasSpine: before.content && before.content !== 'none' && before.content !== 'normal',
        headerAboveTimeline: headerRect ? timelineRect.top >= headerRect.bottom - 4 : true,
      };
    });

    expect(spineAnchor.position).toBe('relative');
    expect(spineAnchor.hasSpine).toBe(true);
    expect(spineAnchor.headerAboveTimeline).toBe(true);
  });

  for (const viz of SAMPLE_VIZ_TYPES) {
    test(`renders ${viz.label}`, async ({ page }) => {
      await loadExampleOnDesign(page);
      await selectVizType(page, viz.label);

      const root = page.locator(`#viz-preview ${viz.selector}`);
      await expect(root).toBeVisible({ timeout: 10000 });

      if (viz.cardSelector) {
        const count = await page.locator(viz.cardSelector).count();
        expect(count).toBeGreaterThanOrEqual(viz.minCards);
      }

      if (viz.tableSelector) {
        const count = await page.locator(viz.tableSelector).count();
        expect(count).toBeGreaterThanOrEqual(viz.minRows);
      }
    });
  }

  for (const style of KEY_STYLES) {
    test(`style ${style.label} renders preview`, async ({ page }) => {
      await loadExampleOnDesign(page);
      await selectVizType(page, 'SOC event cards');
      await selectVizStyle(page, style.label);

      await expect(page.locator(`#viz-preview ${style.selector}`)).toBeVisible({ timeout: 15000 });
    });
  }

  test('layout audit runs for SOC view', async ({ page }) => {
    await loadExampleOnDesign(page);
    await selectVizType(page, 'SOC event cards');

    await expect(page.locator('#viz-preview .viz-soc')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Re-check' }).click();

    await expect(page.locator('.preview-quality-bar strong')).toHaveText(/\d+\/100/);
    await expect(page.locator('.soc-timeline')).toHaveCSS('position', 'relative');
  });

  test('clicking preview event opens detail popup', async ({ page }) => {
    await loadExampleOnDesign(page);
    await selectVizType(page, 'SOC event cards');
    await expect(page.locator('#viz-preview .viz-soc')).toBeVisible({ timeout: 10000 });
    await page.locator('.soc-card').first().click();
    await expect(page.locator('.event-detail-modal')).toBeVisible();
    await expect(page.locator('.event-detail-narrative p')).not.toHaveText('');
    await expect(page.locator('.design-toolbar')).toBeVisible();
    await page.locator('.event-detail-close').click();
    await expect(page.locator('.event-detail-modal')).toBeHidden();
  });

  test('pseudo-anchor selectors are positioned in rendered preview', async ({ page }) => {
    await loadExampleOnDesign(page);
    await selectVizType(page, 'SOC event cards');

    const positioned = await page.evaluate(() => {
      const el = document.querySelector('#viz-preview .soc-timeline');
      if (!el) return { found: false, ok: false };
      const positionedValues = new Set(['relative', 'absolute', 'fixed', 'sticky']);
      const position = getComputedStyle(el).position;
      return { found: true, ok: positionedValues.has(position), position };
    });

    expect(positioned.found).toBe(true);
    expect(positioned.ok).toBe(true);

    await selectVizType(page, 'Phase swimlanes');
    await expect(page.locator('#viz-preview .viz-overview')).toBeVisible({ timeout: 10000 });

    const laneOk = await page.locator('.overview-lane-track').first().evaluate((el) => {
      const positionedValues = new Set(['relative', 'absolute', 'fixed', 'sticky']);
      return positionedValues.has(getComputedStyle(el).position);
    });
    expect(laneOk).toBe(true);
  });
});
