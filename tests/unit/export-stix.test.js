import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { timelineToStixBundle, stixBundleJson, stixBundleBytes } from '../../js/output/export-stix.js';

const sample = {
  meta: { title: 'Test Incident', organization: 'Acme IR' },
  events: [
    {
      id: 'evt-1',
      timestampStart: '2024-01-01T10:00:00Z',
      timestampEnd: null,
      hostname: 'HOST-A',
      username: 'user1',
      details: 'Phishing email',
      category: 'initial-access',
      phase: 1,
      technique: 'T1566',
      tags: ['critical'],
    },
  ],
};

describe('timelineToStixBundle', () => {
  it('produces a valid STIX 2.1 bundle', () => {
    const bundle = timelineToStixBundle(sample);
    assert.equal(bundle.type, 'bundle');
    assert.ok(Array.isArray(bundle.objects));
    assert.ok(bundle.objects.length >= 3);
  });

  it('includes report and observed-data per event', () => {
    const bundle = timelineToStixBundle(sample);
    const report = bundle.objects.find((o) => o.type === 'report');
    const observed = bundle.objects.filter((o) => o.type === 'observed-data');
    assert.ok(report);
    assert.equal(observed.length, 1);
    assert.equal(observed[0].objects['0'].technique, 'T1566');
    assert.equal(report.x_timelineforge_event_count, 1);
  });

  it('includes MITRE external reference when technique set', () => {
    const bundle = timelineToStixBundle(sample);
    const observed = bundle.objects.find((o) => o.type === 'observed-data');
    assert.ok(observed.external_references?.[0]?.external_id === 'T1566');
  });

  it('links report to identity via created_by_ref', () => {
    const bundle = timelineToStixBundle(sample);
    const report = bundle.objects.find((o) => o.type === 'report');
    const identity = bundle.objects.find((o) => o.type === 'identity');
    assert.equal(report.created_by_ref, identity.id);
  });

  it('serializes to JSON via stixBundleJson', () => {
    const json = stixBundleJson(sample);
    assert.match(json, /"type": "bundle"/);
    assert.ok(stixBundleBytes(sample).length > json.length / 2);
  });
});
