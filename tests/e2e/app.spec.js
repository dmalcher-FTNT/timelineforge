// @ts-check
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appVersion = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../js/version.js'),
  'utf8',
).match(/APP_VERSION = '([^']+)'/)?.[1];

test.describe('TimelineForge UI', () => {
  test('boots without modals open', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.brand-title')).toHaveText('TimelineForge');
    await expect(page.locator('.brand-subtitle')).toHaveText('CHAIN OF EVENTS');
    await expect(page.locator('.brand-version')).toHaveText(`v${appVersion}`);
    await expect(page.locator('#boot-error')).toBeHidden();
    await expect(page.locator('.modal-backdrop.is-open')).toHaveCount(0);
    await expect(page.locator('.tab-panel.is-active')).toHaveCount(1);
    await expect(page.locator('.tab-panel.is-active')).toContainText('Source data');
    await expect(page.locator('.incident-panel')).toBeVisible();
    await expect(page.locator('.incident-overview')).toBeVisible();
  });

  test('tab buttons switch panels', async ({ page }) => {
    await page.goto('/');
    const tabs = ['INPUT', 'EDIT', 'PUBLISH'];
    const headings = [/Source data/i, /Timeline events/i, /Deliver/i];

    for (let i = 0; i < tabs.length; i++) {
      await page.getByRole('button', { name: tabs[i], exact: true }).click();
      await expect(page.locator('.tab-panel.is-active')).toHaveCount(1);
      await expect(page.locator('.tab-panel.is-active')).toContainText(headings[i]);
      await expect(page.locator('.modal-backdrop.is-open')).toHaveCount(0);
    }
  });

  test('host filter shows subset of events', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'EDIT', exact: true }).click();
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
    await page.goto('/');
    await page.getByRole('button', { name: 'File', exact: true }).click();
    const fileMenu = page.locator('.header-dropdown').first().getByRole('menu');
    await expect(fileMenu).toBeVisible();
    await expect(fileMenu.getByRole('menuitem', { name: /Open/i })).toBeVisible();
    await expect(fileMenu.getByRole('menuitem', { name: /About TimelineForge/i })).toBeVisible();

    await page.getByRole('button', { name: 'Tools', exact: true }).click();
    const toolsMenu = page.locator('.header-dropdown').nth(1).getByRole('menu');
    await expect(toolsMenu).toBeVisible();
    await expect(toolsMenu.locator('button', { hasText: 'Anonymize' })).toBeVisible();
    await expect(toolsMenu.locator('button', { hasText: 'Copy share link' })).toBeVisible();

    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const exportMenu = page.locator('.header-dropdown').nth(2).getByRole('menu');
    await expect(exportMenu).toBeVisible();
    await expect(exportMenu.getByRole('menuitem', { name: 'Shareable link' })).toBeVisible();
    await expect(exportMenu.getByRole('menuitem', { name: 'Share file' })).toBeVisible();
    await expect(exportMenu.getByRole('menuitem', { name: /Open Publish tab/i })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Share', exact: true })).toBeVisible();
  });

  test('edit changes sync back to input source', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => (document.body._x_dataStack?.[0]?.inputText?.length ?? 0) > 100, { timeout: 15000 });
    await page.getByRole('button', { name: 'EDIT', exact: true }).click();
    await expect(page.locator('.edit-main [data-event-id]').first()).toBeVisible({ timeout: 10000 });
    const firstRow = page.locator('.edit-main [data-event-id]').first();
    await firstRow.locator('.edit-simple-row').click();
    const detailsField = firstRow.locator('.edit-event-field-details textarea');
    await detailsField.fill('E2E sync test marker');
    await detailsField.dispatchEvent('input');
    await page.waitForFunction(() => document.body._x_dataStack?.[0]?.timeline?.events?.[0]?.details?.includes('E2E sync test marker'), { timeout: 5000 });
    await page.getByRole('button', { name: 'INPUT', exact: true }).click();
    await page.waitForFunction(() => document.body._x_dataStack?.[0]?.inputText?.includes('E2E sync test marker'), { timeout: 5000 });
    await expect(page.locator('.tab-panel.is-active textarea')).toHaveValue(/E2E sync test marker/);
  });

  test('new timeline clears workspace', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'EDIT', exact: true }).click();
    await expect(page.locator('.edit-main [data-event-id]')).not.toHaveCount(0);
    await page.getByRole('button', { name: 'File', exact: true }).click();
    await page.locator('.header-dropdown').first().getByRole('menuitem', { name: /New timeline/i }).click();
    await expect(page.locator('.modal-backdrop.is-open')).toHaveCount(1);
    await page.getByRole('button', { name: 'Clear workspace' }).click();
    await expect(page.locator('.modal-backdrop.is-open')).toHaveCount(0);
    await page.getByRole('button', { name: 'EDIT', exact: true }).click();
    await expect(page.locator('.edit-main [data-event-id]')).toHaveCount(0);
  });

  test('sample load picks a suggested publish layout', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'File', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Samples' }).click();
    await page.locator('.header-submenu').getByRole('menuitem', { name: 'APT breach' }).click();
    await page.getByRole('button', { name: 'PUBLISH', exact: true }).click();
    await expect(page.locator('.design-gallery-card.active')).toContainText('Swimlane timeline');
  });

  test('observable click filters edit events', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'File', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Samples' }).click();
    await page.locator('.header-submenu').getByRole('menuitem', { name: 'Business email compromise' }).click();
    await page.getByRole('button', { name: 'EDIT', exact: true }).click();
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
});
