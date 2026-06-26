import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { diffTimelines, formatDiffSummary } from '../../js/edit/timeline-diff.js';

const base = [
  {
    id: 'evt-1',
    timestampStart: '2024-01-01T10:00:00Z',
    hostname: 'HOST-A',
    details: 'Phishing email',
    category: 'initial-access',
    phase: 1,
  },
  {
    id: 'evt-2',
    timestampStart: '2024-01-02T12:00:00Z',
    hostname: 'HOST-B',
    details: 'Malware drop',
    category: 'persistence',
    phase: 2,
  },
];

describe('diffTimelines', () => {
  it('detects added and removed events', () => {
    const current = [
      base[0],
      { ...base[1], id: 'evt-3', details: 'New lateral move', hostname: 'HOST-C' },
    ];
    const diff = diffTimelines(base, current);
    assert.equal(diff.summary.added, 1);
    assert.equal(diff.summary.removed, 1);
    assert.equal(diff.added[0].id, 'evt-3');
    assert.equal(diff.removed[0].id, 'evt-2');
  });

  it('detects changed fields on matched ids', () => {
    const current = [{ ...base[0], details: 'Updated phishing details', phase: 2 }];
    const diff = diffTimelines(base, current);
    assert.equal(diff.summary.changed, 1);
    assert.equal(diff.changed[0].diffs.some((d) => d.field === 'details'), true);
    assert.equal(diff.changed[0].diffs.some((d) => d.field === 'phase'), true);
  });

  it('reports unchanged when timelines match', () => {
    const diff = diffTimelines(base, structuredClone(base));
    assert.equal(diff.summary.added, 0);
    assert.equal(diff.summary.removed, 0);
    assert.equal(diff.summary.changed, 0);
    assert.equal(diff.summary.unchanged, 2);
    assert.equal(formatDiffSummary(diff), 'Timelines match');
  });

  it('matches by timestamp and hostname when ids differ', () => {
    const current = [{ ...base[0], id: 'evt-new', details: 'Same event new id' }];
    const diff = diffTimelines(base, current);
    assert.equal(diff.summary.changed, 1);
    assert.equal(diff.summary.added, 0);
  });
});
