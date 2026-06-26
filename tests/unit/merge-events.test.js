import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { eventFingerprint, mergeTimelineEvents, collapseDuplicateEvents, countDuplicateEvents } from '../../js/edit/merge-events.js';

const base = {
  id: 'evt-1',
  timestampStart: '2024-01-01T10:00:00Z',
  hostname: 'HOST-A',
  username: 'user1',
  details: 'Phishing email',
};

describe('mergeTimelineEvents', () => {
  it('dedupes matching events by default', () => {
    const incoming = [{ ...base, id: 'evt-2' }];
    const merged = mergeTimelineEvents([base], incoming);
    assert.equal(merged.length, 1);
  });

  it('appends when dedupe is off', () => {
    const incoming = [{ ...base, id: 'evt-2' }];
    const merged = mergeTimelineEvents([base], incoming, { dedupe: false });
    assert.equal(merged.length, 2);
  });

  it('fingerprints on timestamp host and details', () => {
    assert.ok(eventFingerprint(base).includes('HOST-A'));
  });
});

describe('collapseDuplicateEvents', () => {
  it('removes duplicate rows and keeps first occurrence', () => {
    const dupe = { ...base, id: 'evt-2', tags: ['extra'] };
    const { events, removed } = collapseDuplicateEvents([base, dupe]);
    assert.equal(removed, 1);
    assert.equal(events.length, 1);
    assert.equal(events[0].id, 'evt-1');
    assert.ok(events[0].tags.includes('extra'));
  });

  it('reports zero when no duplicates', () => {
    const other = { ...base, id: 'evt-2', details: 'Different activity' };
    const { removed } = collapseDuplicateEvents([base, other]);
    assert.equal(removed, 0);
  });
});

describe('countDuplicateEvents', () => {
  it('counts rows that would be removed', () => {
    const dupe = { ...base, id: 'evt-2' };
    assert.equal(countDuplicateEvents([base, dupe, dupe]), 2);
  });
});
