import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { pageForEventIndex, stepEventIndex } from '../../js/edit/event-focus.js';
import { shareModeHint } from '../../js/output/share-pack.js';

describe('event-focus', () => {
  it('computes page for event index', () => {
    assert.equal(pageForEventIndex(0, 50), 1);
    assert.equal(pageForEventIndex(49, 50), 1);
    assert.equal(pageForEventIndex(50, 50), 2);
  });

  it('steps event index with clamping', () => {
    assert.equal(stepEventIndex(-1, 1, 10), 0);
    assert.equal(stepEventIndex(0, -1, 10), 0);
    assert.equal(stepEventIndex(9, 1, 10), 9);
    assert.equal(stepEventIndex(5, 1, 10), 6);
  });
});

describe('share-pack hints', () => {
  it('describes compressed inline share links', () => {
    assert.match(shareModeHint('inline'), /Compressed portable link/i);
    assert.match(shareModeHint('inline', 'example.com'), /example.com/);
  });
});
