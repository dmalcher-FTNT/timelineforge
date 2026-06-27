/** Workspace step labels (internal ids: input / edit / publish). */
export const WORKSPACE_STEPS = [
  { id: 'input', num: 1, label: 'Collect', subtitle: 'Import & paste evidence', icon: '📥' },
  { id: 'edit', num: 2, label: 'Refine', subtitle: 'Events, filters & quality', icon: '📋' },
  { id: 'publish', num: 3, label: 'Deliver', subtitle: 'Layouts & exports', icon: '📤' },
];

export function workspaceStep(id) {
  return WORKSPACE_STEPS.find((s) => s.id === id);
}

export function workspaceLabel(id) {
  return workspaceStep(id)?.label ?? id;
}
