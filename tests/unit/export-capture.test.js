import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { timelineChartMinWidth } from '../../js/design/phase-content.js';
import { EXPORT_SCROLL_SELECTORS, measureExportBounds } from '../../js/output/export-capture.js';

describe('measureExportBounds', () => {
  it('uses the widest scrollable descendant', () => {
    const root = {
      scrollWidth: 900,
      scrollHeight: 600,
      offsetWidth: 900,
      offsetHeight: 600,
      querySelectorAll(selector) {
        if (selector.includes('.overview-chart')) {
          return [{
            scrollWidth: 1588,
            scrollHeight: 420,
            offsetWidth: 900,
            offsetHeight: 420,
            clientWidth: 900,
          }];
        }
        return [];
      },
    };

    const bounds = measureExportBounds(root);
    assert.equal(bounds.width, 1588);
    assert.equal(bounds.height, 600);
    assert.equal(bounds.offsetX, 0);
  });

  it('detects overflow from generic descendants', () => {
    const wide = { scrollWidth: 1400, offsetWidth: 1400, scrollHeight: 200, offsetHeight: 200, clientWidth: 700 };
    const root = {
      scrollWidth: 700,
      scrollHeight: 500,
      offsetWidth: 700,
      offsetHeight: 500,
      querySelectorAll(selector) {
        if (selector === EXPORT_SCROLL_SELECTORS.join(',')) return [];
        return [wide];
      },
    };

    assert.equal(measureExportBounds(root).width, 1400);
  });
});

describe('timelineChartMinWidth export sizing', () => {
  it('exceeds default preview width for long APT-style timelines', () => {
    const width = timelineChartMinWidth(19);
    assert.ok(width > 1100, `expected chart min width > 1100, got ${width}`);
  });
});
