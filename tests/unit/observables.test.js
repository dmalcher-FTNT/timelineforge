import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractObservables, observablesToCsv } from '../../js/edit/observables.js';

const events = [
  {
    id: 'e1',
    timestampStart: '2024-01-01T10:00:00Z',
    hostname: 'HOST-01',
    username: 'user',
    details: 'Phishing link https://evil.example.com/path downloaded malware.exe hash deadbeefdeadbeefdeadbeefdeadbeef',
    evidence: 'Contact 203.0.113.50 and analyst@corp.com',
  },
  {
    id: 'e2',
    timestampStart: '2024-01-02T10:00:00Z',
    hostname: 'HOST-02',
    username: 'user',
    details: 'Same hash deadbeefdeadbeefdeadbeefdeadbeef seen again',
  },
];

describe('extractObservables', () => {
  it('extracts ips, urls, domains, emails, and hashes', () => {
    const obs = extractObservables(events);
    assert.ok(obs.ips.some((r) => r.value === '203.0.113.50'));
    assert.ok(obs.urls.some((r) => r.value.startsWith('https://evil.example.com')));
    assert.ok(obs.emails.some((r) => r.value === 'analyst@corp.com'));
    assert.ok(obs.hashes.some((r) => r.value === 'deadbeefdeadbeefdeadbeefdeadbeef'));
    assert.equal(obs.hashes[0].eventCount, 2);
  });

  it('exports csv rows', () => {
    const csv = observablesToCsv(extractObservables(events));
    assert.match(csv, /^type,value,event_count,event_numbers/);
    assert.match(csv, /203\.0\.113\.50/);
  });
});
