import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { defaultPhasesCopy, findPhase, resolvePhases } from '../../js/phases.js';
import { PHASES } from '../../js/utils.js';

describe('phases', () => {
  it('returns defaults when no custom phases', () => {
    assert.equal(resolvePhases({}).length, PHASES.length);
  });

  it('uses custom phase names and colors', () => {
    const custom = [{ id: 1, name: 'Recon', color: '#111111', range: 'Q1' }];
    const phases = resolvePhases({ customPhases: custom });
    assert.equal(phases[0].name, 'Recon');
    assert.equal(phases[0].color, '#111111');
  });

  it('findPhase falls back to first phase', () => {
    const phases = defaultPhasesCopy();
    assert.equal(findPhase(phases, 999).id, phases[0].id);
  });
});
