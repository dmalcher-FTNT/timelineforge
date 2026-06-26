import { PHASES } from './utils.js';

export function resolvePhases(meta) {
  if (meta?.customPhases?.length) {
    return meta.customPhases.map(normalizePhase);
  }
  return PHASES;
}

export function normalizePhase(phase) {
  return {
    id: Number(phase.id) || 1,
    name: phase.name || `Phase ${phase.id}`,
    color: phase.color || '#64748b',
    range: phase.range || '',
  };
}

export function defaultPhasesCopy() {
  return PHASES.map((p) => ({ ...p }));
}

export function findPhase(phases, phaseId) {
  return phases.find((p) => p.id === phaseId) || phases[0];
}
