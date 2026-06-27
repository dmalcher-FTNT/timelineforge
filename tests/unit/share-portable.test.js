import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assessShareLink, MAX_SHARE_URL_LENGTH, normalizeSharePath, prepareTimelineForShare, resolveShareBaseUrl } from '../../js/output/share-link.js';
import { encodeShareLink, encodeLocalShareLink } from '../../js/output/share-encode.js';
import { serializeEventsToSource } from '../../js/input/serialize.js';
import LZString from '../../vendor/lz-string.mjs';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { compressToEncodedURIComponent } = LZString;

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

  it('normalizeSharePath strips index.html and adds trailing slash', () => {
    assert.equal(normalizeSharePath('/timelineforge/index.html'), '/timelineforge/');
    assert.equal(normalizeSharePath('/timelineforge'), '/timelineforge/');
    assert.equal(normalizeSharePath('/'), '/');
  });

  it('resolveShareBaseUrl builds base from current location', () => {
    const local = resolveShareBaseUrl({
      origin: 'http://localhost:8080',
      pathname: '/',
      host: 'localhost:8080',
    });
    assert.equal(local.baseUrl, 'http://localhost:8080/');
    assert.equal(local.host, 'localhost:8080');

    const pages = resolveShareBaseUrl({
      origin: 'https://dmalcher-ftnt.github.io',
      pathname: '/timelineforge/index.html',
      host: 'dmalcher-ftnt.github.io',
    });
    assert.equal(pages.baseUrl, 'https://dmalcher-ftnt.github.io/timelineforge/');
    assert.equal(pages.host, 'dmalcher-ftnt.github.io');
  });

  it('prepareTimelineForShare drops sourceText so loaded samples fit portable URLs', () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
    const timeline = JSON.parse(readFileSync(join(root, 'data/example-timeline.json'), 'utf8'));
    timeline.meta.sourceText = serializeEventsToSource(timeline, 'table');

    const bloated = compressToEncodedURIComponent(JSON.stringify(timeline));
    const before = assessShareLink(bloated, 'https://dmalcher-ftnt.github.io', '/timelineforge/');
    assert.equal(before.tooLarge, true, `bloated link should exceed limit (${before.length})`);

    const slim = prepareTimelineForShare(timeline);
    const compact = compressToEncodedURIComponent(JSON.stringify(slim));
    const after = assessShareLink(compact, 'https://dmalcher-ftnt.github.io', '/timelineforge/');
    assert.equal(after.tooLarge, false, `slim link should fit (${after.length})`);
    assert.match(after.url, /\/timelineforge\/#data=/);
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
