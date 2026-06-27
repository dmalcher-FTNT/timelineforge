// @ts-check
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAptSample, skipWelcomeAndClearDraft, goToCollect, goToRefine, goToDeliver } from './helpers.js';

const appVersion = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../js/version.js'),
  'utf8',
).match(/APP_VERSION = '([^']+)'/)?.[1];

test.describe('TimelineForge UI', () => {
  test('boots with welcome on first visit', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('timelineforge-welcome-v1');
      localStorage.removeItem('timelineforge-draft');
    });
    await page.goto('/');
    await expect(page.locator('.brand-title')).toHaveText('TimelineForge');
    await expect(page.locator('.welcome-modal')).toBeVisible();
    await expect(page.locator('.incident-overview')).toBeHidden();
  });

  test('boots without modals after welcome completed', async ({ page }) => {
    await skipWelcomeAndClearDraft(page);
    await page.goto('/');
    await expect(page.locator('.brand-title')).toHaveText('TimelineForge');
    await expect(page.locator('.brand-subtitle')).toHaveText('CHAIN OF EVENTS');
    await expect(page.locator('.brand-version')).toHaveText(`v${appVersion}`);
    await expect(page.locator('#boot-error')).toBeHidden();
    await expect(page.locator('.modal-backdrop.is-open')).toHaveCount(0);
    await expect(page.locator('.tab-panel.is-active')).toHaveCount(1);
    await expect(page.locator('.tab-panel.is-active')).toContainText('Source data');
    await expect(page.locator('.incident-panel')).toBeVisible();
    await expect(page.locator('.incident-overview')).toBeHidden();
  });

  test('workspace switcher sits above incident overview', async ({ page }) => {
    await loadAptSample(page);
    const navBox = await page.locator('.workspace-nav').boundingBox();
    const panelBox = await page.locator('.incident-panel').boundingBox();
    expect(navBox).toBeTruthy();
    expect(panelBox).toBeTruthy();
    expect(navBox.y).toBeLessThan(panelBox.y);
    await expect(page.locator('[data-workspace="input"].is-active')).toBeVisible();
  });

  test('incident overview can collapse', async ({ page }) => {
    await loadAptSample(page);
    await expect(page.locator('.incident-overview')).toBeVisible();
    await page.getByRole('button', { name: 'Hide overview' }).click();
    await expect(page.locator('.incident-overview')).toBeHidden();
    await expect(page.locator('.incident-panel.is-collapsed')).toBeVisible();
    await page.getByRole('button', { name: 'Show overview' }).click();
    await expect(page.locator('.incident-overview')).toBeVisible();
  });

  test('tab buttons switch panels', async ({ page }) => {
    await loadAptSample(page);
    const tabs = ['Collect', 'Refine', 'Deliver'];
    const headings = [/Source data/i, /Timeline events/i, /Deliver/i];

    for (let i = 0; i < tabs.length; i++) {
      await page.getByRole('button', { name: tabs[i], exact: true }).click();
      await expect(page.locator('.tab-panel.is-active')).toHaveCount(1);
      await expect(page.locator('.tab-panel.is-active')).toContainText(headings[i]);
      await expect(page.locator('.modal-backdrop.is-open')).toHaveCount(0);
    }
  });

  test('host filter shows subset of events', async ({ page }) => {
    await loadAptSample(page);
    await goToRefine(page);
    await expect(page.locator('.edit-main [data-event-id]')).not.toHaveCount(0, { timeout: 10000 });
    const total = await page.locator('.edit-main [data-event-id]').count();
    const firstHost = page.locator('.edit-sidebar .filter-chip').nth(1);
    await firstHost.click();
    const filtered = await page.locator('.edit-main [data-event-id]').count();
    expect(filtered).toBeLessThan(total);
    await expect(page.locator('.edit-subtitle')).toContainText('filtered');
    await firstHost.click();
    await expect(page.locator('.edit-main [data-event-id]')).toHaveCount(total);
  });

  test('header File, Tools, and Export menus open', async ({ page }) => {
    await skipWelcomeAndClearDraft(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'File', exact: true }).click();
    const fileMenu = page.locator('.header-dropdown').first().getByRole('menu');
    await expect(fileMenu).toBeVisible();
    await expect(fileMenu.getByRole('menuitem', { name: /Open/i })).toBeVisible();
    await expect(fileMenu.getByRole('menuitem', { name: /About TimelineForge/i })).toBeVisible();

    await page.getByRole('button', { name: 'Tools', exact: true }).click();
    const toolsMenu = page.locator('.header-dropdown').nth(1).getByRole('menu');
    await expect(toolsMenu).toBeVisible();
    await expect(toolsMenu.locator('button', { hasText: 'Data quality report' })).toBeVisible();
    await expect(toolsMenu.locator('button', { hasText: 'Anonymize timeline' })).toBeVisible();

    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const exportMenu = page.locator('.header-dropdown').nth(2).getByRole('menu');
    await expect(exportMenu).toBeVisible();
    await expect(exportMenu.getByRole('menuitem', { name: /Shareable link/i })).toBeVisible();
    await expect(exportMenu.getByRole('menuitem', { name: /Share file/i })).toBeVisible();
    await expect(exportMenu.getByRole('menuitem', { name: /Open Deliver workspace/i })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Share', exact: true })).toBeVisible();
  });

  test('edit changes sync back to input source', async ({ page }) => {
    await loadAptSample(page);
    await page.waitForFunction(() => (document.body._x_dataStack?.[0]?.inputText?.length ?? 0) > 100, { timeout: 15000 });
    await goToRefine(page);
    await expect(page.locator('.edit-main [data-event-id]').first()).toBeVisible({ timeout: 10000 });
    const firstRow = page.locator('.edit-main [data-event-id]').first();
    await firstRow.locator('.edit-simple-row').click();
    const detailsField = firstRow.locator('.edit-event-field-details textarea');
    await detailsField.fill('E2E sync test marker');
    await detailsField.dispatchEvent('input');
    await page.waitForFunction(() => document.body._x_dataStack?.[0]?.timeline?.events?.[0]?.details?.includes('E2E sync test marker'), { timeout: 5000 });
    await goToCollect(page);
    await page.waitForFunction(() => document.body._x_dataStack?.[0]?.inputText?.includes('E2E sync test marker'), { timeout: 5000 });
    await expect(page.locator('.tab-panel.is-active textarea')).toHaveValue(/E2E sync test marker/);
  });

  test('new timeline clears workspace', async ({ page }) => {
    await loadAptSample(page);
    await goToRefine(page);
    await expect(page.locator('.edit-main [data-event-id]')).not.toHaveCount(0);
    await page.getByRole('button', { name: 'File', exact: true }).click();
    await page.locator('.header-dropdown').first().getByRole('menuitem', { name: /New timeline/i }).click();
    await expect(page.locator('.modal-backdrop.is-open')).toHaveCount(1);
    await page.getByRole('button', { name: 'Clear workspace' }).click();
    await expect(page.locator('.modal-backdrop.is-open')).toHaveCount(0);
    await goToRefine(page);
    await expect(page.locator('.edit-main [data-event-id]')).toHaveCount(0);
  });

  test('sample load picks a suggested publish layout', async ({ page }) => {
    await loadAptSample(page);
    await goToDeliver(page);
    await expect(page.locator('.design-gallery-card.active')).toContainText('Swimlane timeline');
  });

  test('share link is portable after loading APT sample', async ({ page }) => {
    await loadAptSample(page);
    await page.getByRole('button', { name: 'Share' }).click();
    await expect(page.locator('.share-modal')).toBeVisible();
    await expect(page.locator('.share-url-input')).toBeVisible();
    await expect(page.locator('.share-url-input')).toHaveValue(/#data=/);
    await expect(page.getByRole('button', { name: 'Same-browser bookmark' })).toBeHidden();
    await expect(page.locator('.share-hint')).toContainText(/Portable link/i);
  });

  test('theme toggle switches dark and light mode', async ({ page }) => {
    await skipWelcomeAndClearDraft(page);
    await page.goto('/');
    const themeBtn = page.locator('.header-actions button.header-btn-icon').filter({ hasText: '☾' });
    await expect(themeBtn).toBeVisible();

    await expect(page.locator('body')).not.toHaveClass(/theme-dark/);
    let bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toMatch(/rgb\(245, 245, 245\)|rgb\(255, 255, 255\)/);

    await themeBtn.click();
    await expect(page.locator('body')).toHaveClass(/theme-dark/);
    bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg).toMatch(/rgb\(13, 13, 13\)/);

    const lightBtn = page.locator('.header-actions button.header-btn-icon').filter({ hasText: '☀' });
    await lightBtn.click();
    await expect(page.locator('body')).not.toHaveClass(/theme-dark/);
  });

  test('demo banner appears for sample timelines', async ({ page }) => {
    await loadAptSample(page);
    await expect(page.locator('.demo-banner')).toBeVisible();
    await page.locator('.demo-banner').getByRole('button', { name: 'Dismiss' }).click();
    await expect(page.locator('.demo-banner')).toBeHidden();
  });

  test('observable click filters edit events on APT sample', async ({ page }) => {
    await loadAptSample(page);
    await goToRefine(page);
    await expect(page.locator('.observables-sidebar')).toBeVisible({ timeout: 15000 });
    const total = await page.locator('.edit-main [data-event-id]').count();
    const firstObservable = page.locator('.observables-row').first();
    await firstObservable.click();
    await expect(page.locator('.edit-subtitle')).toContainText('filtered');
    const filtered = await page.locator('.edit-main [data-event-id]').count();
    expect(filtered).toBeLessThan(total);
    await firstObservable.click();
    await expect(page.locator('.edit-main [data-event-id]')).toHaveCount(total);
  });

  test('publish empty state guides blank workspace', async ({ page }) => {
    await skipWelcomeAndClearDraft(page);
    await page.goto('/');
    await page.locator('.brand-title').waitFor({ state: 'visible', timeout: 15000 });
    await goToDeliver(page);
    await expect(page.locator('.publish-empty-state')).toBeVisible();
    await expect(page.locator('.publish-empty-state')).toContainText('Load sample');
    await page.locator('.publish-empty-state').getByRole('button', { name: 'Go to Collect' }).click();
    await expect(page.locator('.tab-panel.is-active')).toContainText('Source data');
  });

  test('incident title field uses incident placeholder', async ({ page }) => {
    await skipWelcomeAndClearDraft(page);
    await page.goto('/');
    await expect(page.locator('.incident-title-input')).toHaveAttribute('placeholder', 'Incident title');
  });

  test('import timeline button parses manual input', async ({ page }) => {
    await skipWelcomeAndClearDraft(page);
    await page.goto('/');
    await page.locator('#input-source-text').fill('2024-10-03 10:19 — HOST-001 — DOMAIN\\USER-001 — Phishing link clicked');
    await page.getByRole('button', { name: 'Import timeline' }).click();
    await expect(page.locator('.input-import-success')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.input-import-success')).toContainText('1 events imported');
    await page.getByRole('button', { name: 'Review in Refine →' }).click();
    await expect(page.locator('.edit-simple-list .edit-simple-item')).toHaveCount(1);
  });
});
