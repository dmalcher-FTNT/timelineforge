import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { displayText, normalizeText, truncateWords, wrapSvgLines } from '../../js/design/text-layout.js';

describe('text-layout', () => {
  it('normalizes whitespace and line breaks', () => {
    assert.equal(normalizeText('foo\n\nbar\t baz'), 'foo bar baz');
  });

  it('truncates at word boundaries', () => {
    const long = 'Successful phishing via Teams leads to backdoor installation on the host.';
    const out = truncateWords(long, 40);
    assert.ok(out.endsWith('…'));
    assert.ok(out.length <= 41);
    assert.ok(!out.includes('\n'));
  });

  it('displayText cleans then truncates', () => {
    assert.equal(displayText('  hello\nworld  ', 20), 'hello world');
  });

  it('wrapSvgLines limits line count', () => {
    const lines = wrapSvgLines('one two three four five six seven eight nine ten', 12, 2);
    assert.equal(lines.length, 2);
  });
});
