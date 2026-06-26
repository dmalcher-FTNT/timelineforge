import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDocxHtml } from '../../js/output/export-docx.js';

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

describe('buildDocxHtml', () => {
  it('includes title and event table', () => {
    const html = buildDocxHtml(sampleTimeline);
    assert.match(html, /Test Incident/);
    assert.match(html, /HOST-001/);
    assert.match(html, /Event data/);
  });

  it('embeds appendix image when provided', () => {
    const html = buildDocxHtml(sampleTimeline, 'data:image/jpeg;base64,abc123');
    assert.match(html, /Timeline appendix/);
    assert.match(html, /data:image\/jpeg;base64,abc123/);
    assert.match(html, /width="720"/);
  });

  it('omits appendix section without image', () => {
    const html = buildDocxHtml(sampleTimeline, null);
    assert.doesNotMatch(html, /Timeline appendix/);
  });
});
