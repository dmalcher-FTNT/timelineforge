import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatDwellTime } from '../../js/utils.js';
import { bulkUpdateEvents, computeTimelineStats } from '../../js/edit/timeline-stats.js';

const sampleEvents = [
  {
    id: 'evt-1',
    timestampStart: '2024-01-01T10:00:00Z',
    timestampEnd: null,
    hostname: 'HOST-A',
    username: 'user1',
    category: 'initial-access',
    phase: 1,
    linkedEventIds: ['evt-2'],
  },
  {
    id: 'evt-2',
    timestampStart: '2024-02-15T12:00:00Z',
    timestampEnd: '2024-02-15T14:00:00Z',
    hostname: 'HOST-B',
    username: 'user2',
    category: 'persistence',
    phase: 2,
    linkedEventIds: [],
  },
  {
    id: 'evt-3',
    timestampStart: '2024-03-01T08:00:00Z',
    timestampEnd: null,
    hostname: 'HOST-A',
    username: 'user1',
    category: 'initial-access',
    phase: 1,
    linkedEventIds: [],
  },
];

describe('formatDwellTime', () => {
  it('uses full month words for long spans', () => {
    assert.equal(
      formatDwellTime('2023-01-01T00:00:00Z', '2024-08-01T00:00:00Z'),
      '19 months',
    );
    assert.equal(
      formatDwellTime('2024-01-01T00:00:00Z', '2024-03-15T00:00:00Z'),
      '2 months',
    );
  });
});

describe('computeTimelineStats', () => {
  it('returns zeros for empty timeline', () => {
    const stats = computeTimelineStats([]);
    assert.equal(stats.eventCount, 0);
    assert.equal(stats.hostCount, 0);
    assert.deepEqual(stats.topCategories, []);
  });

  it('counts hosts, users, links, and categories', () => {
    const stats = computeTimelineStats(sampleEvents);
    assert.equal(stats.eventCount, 3);
    assert.equal(stats.hostCount, 2);
    assert.equal(stats.userCount, 2);
    assert.equal(stats.linkedCount, 1);
    assert.ok(stats.spanMonths >= 1);
    assert.equal(stats.topCategories[0].key, 'initial-access');
    assert.equal(stats.topCategories[0].count, 2);
    assert.ok(stats.earliest);
    assert.ok(stats.latest);
    assert.equal(stats.dwellTime, '59 days');
    assert.equal(stats.techniqueCount, 0);
    assert.equal(stats.categoryCount, 2);
  });
});

describe('bulkUpdateEvents', () => {
  it('updates only matching event ids', () => {
    const events = structuredClone(sampleEvents);
    bulkUpdateEvents(events, new Set(['evt-1', 'evt-3']), 'phase', 4);
    assert.equal(events[0].phase, 4);
    assert.equal(events[1].phase, 2);
    assert.equal(events[2].phase, 4);

    bulkUpdateEvents(events, new Set(['evt-2']), 'category', 'impact');
    assert.equal(events[1].category, 'impact');
  });
});
