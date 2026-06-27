import { test, expect } from '@playwright/test';
import { loadAptSample, skipWelcomeAndClearDraft } from './helpers.js';

test.describe('EDIT usability fixes', () => {
  test('quality badge opens modal without leaving current tab', async ({ page }) => {
    await loadAptSample(page);
    await page.getByRole('button', { name: 'PUBLISH', exact: true }).click();
    await expect(page.locator('#viz-preview')).toBeVisible({ timeout: 15000 });

    await page.locator('.incident-quality-badge').click();
    await expect(page.locator('.quality-modal')).toBeVisible();
    await expect(page.locator('.publish-panel.is-active')).toBeVisible();
  });

  test('MITRE technique filter chips appear when techniques are tagged', async ({ page }) => {
    await loadAptSample(page);
    await page.getByRole('button', { name: 'EDIT', exact: true }).click();
    await page.getByRole('button', { name: 'Expert' }).click();
    const techniqueInput = page.locator('.edit-table tbody tr').first().locator('input[list="mitre-list"]');
    await techniqueInput.fill('T1566');
    await techniqueInput.dispatchEvent('input');
    await expect(page.locator('.filter-group').filter({ hasText: 'MITRE technique' })).toBeVisible();
    await page.locator('.filter-chip-mitre').filter({ hasText: 'T1566' }).click();
    await expect(page.locator('.edit-subtitle')).toContainText('filtered');
  });

  test('undo reverts edit immediately', async ({ page }) => {
    await loadAptSample(page);
    await page.getByRole('button', { name: 'EDIT', exact: true }).click();
    const firstRow = page.locator('.edit-main [data-event-id]').first();
    await firstRow.locator('.edit-simple-row').click();
    const hostInput = firstRow.locator('.edit-event-field').filter({ hasText: 'Host' }).locator('input');
    const original = await hostInput.inputValue();
    await hostInput.fill(`${original}-undo-test`);
    await hostInput.dispatchEvent('input');
    await expect(page.getByRole('button', { name: '↶' })).toBeEnabled({ timeout: 3000 });
    await page.getByRole('button', { name: '↶' }).click();
    await expect(hostInput).toHaveValue(original, { timeout: 3000 });
  });

  test('status toast stays visible and can be dismissed', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('timelineforge-welcome-v1');
      localStorage.removeItem('timelineforge-draft');
    });
    await page.goto('/');
    await page.locator('.brand-title').waitFor({ state: 'visible', timeout: 15000 });
    await page.getByRole('button', { name: 'Start blank timeline' }).click();
    await expect(page.locator('.app-toast')).toBeVisible();
    await page.waitForTimeout(3500);
    await expect(page.locator('.app-toast')).toBeVisible();
    await page.locator('.app-toast-dismiss').click();
    await expect(page.locator('.app-toast')).toBeHidden();
  });
});
