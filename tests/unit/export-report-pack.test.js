import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildReportPackFiles } from '../../js/output/export-report-pack.js';

const sampleTimeline = {
  meta: { title: 'Test Incident', timezone: 'UTC' },
  events: [
    {
      id: 'e1',
      timestampStart: '2024-10-03T10:19:00Z',
      hostname: 'HOST-001',
      username: 'jsmith',
      category: 'initial-access',
      details: 'Phishing email opened',
    },
  ],
};

describe('buildReportPackFiles', () => {
  it('includes markdown, word doc, and readme', () => {
    const files = buildReportPackFiles(sampleTimeline);
    const keys = Object.keys(files);
    assert.ok(keys.some((k) => k.endsWith('.md')));
    assert.ok(keys.some((k) => k.endsWith('.doc')));
    assert.ok(keys.some((k) => k.endsWith('README.txt')));
  });

  it('embeds title in markdown', () => {
    const files = buildReportPackFiles(sampleTimeline);
    const mdKey = Object.keys(files).find((k) => k.endsWith('.md'));
    const text = new TextDecoder().decode(files[mdKey]);
    assert.match(text, /# Test Incident/);
    assert.match(text, /HOST-001/);
  });

  it('includes appendix pdf when bytes provided', () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    const files = buildReportPackFiles(sampleTimeline, { pdfBytes });
    const pdfKey = Object.keys(files).find((k) => k.endsWith('-appendix.pdf'));
    assert.ok(pdfKey);
    assert.deepEqual(files[pdfKey], pdfBytes);
  });

  it('embeds appendix image in word doc when provided', () => {
    const files = buildReportPackFiles(sampleTimeline, {
      appendixImage: 'data:image/jpeg;base64,abc123',
    });
    const docKey = Object.keys(files).find((k) => k.endsWith('.doc'));
    const text = new TextDecoder().decode(files[docKey]);
    assert.match(text, /Timeline appendix/);
    assert.match(text, /abc123/);
  });

  it('includes executive pdf, json, and stix when bytes provided', () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    const executivePdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x02]);
    const jsonBytes = new TextEncoder().encode('{"events":[]}');
    const stixBytes = new TextEncoder().encode('{"type":"bundle"}');
    const files = buildReportPackFiles(sampleTimeline, {
      pdfBytes,
      executivePdfBytes,
      jsonBytes,
      stixBytes,
    });
    const keys = Object.keys(files);
    assert.ok(keys.some((k) => k.endsWith('-executive.pdf')));
    assert.ok(keys.some((k) => k.endsWith('.json')));
    assert.ok(keys.some((k) => k.endsWith('.stix.json')));
  });
});
