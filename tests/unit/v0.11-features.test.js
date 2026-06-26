import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assessShareLink, MAX_SHARE_URL_LENGTH } from '../../js/output/share-link.js';
import { formatDate } from '../../js/utils.js';
import { resolveTimezone, timezoneLabel, timezoneShortLabel } from '../../js/timezones.js';

describe('share link', () => {
  it('flags URLs over max length', () => {
    const long = 'x'.repeat(MAX_SHARE_URL_LENGTH + 100);
    const result = assessShareLink(long, 'http://localhost:8080', '/');
    assert.equal(result.tooLarge, true);
    assert.ok(result.length > MAX_SHARE_URL_LENGTH);
  });

  it('accepts short URLs', () => {
    const result = assessShareLink('abc123', 'http://localhost:8080', '/');
    assert.equal(result.tooLarge, false);
    assert.match(result.url, /#data=abc123/);
  });
});

describe('timezone', () => {
  it('formats dates in selected timezone', () => {
    const s = formatDate('2024-06-15T12:00:00Z', { timezone: 'America/New_York', seconds: false });
    assert.match(s, /2024/);
    assert.doesNotMatch(s, / UTC$/);
  });

  it('defaults to UTC', () => {
    assert.equal(resolveTimezone({}), 'UTC');
    assert.match(timezoneLabel('Europe/London'), /London/);
    assert.equal(timezoneShortLabel('America/New_York'), 'ET');
    assert.equal(timezoneShortLabel('Europe/Berlin'), 'Berlin');
  });
});
