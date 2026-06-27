// @ts-check
import { test, expect } from '@playwright/test';
import { skipWelcomeAndClearDraft, goToCollect } from './helpers.js';

test.describe('Collect workspace', () => {
  test('markdown table mode uses full-width editor', async ({ page }) => {
    await skipWelcomeAndClearDraft(page);
    await page.goto('/');
    await goToCollect(page);
    await expect(page.locator('.input-panel.is-active')).toBeVisible();

    await page.getByRole('button', { name: 'Markdown table' }).click();
    await expect(page.locator('.input-source-textarea')).toBeVisible();
    await expect(page.locator('.grid-2')).toHaveCount(0);

    const workspace = page.locator('.input-workspace');
    const panel = page.locator('.input-panel.is-active');
    const workspaceBox = await workspace.boundingBox();
    const panelBox = await panel.boundingBox();
    expect(workspaceBox).toBeTruthy();
    expect(panelBox).toBeTruthy();
    expect(workspaceBox.width).toBeGreaterThan(panelBox.width * 0.85);
  });

  test('IR import shows tool format selector', async ({ page }) => {
    await skipWelcomeAndClearDraft(page);
    await page.goto('/');
    await goToCollect(page);
    await page.getByRole('button', { name: 'IR tool import' }).click();
    await expect(page.locator('#input-import-tool')).toBeVisible();

    await page.locator('#input-import-tool').selectOption({ label: 'Splunk Notable Events CSV' });
    await expect(page.locator('#input-import-tool')).toHaveValue(/splunk/i);
  });
});
