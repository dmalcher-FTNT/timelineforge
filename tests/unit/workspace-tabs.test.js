import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WORKSPACE_STEPS, workspaceLabel, workspaceStep } from '../../js/workspace-tabs.js';

describe('workspace tabs', () => {
  it('defines Collect, Refine, Deliver in order', () => {
    assert.deepEqual(WORKSPACE_STEPS.map((s) => s.label), ['Collect', 'Refine', 'Deliver']);
    assert.deepEqual(WORKSPACE_STEPS.map((s) => s.id), ['input', 'edit', 'publish']);
  });

  it('resolves labels by internal id', () => {
    assert.equal(workspaceLabel('publish'), 'Deliver');
    assert.equal(workspaceStep('edit')?.num, 2);
  });
});
