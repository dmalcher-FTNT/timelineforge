/** @typedef {{ label: string, desc?: string, render: (container: HTMLElement, ctx: object) => void }} PluginRenderer */

const customRenderers = new Map();

/**
 * Register a custom visualization renderer (plugin API).
 * @param {string} id
 * @param {PluginRenderer} spec
 */
export function registerRenderer(id, spec) {
  if (!id || typeof spec?.render !== 'function') {
    throw new Error('registerRenderer requires id and render function');
  }
  customRenderers.set(id, {
    label: spec.label || id,
    desc: spec.desc || '',
    render: spec.render,
  });
}

export function getCustomRenderer(id) {
  return customRenderers.get(id) || null;
}

export function listCustomRenderers() {
  return [...customRenderers.entries()].map(([id, spec]) => ({
    id,
    label: spec.label,
    desc: spec.desc,
  }));
}

/** Load all modules listed in data/plugins/index.js. */
export async function loadBuiltinPlugins() {
  const { loadAllDataPlugins } = await import('../../data/plugins/index.js');
  await loadAllDataPlugins();
}

/** Expose hook for external scripts loaded before bootstrap. */
if (typeof globalThis !== 'undefined') {
  globalThis.TimelineForge = globalThis.TimelineForge || {};
  globalThis.TimelineForge.registerRenderer = registerRenderer;
}
