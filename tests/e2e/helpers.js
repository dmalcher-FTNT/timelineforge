// @ts-check
/** Shared Playwright helpers for TimelineForge e2e tests. */

/** @param {import('@playwright/test').Page} page */
export async function skipWelcomeAndClearDraft(page) {
  await page.addInitScript(() => {
    localStorage.setItem('timelineforge-welcome-v1', '1');
    localStorage.removeItem('timelineforge-draft');
  });
}

/** @param {import('@playwright/test').Page} page */
export async function loadAptSample(page) {
  await skipWelcomeAndClearDraft(page);
  await page.goto('/');
  await page.locator('.brand-title').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('button', { name: 'File', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Samples' }).click();
  await page.locator('.header-submenu').getByRole('menuitem', { name: 'APT breach' }).click();
  await page.locator('.incident-overview').waitFor({ state: 'visible', timeout: 15000 });
}
