import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { processInputDetailed } from '../../js/input/parser.js';
import { shareIdFromHash } from '../../js/output/share-link.js';
import { computeTimelineStats } from '../../js/edit/timeline-stats.js';

describe('processInputDetailed', () => {
  it('reports skipped manual lines', () => {
    const text = `2024-01-01 10:00 — HOST-A — Event one
not a valid line
2024-01-02 10:00 — HOST-B — Event two`;
    const { events, attempted, parsed, skipped } = processInputDetailed({ mode: 'manual', text });
    assert.ok(parsed >= 2);
    assert.ok(attempted >= parsed);
    assert.equal(skipped, attempted - parsed);
    assert.ok(events.length >= 2);
  });
});

describe('share link helpers', () => {
  it('extracts share id from hash', () => {
    assert.equal(shareIdFromHash('#share=abc-123'), 'abc-123');
    assert.equal(shareIdFromHash('#data=foo'), null);
  });
});

describe('computeTimelineStats top entities', () => {
  it('returns top hosts and users', () => {
    const events = [
      { id: '1', timestampStart: '2024-01-01T10:00:00Z', hostname: 'H-A', username: 'u1', category: 'impact', details: 'a' },
      { id: '2', timestampStart: '2024-01-02T10:00:00Z', hostname: 'H-A', username: 'u2', category: 'impact', details: 'b' },
      { id: '3', timestampStart: '2024-01-03T10:00:00Z', hostname: 'H-B', username: 'u1', category: 'impact', details: 'c' },
    ];
    const stats = computeTimelineStats(events);
    assert.equal(stats.topHosts[0].name, 'H-A');
    assert.equal(stats.topHosts[0].count, 2);
    assert.equal(stats.topUsers[0].name, 'u1');
    assert.equal(stats.topUsers[0].count, 2);
  });
});
