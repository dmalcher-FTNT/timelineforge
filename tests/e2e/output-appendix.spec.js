import { test, expect } from '@playwright/test';

test.describe('PUBLISH report exports', () => {
  test('shows report template exports in deliver panel', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'File', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Samples' }).click();
    await page.locator('.header-submenu').getByRole('menuitem', { name: 'APT breach' }).click();
    await expect(page.locator('.incident-overview')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'PUBLISH', exact: true }).click();
    await expect(page.locator('.publish-deliver')).toBeVisible({ timeout: 15000 });

    await page.locator('.publish-export-group').filter({ hasText: 'Report templates' }).evaluate((el) => { el.open = true; });
    await expect(page.locator('.publish-deliver .output-card').filter({ hasText: 'Executive one-pager (PDF)' })).toBeVisible();
    await expect(page.locator('.publish-deliver .output-card').filter({ hasText: 'Appendix page (PDF)' })).toBeVisible();
    await expect(page.locator('.publish-deliver .output-card').filter({ hasText: 'Appendix page (PNG)' })).toBeVisible();
    await expect(page.locator('.publish-deliver .output-card').filter({ hasText: 'Report pack' })).toBeVisible();
    await expect(page.locator('.publish-deliver .output-card').filter({ hasText: 'Appendix slide (PPTX)' })).toBeVisible();
  });
});
