import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { anonymizeTimeline, scanTimeline } from '../../js/edit/anonymize.js';

const sample = {
  meta: { title: 'SERVER-ALPHA incident', subtitle: '' },
  events: [{
    id: 'evt-1',
    timestampStart: '2024-01-01T00:00:00Z',
    hostname: 'SERVER-ALPHA',
    username: 'CORP\\alice',
    details: 'Contact from 10.0.0.5 and alice@corp.local',
    category: 'initial-access',
    phase: 1,
    tags: [],
  }],
};

describe('anonymize', () => {
  it('finds hosts, users, ips, emails', () => {
    const scan = scanTimeline(sample);
    assert.ok(scan.hosts.includes('SERVER-ALPHA'));
    assert.ok(scan.ips.includes('10.0.0.5'));
    assert.ok(scan.emails.includes('alice@corp.local'));
  });

  it('replaces identifiers in timeline', () => {
    const { timeline } = anonymizeTimeline(sample);
    assert.equal(timeline.meta.anonymized, true);
    assert.doesNotMatch(timeline.events[0].hostname, /SERVER-ALPHA/);
    assert.doesNotMatch(timeline.events[0].details, /10\.0\.0\.5/);
  });
});
