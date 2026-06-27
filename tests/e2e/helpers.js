// @ts-check
/** Shared Playwright helpers for TimelineForge e2e tests. */

/** Sample labels as shown in File → Samples submenu. */
export const SAMPLE_LABELS = [
  'APT breach',
  'Ransomware',
  'Business email compromise',
  'Insider threat',
  'Supply chain',
  'Cloud breach',
];

/** Deterministic samples for export regression tests (includes small-template edge cases). */
export function pickExportSamplePair() {
  return ['Supply chain', 'Insider threat', 'Cloud breach'];
}

/** @param {import('@playwright/test').Page} page */
export async function skipWelcomeAndClearDraft(page) {
  await page.addInitScript(() => {
    localStorage.setItem('timelineforge-welcome-v1', '1');
    localStorage.removeItem('timelineforge-draft');
  });
}

/** @param {import('@playwright/test').Page} page @param {string} label */
export async function loadSample(page, label) {
  await skipWelcomeAndClearDraft(page);
  await page.goto('/');
  await page.locator('.brand-title').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('button', { name: 'File', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Samples' }).click();
  await page.locator('.header-submenu').getByRole('menuitem', { name: label }).click();
  await page.locator('.incident-overview').waitFor({ state: 'visible', timeout: 15000 });
}

/** @param {import('@playwright/test').Page} page */
export async function loadAptSample(page) {
  await loadSample(page, 'APT breach');
}

/** @param {import('@playwright/test').Page} page @param {'input'|'edit'|'publish'} id */
export async function goToWorkspaceTab(page, id) {
  await page.locator(`[data-workspace="${id}"]`).click();
}

/** @param {import('@playwright/test').Page} page */
export async function goToCollect(page) {
  await goToWorkspaceTab(page, 'input');
}

/** @param {import('@playwright/test').Page} page */
export async function goToRefine(page) {
  await goToWorkspaceTab(page, 'edit');
}

/** @param {import('@playwright/test').Page} page */
export async function goToDeliver(page) {
  await goToWorkspaceTab(page, 'publish');
}

/** Wait for preview viz content and fonts before raster export. */
export async function waitForExportPreview(page) {
  await page.locator(
    '#viz-preview .soc-card, #viz-preview .overview-chart, #viz-preview svg, #viz-preview .viz-host-lanes, #viz-preview .viz-phase-columns',
  ).first().waitFor({ state: 'visible', timeout: 15000 });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
}

/**
 * Run export from PUBLISH deliver panel (visual formats).
 * @param {import('@playwright/test').Page} page
 * @param {string} deliverLabel — e.g. "PDF document"
 * @param {string} confirmLabel — e.g. "Export PDF"
 */
export async function exportFromPublishPanel(page, deliverLabel, confirmLabel) {
  await goToDeliver(page);
  await page.locator('.publish-export-list').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('#viz-preview').waitFor({ state: 'visible', timeout: 15000 });
  await waitForExportPreview(page);
  await page.locator('.publish-export-btn').filter({ hasText: deliverLabel }).click();
  await page.locator('.export-preflight-modal').waitFor({ state: 'visible', timeout: 15000 });
  const confirm = page.getByRole('button', { name: confirmLabel, exact: true });
  await confirm.waitFor({ state: 'visible', timeout: 5000 });
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 45000 }),
    confirm.click(),
  ]);
  return download;
}

/**
 * Run export from header Export menu (report / data formats).
 * @param {import('@playwright/test').Page} page
 * @param {string} menuLabel
 * @param {string} confirmLabel
 */
export async function exportFromHeaderMenu(page, menuLabel, confirmLabel) {
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const exportMenu = page.locator('.header-dropdown').nth(2).getByRole('menu');
  await exportMenu.getByRole('menuitem', { name: menuLabel }).click();
  await page.locator('.export-preflight-modal').waitFor({ state: 'visible', timeout: 15000 });
  const confirm = page.getByRole('button', { name: confirmLabel, exact: true });
  await confirm.waitFor({ state: 'visible', timeout: 5000 });
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 45000 }),
    confirm.click(),
  ]);
  return download;
}

/** @param {import('@playwright/test').Download} download @param {string} dir */
export async function saveDownload(download, dir) {
  const { join } = await import('node:path');
  const name = download.suggestedFilename();
  const path = join(dir, name);
  await download.saveAs(path);
  return path;
}
