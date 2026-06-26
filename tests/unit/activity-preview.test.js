import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildActivityPreview } from '../../js/edit/activity-preview.js';

const sampleEvents = [
  {
    id: 'a',
    timestampStart: '2024-10-03T10:19:00Z',
    timestampEnd: null,
    category: 'initial-access',
    hostname: 'H1',
    username: 'u',
    details: 'x',
    phase: 1,
  },
  {
    id: 'b',
    timestampStart: '2025-01-15T08:00:00Z',
    timestampEnd: '2025-01-15T12:00:00Z',
    category: 'persistence',
    hostname: 'H2',
    username: 'u',
    details: 'y',
    phase: 2,
  },
  {
    id: 'c',
    timestampStart: '2026-04-16T17:52:00Z',
    timestampEnd: null,
    category: 'impact',
    hostname: 'H1',
    username: 'u',
    details: 'z',
    phase: 5,
  },
];

describe('buildActivityPreview', () => {
  it('returns null for empty input', () => {
    assert.equal(buildActivityPreview([]), null);
  });

  it('builds buckets, markers, and axis ticks', () => {
    const preview = buildActivityPreview(sampleEvents, { timezone: 'UTC' });
    assert.ok(preview);
    assert.ok(preview.buckets.length >= 10);
    assert.equal(preview.markers.length, 3);
    assert.ok(preview.ticks.length >= 3);
    assert.ok(preview.markers.every((m) => m.color && m.leftPct >= 0));
    assert.ok(preview.buckets.some((b) => b.heightPct > 0));
  });

  it('marks interval events differently from point events', () => {
    const preview = buildActivityPreview(sampleEvents);
    const interval = preview.markers.find((m) => m.id === 'b');
    const point = preview.markers.find((m) => m.id === 'a');
    assert.equal(interval.isPoint, false);
    assert.equal(point.isPoint, true);
  });

  it('spreads non-overlapping point events across preview lanes', () => {
    const events = Array.from({ length: 9 }, (_, i) => ({
      id: `p-${i}`,
      timestampStart: new Date(Date.UTC(2024, 0, 1 + i)).toISOString(),
      timestampEnd: null,
      category: 'initial-access',
      hostname: 'H1',
      username: 'u',
      details: `event ${i}`,
      phase: 1,
    }));
    const preview = buildActivityPreview(events);
    assert.ok(preview.laneCount > 1);
    assert.ok(new Set(preview.markers.map((m) => m.row)).size > 1);
  });
});
