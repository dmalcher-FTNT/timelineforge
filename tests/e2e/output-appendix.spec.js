import { test, expect } from '@playwright/test';
import { loadAptSample } from './helpers.js';

test.describe('PUBLISH report exports', () => {
  test('shows report template exports in header Export menu', async ({ page }) => {
    await loadAptSample(page);

    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const exportMenu = page.locator('.header-dropdown').filter({ has: page.getByRole('button', { name: 'Export', exact: true }) }).getByRole('menu');
    await expect(exportMenu).toBeVisible();
    await expect(exportMenu.getByRole('menuitem', { name: 'Executive one-pager (PDF)' })).toBeVisible();
    await expect(exportMenu.getByRole('menuitem', { name: 'Appendix page (PDF)' })).toBeVisible();
    await expect(exportMenu.getByRole('menuitem', { name: 'Report pack (ZIP)' })).toBeVisible();
    await expect(exportMenu.getByRole('menuitem', { name: 'STIX 2.1 bundle' })).toBeVisible();
  });
});
