import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseInputHint } from '../../js/input/parser.js';

describe('parseInputHint', () => {
  it('returns mode-specific guidance', () => {
    assert.match(parseInputHint('manual'), /date/i);
    assert.match(parseInputHint('json'), /events/i);
  });
});
