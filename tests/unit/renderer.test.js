import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeVizStyle } from '../../js/design/renderer.js';

describe('normalizeVizStyle', () => {
  it('maps legacy style ids to current names', () => {
    assert.equal(normalizeVizStyle('icons'), 'default');
    assert.equal(normalizeVizStyle('fahrplan'), 'metro');
    assert.equal(normalizeVizStyle('mermaid'), 'sequence');
    assert.equal(normalizeVizStyle('retro'), 'default');
    assert.equal(normalizeVizStyle('scribing'), 'default');
    assert.equal(normalizeVizStyle('gantt'), 'gantt');
  });
});
