import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { eventFingerprint, mergeTimelineEvents } from '../../js/edit/merge-events.js';

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
