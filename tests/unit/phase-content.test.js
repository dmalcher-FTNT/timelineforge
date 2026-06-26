import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  deriveAttackerObjectives,
  derivePhaseSummary,
  pickMilestones,
  buildTimeAxis,
  timeToPercent,
  deconflictBoxPositions,
  assignIntervalRows,
  eventInterval,
} from '../../js/design/phase-content.js';

const sampleEvents = [
  { id: '1', timestampStart: '2024-10-03T10:00:00Z', phase: 1, category: 'initial-access', details: 'Phishing via Teams leads to backdoor.' },
  { id: '2', timestampStart: '2025-01-10T08:00:00Z', phase: 2, category: 'persistence', details: 'NetAPI backdoor installed.' },
  { id: '3', timestampStart: '2026-04-11T12:00:00Z', phase: 5, category: 'impact', details: 'Wiper deployed via GPO.' },
];

const phases = [
  { id: 1, name: 'Initial', color: '#a' },
  { id: 2, name: 'Persistence', color: '#b' },
  { id: 5, name: 'Impact', color: '#c' },
];

describe('phase-content', () => {
  it('derives objectives from event categories', () => {
    const objs = deriveAttackerObjectives(sampleEvents);
    assert.ok(objs.some((o) => /foothold|persistent|impact/i.test(o)));
  });

  it('derives phase summary from events', () => {
    const summary = derivePhaseSummary(sampleEvents.filter((e) => e.phase === 1));
    assert.match(summary, /Phishing|Initial Access|event/i);
  });

  it('picks milestones across phases', () => {
    const ms = pickMilestones(sampleEvents, phases, 5);
    assert.ok(ms.length >= 2);
    assert.ok(ms.some((e) => e.phase === 1));
  });

  it('builds time axis with months', () => {
    const axis = buildTimeAxis(sampleEvents);
    assert.ok(axis.months.length >= 3);
    assert.ok(axis.years.length >= 2);
  });

  it('deconflicts overlapping box positions', () => {
    const out = deconflictBoxPositions([
      { pct: 10, row: 0 },
      { pct: 12, row: 0 },
      { pct: 50, row: 0 },
    ]);
    assert.ok(out[1].row >= 1 || out[1].pct > out[0].pct);
  });

  it('assigns interval rows for overlapping events', () => {
    const laid = assignIntervalRows([
      { start: 0, end: 100 },
      { start: 50, end: 150 },
      { start: 200, end: 250 },
    ]);
    assert.equal(laid[0].row, 0);
    assert.equal(laid[1].row, 1);
    assert.equal(laid[2].row, 0);
    assert.equal(laid[0].laneRowCount, 2);
  });

  it('parses event intervals', () => {
    const iv = eventInterval({ timestampStart: '2024-01-01T00:00:00Z', timestampEnd: '2024-01-02T00:00:00Z' });
    assert.ok(iv.end > iv.start);
  });

  it('maps time to percent', () => {
    assert.equal(timeToPercent(50, 0, 100), 50);
    assert.ok(timeToPercent(0, 0, 100) >= 2);
  });
});
