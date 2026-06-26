import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assessShareLink, MAX_SHARE_URL_LENGTH } from '../../js/output/share-link.js';
import { encodeShareLink, encodeLocalShareLink } from '../../js/output/share-encode.js';

describe('share link portable', () => {
  it('allows URLs up to 8k chars', () => {
    assert.equal(MAX_SHARE_URL_LENGTH, 8000);
    const payload = 'x'.repeat(7900);
    const result = assessShareLink(payload, 'http://localhost:8080', '/');
    assert.equal(result.tooLarge, false);
  });

  it('flags URLs over max length', () => {
    const long = 'x'.repeat(MAX_SHARE_URL_LENGTH + 100);
    const result = assessShareLink(long, 'http://localhost:8080', '/');
    assert.equal(result.tooLarge, true);
  });

  it('encodeShareLink returns portable inline for small timelines', async () => {
    const timeline = {
      meta: { title: 'Test', version: 1 },
      events: [{ id: 'e1', timestampStart: '2024-01-01T00:00:00Z', details: 'A', category: 'impact', phase: 1 }],
    };
    const result = await encodeShareLink(timeline);
    assert.equal(result.tooLarge, false);
    assert.equal(result.mode, 'inline');
    assert.match(result.url, /#data=/);
  });

  it('encodeShareLink never returns stored mode (use encodeLocalShareLink for bookmarks)', async () => {
    const events = Array.from({ length: 120 }, (_, i) => ({
      id: `e${i}`,
      details: `Event ${i} with enough text to inflate compressed payload size significantly for testing portable limits.`,
      timestampStart: `2024-01-${String((i % 28) + 1).padStart(2, '0')}T10:00:00Z`,
      category: 'impact',
      phase: (i % 5) + 1,
    }));
    const result = await encodeShareLink({ meta: { title: 'Big', version: 1 }, events });
    assert.notEqual(result.mode, 'stored');
  });

  it('exports local bookmark helper', () => {
    assert.equal(typeof encodeLocalShareLink, 'function');
  });
});
