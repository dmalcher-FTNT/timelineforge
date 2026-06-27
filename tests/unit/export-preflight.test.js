import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canSkipVisualExportPreflight,
  exportConfirmLabel,
  exportPreflightStatus,
  exportPreflightSummary,
} from '../../js/output/export-preflight.js';

describe('export preflight helpers', () => {
  it('labels confirm actions by format', () => {
    assert.equal(exportConfirmLabel('png'), 'Export PNG');
    assert.equal(exportConfirmLabel('pdf'), 'Export PDF');
  });

  it('always requires preflight modal (no skip)', () => {
    const ready = { ok: true, layoutScore: 92, layoutOverflow: 0 };
    assert.equal(canSkipVisualExportPreflight('png', ready), false);
    assert.equal(canSkipVisualExportPreflight('pptx', ready), false);
  });

  it('summarizes blocked, warning, and ready states', () => {
    assert.match(
      exportPreflightSummary('png', { ok: false, items: [{ severity: 'error', message: 'x' }] }),
      /Fix the errors/,
    );
    assert.match(
      exportPreflightSummary('png', {
        ok: true,
        layoutScore: 75,
        items: [{ severity: 'warning', message: 'overflow' }],
      }),
      /Layout score 75\/100/,
    );
    assert.match(
      exportPreflightSummary('png', { ok: true, layoutScore: 95, items: [] }),
      /Preview looks good \(95\/100\)/,
    );
  });

  it('classifies preflight status', () => {
    assert.equal(exportPreflightStatus({ ok: false, items: [] }), 'blocked');
    assert.equal(exportPreflightStatus({ ok: true, items: [{ severity: 'warning' }] }), 'warnings');
    assert.equal(exportPreflightStatus({ ok: true, items: [{ severity: 'info' }] }), 'ready');
  });
});
