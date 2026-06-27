import { test, expect } from '@playwright/test';
import { loadAptSample } from './helpers.js';

test.describe('Deliver report exports', () => {
  test('shows report template exports in header Export menu', async ({ page }) => {
    await loadAptSample(page);

    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const exportMenu = page.locator('.header-dropdown').filter({ has: page.getByRole('button', { name: 'Export', exact: true }) }).getByRole('menu');
    await expect(exportMenu).toBeVisible();
    await expect(exportMenu.getByRole('menuitem', { name: /Executive one-pager/i })).toBeVisible();
    await expect(exportMenu.getByRole('menuitem', { name: /Appendix page \(PDF\)/i })).toBeVisible();
    await expect(exportMenu.getByRole('menuitem', { name: /Report pack/i })).toBeVisible();
    await expect(exportMenu.getByRole('menuitem', { name: /STIX 2.1 bundle/i })).toBeVisible();
  });
});
