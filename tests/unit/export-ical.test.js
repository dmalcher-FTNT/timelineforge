import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildICalContent } from '../../js/output/export-ical.js';

const sample = {
  meta: { title: 'Test Incident' },
  events: [
    {
      id: 'evt-1',
      timestampStart: '2024-01-01T10:00:00Z',
      timestampEnd: '2024-01-01T11:00:00Z',
      hostname: 'HOST-A',
      username: 'user1',
      details: 'Phishing email opened',
      category: 'initial-access',
      technique: 'T1566',
      source: 'EDR',
      evidence: 'alert-123',
    },
    {
      id: 'evt-2',
      timestampStart: '2024-01-02T08:00:00Z',
      timestampEnd: null,
      hostname: 'HOST-B',
      username: 'N/A',
      details: 'Lateral movement',
      category: 'lateral-movement',
    },
  ],
};

describe('buildICalContent', () => {
  it('produces a valid VCALENDAR wrapper', () => {
    const ics = buildICalContent(sample);
    assert.match(ics, /^BEGIN:VCALENDAR/);
    assert.match(ics, /END:VCALENDAR$/);
    assert.match(ics, /VERSION:2\.0/);
    assert.match(ics, /X-WR-CALNAME:Test Incident/);
  });

  it('includes VEVENT blocks with UID and DTSTART', () => {
    const ics = buildICalContent(sample);
    const events = ics.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
    assert.equal(events.length, 2);
    assert.match(events[0], /UID:evt-1@timelineforge/);
    assert.match(events[0], /DTSTART:20240101T100000Z/);
    assert.match(events[0], /DTEND:20240101T110000Z/);
    assert.match(events[0], /SUMMARY:HOST-A/);
    assert.match(events[0], /LOCATION:HOST-A/);
  });

  it('folds long DESCRIPTION lines', () => {
    const long = {
      meta: { title: 'Long' },
      events: [{
        id: 'x',
        timestampStart: '2024-01-01T10:00:00Z',
        hostname: 'H',
        username: 'u',
        details: 'A'.repeat(120),
        category: 'impact',
      }],
    };
    const ics = buildICalContent(long);
    assert.match(ics, /DESCRIPTION:[\s\S]*?\r\n /);
  });
});
