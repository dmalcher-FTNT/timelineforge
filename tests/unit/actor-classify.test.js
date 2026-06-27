import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { classifyEventActor, actorLaneLabel } from '../../js/edit/actor-classify.js';

describe('classifyEventActor', () => {
  it('marks detection category as defender', () => {
    assert.equal(classifyEventActor({ category: 'detection', details: 'EDR alert' }), 'defender');
  });

  it('marks containment tags as defender', () => {
    assert.equal(classifyEventActor({ category: 'impact', tags: ['containment'], details: 'Host isolated' }), 'defender');
  });

  it('defaults to attacker for offensive events', () => {
    assert.equal(classifyEventActor({ category: 'initial-access', details: 'Phishing email opened' }), 'attacker');
  });

  it('labels lanes', () => {
    assert.equal(actorLaneLabel('defender'), 'Defender response');
    assert.equal(actorLaneLabel('attacker'), 'Attacker actions');
  });
});
