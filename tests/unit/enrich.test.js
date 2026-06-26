import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { enrichEvents, linkSequentialEvents } from '../../js/edit/enrich.js';

describe('linkSequentialEvents', () => {
  it('chains adjacent events when no links exist', () => {
    const events = [
      { id: 'a', details: 'one' },
      { id: 'b', details: 'two' },
      { id: 'c', details: 'three' },
    ];
    const linked = linkSequentialEvents(events);
    assert.deepEqual(linked[0].linkedEventIds, ['b']);
    assert.deepEqual(linked[1].linkedEventIds, ['c']);
    assert.deepEqual(linked[2].linkedEventIds, []);
  });

  it('preserves existing links', () => {
    const events = [
      { id: 'a', linkedEventIds: ['c'] },
      { id: 'b' },
      { id: 'c' },
    ];
    const linked = linkSequentialEvents(events);
    assert.deepEqual(linked[0].linkedEventIds, ['c']);
    assert.deepEqual(linked[1].linkedEventIds, ['c']);
  });
});

describe('enrichEvents', () => {
  it('infers technique and phase without auto-link', () => {
    const events = [{ id: 'x', details: 'phishing email opened', category: 'initial-access' }];
    const out = enrichEvents(events);
    assert.ok(out[0].technique || out[0].phase);
    assert.deepEqual(out[0].linkedEventIds, []);
  });
});
