import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { dedupeEventDetails, displayEventDetails, narrativeFromManualLine } from '../../js/event-details.js';
import { normalizeEvent, parseManualSnippets } from '../../js/input/parser.js';

describe('dedupeEventDetails', () => {
  it('strips repeated timestamp, host, and user prefix from details', () => {
    const event = {
      timestampStart: '2024-10-03T10:19:53Z',
      hostname: 'HOST-001',
      username: 'DOMAIN\\USER-001',
      details: '2024-10-03 10:19:53 — HOST-001 — DOMAIN\\USER-001 — Successful phishing via Teams.',
    };
    assert.equal(
      dedupeEventDetails(event),
      'Successful phishing via Teams.',
    );
  });

  it('strips leading "and" plus embedded date and N/A placeholders', () => {
    const event = {
      timestampStart: '2025-04-02T22:24:36Z',
      timestampEnd: '2025-04-13T10:36:34Z',
      hostname: 'HOST-006',
      username: 'N/A',
      details: 'and 2025-04-13 10:36:34 — N/A — Web server logs show threat actor browsing the website running on this host. Source IP: EXTERNAL-IP-001.',
    };
    assert.equal(
      dedupeEventDetails(event),
      'Web server logs show threat actor browsing the website running on this host. Source IP: EXTERNAL-IP-001.',
    );
  });

  it('leaves narrative-only details unchanged', () => {
    const event = {
      timestampStart: '2024-10-03T10:19:53Z',
      hostname: 'HOST-001',
      username: 'DOMAIN\\USER-001',
      details: 'Successful phishing via Teams. User downloaded a malicious ZIP.',
    };
    assert.equal(dedupeEventDetails(event), event.details);
  });

  it('displayEventDetails truncates after dedupe', () => {
    const long = 'A'.repeat(200);
    const out = displayEventDetails({
      timestampStart: '2024-01-01T00:00:00Z',
      hostname: 'H1',
      username: 'u',
      details: long,
    }, 40);
    assert.ok(out.length <= 41);
  });
});

describe('parseManualSnippets', () => {
  it('stores narrative without repeating structured columns', () => {
    const [event] = parseManualSnippets(
      '2024-10-03 10:19 — HOST-001 — DOMAIN\\USER-001 — Malware executed from phishing attachment.',
    );
    assert.equal(event.hostname, 'HOST-001');
    assert.equal(event.username, 'DOMAIN\\USER-001');
    assert.match(event.details, /Malware executed/i);
    assert.doesNotMatch(event.details, /HOST-001.*HOST-001/);
    assert.doesNotMatch(event.details, /2024-10-03 10:19/);
  });

  it('parses date ranges with "and" and N/A host without leaking metadata into details', () => {
    const [event] = parseManualSnippets(
      '2025-04-02 22:24:36 and 2025-04-13 10:36:34 — N/A — Web server logs show threat actor browsing the website running on this host. Source IP: EXTERNAL-IP-001.',
    );
    assert.equal(event.hostname, 'N/A');
    assert.equal(event.timestampEnd, '2025-04-13T10:36:34.000Z');
    assert.equal(
      event.details,
      'Web server logs show threat actor browsing the website running on this host. Source IP: EXTERNAL-IP-001.',
    );
    assert.doesNotMatch(event.details, /\band\b/i);
    assert.doesNotMatch(event.details, /2025-04-13/);
    assert.doesNotMatch(event.details, /N\/A/);
  });
});

describe('normalizeEvent', () => {
  it('dedupes details on import', () => {
    const event = normalizeEvent({
      timestampStart: '2024-10-03T10:19:53Z',
      hostname: 'HOST-002',
      username: 'DOMAIN\\USER-002',
      details: '03 Oct 2024 10:19 UTC | HOST-002 | DOMAIN\\USER-002 | Credential stealer deployed.',
    });
    assert.match(event.details, /Credential stealer/i);
    assert.doesNotMatch(event.details, /\| HOST-002 \|/);
  });
});

describe('narrativeFromManualLine', () => {
  it('extracts trailing narrative from a manual line', () => {
    const text = narrativeFromManualLine(
      '2024-11-14 08:05:02 HOST-004 DOMAIN\\USER-003 Lateral movement over RDP.',
      {
        timestampStart: '2024-11-14T08:05:02Z',
        hostname: 'HOST-004',
        username: 'DOMAIN\\USER-003',
      },
    );
    assert.match(text, /Lateral movement/i);
    assert.doesNotMatch(text, /HOST-004/);
  });
});
