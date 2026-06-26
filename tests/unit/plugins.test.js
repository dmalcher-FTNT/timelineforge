import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { listCustomRenderers, registerRenderer, loadBuiltinPlugins } from '../../js/design/plugins.js';

describe('plugins', () => {
  it('registers and lists custom renderers', () => {
    const before = listCustomRenderers().length;
    registerRenderer('test-plugin', {
      label: 'Test Plugin',
      desc: 'For unit tests',
      render() {},
    });
    const list = listCustomRenderers();
    assert.ok(list.length >= before + 1);
    assert.ok(list.some((p) => p.id === 'test-plugin'));
  });

  it('exposes global TimelineForge hook', () => {
    assert.equal(typeof globalThis.TimelineForge?.registerRenderer, 'function');
  });

  it('auto-loads data/plugins modules', async () => {
    await loadBuiltinPlugins();
    assert.ok(listCustomRenderers().some((p) => p.id === 'minimal-list'));
  });
});
