// @ts-check
import { test, expect } from '@playwright/test';

test.describe('OUTPUT appendix export', () => {
  test('shows appendix export cards on OUTPUT tab', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'File', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Samples' }).click();
    await expect(page.locator('.header-submenu')).toBeVisible();
    await page.locator('.header-submenu').getByRole('menuitem', { name: 'APT breach' }).click();
    await expect(page.locator('.incident-overview')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'OUTPUT', exact: true }).click();
    await expect(page.locator('.output-card').filter({ hasText: 'Executive one-pager (PDF)' })).toBeVisible();
    await expect(page.locator('.output-card').filter({ hasText: 'Appendix page (PDF)' })).toBeVisible();
    await expect(page.locator('.output-card').filter({ hasText: 'Appendix page (PNG)' })).toBeVisible();
    await expect(page.locator('.output-card').filter({ hasText: 'Report pack' })).toBeVisible();
    await expect(page.locator('.output-card').filter({ hasText: 'Appendix slide (PPTX)' })).toBeVisible();
  });
});
