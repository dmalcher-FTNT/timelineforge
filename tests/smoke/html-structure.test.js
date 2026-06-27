import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const html = readFileSync(join(root, 'index.html'), 'utf8');

describe('index.html structure', () => {
  it('bootstraps Alpine on body', () => {
    assert.match(html, /x-data="app"/);
    assert.match(html, /js\/bootstrap\.js/);
    assert.match(html, /x-cloak/);
    assert.match(html, /handleKeydown/);
  });

  it('uses class-based tab panels (not x-show on sections)', () => {
    assert.match(html, /tab-panel.*is-active.*tab === 'input'/s);
    assert.match(html, /tab-panel.*is-active.*tab === 'edit'/s);
    assert.match(html, /tab-panel.*is-active.*tab === 'publish'/s);
    assert.doesNotMatch(html, /tab-panel.*is-active.*tab === 'design'/s);
    assert.doesNotMatch(html, /tab-panel.*is-active.*tab === 'output'/s);
    assert.doesNotMatch(html, /<section class="panel" x-show="tab ===/);
  });

  it('modals hidden by default via is-open class', () => {
    assert.match(html, /:class="\{ 'is-open': showAnonymizeModal \}"/);
    assert.doesNotMatch(html, /x-show="showAnonymizeModal"/);
    assert.match(html, /showEventDetailModal/);
    assert.match(html, /openEventDetailInEdit/);
    assert.doesNotMatch(html, /Click any event for details/);
  });

  it('edit tab uses filter sidebar not json panel', () => {
    assert.match(html, /edit-sidebar/);
    assert.match(html, /selectHostFilter/);
    assert.match(html, /edit-table-controls/);
    assert.match(html, /Source data/);
    assert.match(html, /input-workspace/);
    assert.match(html, /publish-deliver/);
    assert.match(html, /secondaryPublishActions/);
    assert.match(html, /openHeaderExportMenu/);
    assert.match(html, /primaryPublishActions/);
    assert.match(html, /editViewMode/);
    assert.match(html, /edit-simple-list/);
    assert.match(html, /toggleEditExpanded/);
    assert.match(html, /quality-sidebar/);
    assert.match(html, /design-toolbar/);
    assert.match(html, /design-gallery/);
    assert.match(html, /designAudiences/);
    assert.match(html, /filteredDesignLayouts/);
    assert.match(html, /designLayout/);
    assert.match(html, /design-gallery-card/);
    assert.doesNotMatch(html, /outputSectionsForLayout/);
    assert.match(html, /activityPreview\(\)/);
    assert.match(html, /goToAnalysisItem/);
    assert.match(html, /analysisRecommendationsList/);
    assert.doesNotMatch(html, /analysis-inline/);
    assert.doesNotMatch(html, /inputMode === 'json'/);
    assert.doesNotMatch(html, /Split JSON panel/);
  });

  it('uses grouped header File, Tools, and Export menus', () => {
    assert.match(html, /header-menu-trigger/);
    assert.match(html, /toggleHeaderMenu\('file'\)/);
    assert.match(html, /toggleHeaderMenu\('tools'\)/);
    assert.match(html, /toggleHeaderMenu\('export'\)/);
    assert.match(html, /headerToolsSections/);
    assert.match(html, /headerToolAction/);
    assert.match(html, /Open Publish tab/);
    assert.match(html, /header-btn-share/);
  });

  it('shows TimelineForge branding in header', () => {
    assert.match(html, /brand-lockup/);
    assert.match(html, /brand-subtitle/);
    assert.match(html, /CHAIN OF EVENTS/);
    assert.match(html, /incident-panel/);
    assert.match(html, /incident-title-input/);
    assert.match(html, /brandLogoSrc\(\)/);
    assert.match(html, /TimelineForge/);
    assert.match(html, /appVersion/);
    assert.ok(readFileSync(join(root, 'assets/timelineforge-logo-light.svg'), 'utf8').includes('<svg'));
    assert.ok(readFileSync(join(root, 'assets/timelineforge-logo-dark.svg'), 'utf8').includes('<svg'));
  });

  it('uses import map and vendored dependencies', () => {
    assert.match(html, /type="importmap"/);
    assert.match(html, /\.\/vendor\/alpinejs\.mjs/);
    assert.match(html, /\.\/vendor\/d3\.mjs/);
    assert.ok(existsSync(join(root, 'vendor/alpinejs.mjs')));
    assert.ok(existsSync(join(root, 'vendor/d3.mjs')));
    assert.ok(existsSync(join(root, 'assets/icon-192.png')));
    assert.ok(existsSync(join(root, 'assets/icon-512.png')));
  });
});
