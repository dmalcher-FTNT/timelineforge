import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  APPENDIX_MAX_EVENTS,
  APPENDIX_TWO_COLUMN_MIN,
  splitEventColumns,
} from '../../js/design/appendix-timeline.js';

describe('splitEventColumns', () => {
  it('keeps single column at or below threshold', () => {
    const events = Array.from({ length: APPENDIX_TWO_COLUMN_MIN }, (_, i) => ({ id: String(i) }));
    const { left, right } = splitEventColumns(events);
    assert.equal(left.length, APPENDIX_TWO_COLUMN_MIN);
    assert.equal(right.length, 0);
  });

  it('splits into two balanced columns above threshold', () => {
    const events = Array.from({ length: APPENDIX_TWO_COLUMN_MIN + 1 }, (_, i) => ({ id: String(i) }));
    const { left, right } = splitEventColumns(events);
    assert.equal(left.length, 10);
    assert.equal(right.length, 10);
    assert.equal(left.length + right.length, events.length);
  });

  it('respects max event cap constant for documentation', () => {
    assert.equal(APPENDIX_MAX_EVENTS, 40);
  });
});
