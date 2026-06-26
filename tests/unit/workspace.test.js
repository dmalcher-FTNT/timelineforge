import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyTimeline } from '../../js/workspace.js';

describe('createEmptyTimeline', () => {
  it('returns an empty timeline with defaults', () => {
    const t = createEmptyTimeline();
    assert.equal(t.events.length, 0);
    assert.equal(t.meta.title, '');
    assert.equal(t.meta.timezone, 'UTC');
    assert.equal(t.meta.applyEditFiltersToExport, false);
  });

  it('preserves theme and timezone when provided', () => {
    const t = createEmptyTimeline({ theme: 'dark', timezone: 'Europe/London', accentColor: '#123456' });
    assert.equal(t.meta.theme, 'dark');
    assert.equal(t.meta.timezone, 'Europe/London');
    assert.equal(t.meta.accentColor, '#123456');
  });
});
