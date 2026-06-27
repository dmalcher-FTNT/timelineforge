import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  choosePdfOrientation,
  exportCaptureScale,
  fitToBox,
  planCanvasPdfPages,
} from '../../js/output/export-fit.js';

describe('export-fit', () => {
  it('fitToBox scales down wide content', () => {
    const fit = fitToBox(2200, 800, 700, 500);
    assert.ok(fit.width <= 700);
    assert.ok(fit.height <= 500);
    assert.ok(Math.abs(fit.width / fit.height - 2200 / 800) < 0.01);
  });

  it('choosePdfOrientation picks landscape for wide layouts', () => {
    assert.equal(choosePdfOrientation(1600, 900), 'landscape');
    assert.equal(choosePdfOrientation(700, 1200), 'portrait');
  });

  it('planCanvasPdfPages returns one page when content fits', () => {
    const pages = planCanvasPdfPages(1000, 700, 400, 500);
    assert.equal(pages.length, 1);
    assert.equal(pages[0].slicePx, 1000);
  });

  it('planCanvasPdfPages splits tall content across pages', () => {
    const pages = planCanvasPdfPages(2000, 700, 1400, 500);
    assert.ok(pages.length > 1);
    assert.equal(pages.reduce((sum, p) => sum + p.slicePx, 0), 2000);
  });

  it('exportCaptureScale caps scale for huge layouts', () => {
    assert.ok(exportCaptureScale(8000, 6000) < 1);
    assert.equal(exportCaptureScale(800, 600), 2);
  });
});
