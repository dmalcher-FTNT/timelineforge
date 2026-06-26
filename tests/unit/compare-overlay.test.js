import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCompareStatusMap } from '../../js/design/compare-overlay.js';

const base = [
  { id: 'a', timestampStart: '2024-01-01T10:00:00Z', hostname: 'H1', username: 'u', details: 'one', category: 'reconnaissance' },
  { id: 'b', timestampStart: '2024-01-02T10:00:00Z', hostname: 'H2', username: 'u', details: 'two', category: 'impact' },
];

describe('buildCompareStatusMap', () => {
  it('marks added and changed events', () => {
    const current = [
      base[0],
      { ...base[1], details: 'two updated' },
      { id: 'c', timestampStart: '2024-01-03T10:00:00Z', hostname: 'H3', username: 'u', details: 'three', category: 'exfiltration' },
    ];
    const { map, diff } = buildCompareStatusMap(base, current);
    assert.equal(map.get('c'), 'added');
    assert.equal(map.get('b'), 'changed');
    assert.equal(map.has('a'), false);
    assert.equal(diff.summary.added, 1);
    assert.equal(diff.summary.changed, 1);
  });

  it('returns empty map when timelines match', () => {
    const { map, diff } = buildCompareStatusMap(base, base);
    assert.equal(map.size, 0);
    assert.equal(diff.summary.added, 0);
    assert.equal(diff.summary.changed, 0);
  });
});
