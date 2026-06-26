import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateExport } from '../../js/output/export-validate.js';

describe('validateExport', () => {
  it('blocks empty timelines', () => {
    const result = validateExport({ meta: {}, events: [] });
    assert.equal(result.ok, false);
    assert.ok(result.items.some((i) => i.severity === 'error'));
  });

  it('passes valid timeline', () => {
    const result = validateExport({
      meta: { title: 'Test' },
      events: [{ timestampStart: '2024-01-01T00:00:00Z', details: 'Event', hostname: 'H', username: 'U' }],
    });
    assert.equal(result.ok, true);
  });

  it('warns on missing details', () => {
    const result = validateExport({
      meta: { title: 'Test' },
      events: [{ timestampStart: '2024-01-01T00:00:00Z', details: '', hostname: 'H', username: 'U' }],
    });
    assert.ok(result.items.some((i) => i.severity === 'warning'));
  });
});
