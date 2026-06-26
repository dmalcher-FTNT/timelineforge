import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCyberChef } from '../../js/input/cyberchef.js';
import { diffToCSV, diffToMarkdown } from '../../js/output/diff-export.js';
import { diffTimelines } from '../../js/edit/timeline-diff.js';
import {
  canRedo,
  canUndo,
  createHistory,
  pushHistoryState,
  redoHistory,
  undoHistory,
} from '../../js/edit/history.js';

describe('parseCyberChef', () => {
  it('parses JSON array of events', () => {
    const json = JSON.stringify([
      { Time: '2024-01-01 10:00', Host: 'HOST-A', Message: 'Login failed' },
      { Time: '2024-01-02 11:00', Host: 'HOST-B', Message: 'Malware detected' },
    ]);
    const events = parseCyberChef(json);
    assert.equal(events.length, 2);
    assert.equal(events[0].hostname, 'HOST-A');
    assert.ok(events[0].tags.includes('cyberchef'));
  });

  it('parses CSV table output', () => {
    const csv = 'date,hostname,user,details\n2024-03-01,WS-1,alice,Phishing click';
    const events = parseCyberChef(csv);
    assert.equal(events.length, 1);
    assert.equal(events[0].username, 'alice');
  });
});

describe('diff export', () => {
  const base = [{ id: 'e1', timestampStart: '2024-01-01T00:00:00Z', hostname: 'A', details: 'old' }];
  const current = [{ id: 'e1', timestampStart: '2024-01-01T00:00:00Z', hostname: 'A', details: 'new' }];
  const diff = diffTimelines(base, current);

  it('formats markdown diff', () => {
    const md = diffToMarkdown(diff);
    assert.match(md, /Changed/);
    assert.match(md, /details/);
  });

  it('formats csv diff', () => {
    const csv = diffToCSV(diff);
    assert.match(csv, /changed/);
    assert.match(csv, /details/);
  });
});

describe('history', () => {
  it('supports undo and redo', () => {
    const hist = createHistory({ events: [{ id: '1' }] });
    pushHistoryState(hist, { events: [{ id: '1' }, { id: '2' }] });
    assert.equal(canUndo(hist), true);
    const prev = undoHistory(hist);
    assert.equal(prev.events.length, 1);
    assert.equal(canRedo(hist), true);
    const next = redoHistory(hist);
    assert.equal(next.events.length, 2);
  });
});
