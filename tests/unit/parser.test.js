import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseMarkdownTable, processInput } from '../../js/input/parser.js';

describe('parser', () => {
  it('parses markdown table rows', () => {
    const text = `| DATE/TIME | HOSTNAME | USERNAME | DETAILS |
| --- | --- | --- | --- |
| 2024-10-03 10:19 | HOST-001 | user1 | Phishing email |`;
    const events = parseMarkdownTable(text);
    assert.equal(events.length, 1);
    assert.equal(events[0].hostname, 'HOST-001');
    assert.match(events[0].timestampStart, /2024/);
  });

  it('parses manual snippet lines via processInput', () => {
    const text = '2024-10-03 10:19 — HOST-001 — Initial access via phishing';
    const events = processInput({ mode: 'manual', text });
    assert.equal(events.length, 1);
    assert.equal(events[0].hostname, 'HOST-001');
  });
});
