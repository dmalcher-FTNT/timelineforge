import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseManualSnippets, parseMarkdownTable, parseGenericJSON } from '../../js/input/parser.js';
import {
  eventsToManualSnippets,
  eventsToStructuredJson,
  serializeEventsToSource,
  sourceFormatForInputMode,
} from '../../js/input/serialize.js';

describe('serialize round-trip', () => {
  const timeline = {
    meta: { title: 'Test', timezone: 'UTC' },
    events: [
      {
        id: 'evt-1',
        timestampStart: '2024-10-03T10:19:00.000Z',
        timestampEnd: null,
        hostname: 'HOST-001',
        username: 'DOMAIN\\alice',
        details: 'Phishing via Teams',
        category: 'initial-access',
        phase: 1,
        technique: 'T1566',
        source: 'EDR',
        evidence: '',
        linkedEventIds: [],
        tags: ['phish'],
      },
    ],
  };

  it('manual snippets round-trip core fields', () => {
    const text = eventsToManualSnippets(timeline.events, 'UTC');
    assert.match(text, /HOST-001/);
    assert.match(text, /Phishing via Teams/);
    const parsed = parseManualSnippets(text);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].hostname, 'HOST-001');
    assert.match(parsed[0].details, /Phishing/);
  });

  it('markdown table round-trip', () => {
    const text = serializeEventsToSource(timeline, 'table');
    assert.match(text, /\| DATE\/TIME \|/);
    const parsed = parseMarkdownTable(text);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].hostname, 'HOST-001');
  });

  it('structured JSON round-trip preserves extended fields', () => {
    const text = eventsToStructuredJson(timeline);
    const parsed = parseGenericJSON(text);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].technique, 'T1566');
    assert.deepEqual(parsed[0].tags, ['phish']);
  });

  it('maps import modes to structured format', () => {
    assert.equal(sourceFormatForInputMode('import'), 'structured');
    assert.equal(sourceFormatForInputMode('report'), 'structured');
    assert.equal(sourceFormatForInputMode('manual'), 'manual');
    assert.equal(sourceFormatForInputMode('table'), 'table');
  });
});
