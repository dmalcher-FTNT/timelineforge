/** DESIGN tab — audience-first gallery mapping to vizType + vizStyle. */

export const DESIGN_AUDIENCES = [
  { id: 'all', label: 'All' },
  { id: 'analyst', label: 'Analyst' },
  { id: 'ir-lead', label: 'IR Lead' },
  { id: 'executive', label: 'Executive' },
  { id: 'report', label: 'Report' },
  { id: 'tech', label: 'Tech' },
];

/**
 * @typedef {Object} DesignLayout
 * @property {string} id
 * @property {string} label
 * @property {string} tagline
 * @property {string} desc
 * @property {string[]} audiences
 * @property {string} [family] — groups related layouts (e.g. case-file)
 * @property {string} thumb — CSS modifier for gallery thumbnail
 * @property {string} vizType
 * @property {string} [vizStyle]
 * @property {string[]} [exportHints] — OUTPUT export type ids to highlight
 */

/** @type {DesignLayout[]} */
export const DESIGN_LAYOUTS = [
  {
    id: 'horizon-strip',
    label: 'Horizon strip',
    tagline: 'Density at a glance',
    desc: 'Compact activity density chart — ideal for war-room triage and spotting hot phases.',
    audiences: ['ir-lead'],
    thumb: 'horizon',
    vizType: 'activity-strip',
    vizStyle: 'default',
    exportHints: ['png', 'pdf'],
  },
  {
    id: 'swimlane-timeline',
    label: 'Swimlane timeline',
    tagline: 'Time × kill-chain phase',
    desc: 'Shared time axis with events grouped by phase — the standard IR commander view.',
    audiences: ['ir-lead'],
    thumb: 'swimlane',
    vizType: 'incident-overview',
    vizStyle: 'default',
    exportHints: ['png', 'pdf', 'pptx'],
  },
  {
    id: 'gantt-phases',
    label: 'Gantt phases',
    tagline: 'Durations and overlaps',
    desc: 'Time-range bars stacked by kill-chain phase — shows concurrent activity clearly.',
    audiences: ['ir-lead'],
    thumb: 'gantt',
    vizType: 'soc-details',
    vizStyle: 'gantt',
    exportHints: ['png', 'pdf'],
  },
  {
    id: 'kill-chain-board',
    label: 'Kill-chain board',
    tagline: 'Phase coverage at a glance',
    desc: 'Five phase columns with milestone spine — quick coverage check across the attack lifecycle.',
    audiences: ['ir-lead'],
    thumb: 'columns',
    vizType: 'phase-columns',
    vizStyle: 'default',
    exportHints: ['png', 'pdf'],
  },
  {
    id: 'investigator-log',
    label: 'Investigator log',
    tagline: 'Every event, compact',
    desc: 'Single-column numbered log — best for long event lists and analyst handoffs.',
    audiences: ['analyst'],
    family: 'case-file',
    thumb: 'log',
    vizType: 'event-stack',
    vizStyle: 'default',
    exportHints: ['markdown', 'csv'],
  },
  {
    id: 'case-file-spine',
    label: 'Case file · Spine',
    tagline: 'Alternating narrative cards',
    desc: 'Chronological cards on a center spine with key takeaways — the classic case narrative.',
    audiences: ['analyst'],
    family: 'case-file',
    thumb: 'spine',
    vizType: 'soc-details',
    vizStyle: 'default',
    exportHints: ['docx', 'pdf'],
  },
  {
    id: 'case-file-full',
    label: 'Case file · Full detail',
    tagline: 'Maximum narrative depth',
    desc: 'Full-width chronological cards with host, user, technique, and narrative detail.',
    audiences: ['analyst'],
    family: 'case-file',
    thumb: 'cards',
    vizType: 'soc-details',
    vizStyle: 'case-full',
    exportHints: ['docx', 'pdf'],
  },
  {
    id: 'mitre-coverage',
    label: 'MITRE coverage',
    tagline: 'Technique × phase heatmap',
    desc: 'Heatmap of MITRE ATT&CK techniques across kill-chain phases — spot gaps and concentration.',
    audiences: ['ir-lead', 'analyst'],
    thumb: 'mitre',
    vizType: 'mitre-heatmap',
    vizStyle: 'default',
    exportHints: ['png', 'pdf'],
  },
  {
    id: 'containment-lanes',
    label: 'Containment lanes',
    tagline: 'Attacker vs defender',
    desc: 'Two swimlanes separating adversary actions from detection, containment, and response events.',
    audiences: ['ir-lead', 'analyst'],
    thumb: 'containment',
    vizType: 'containment-lanes',
    vizStyle: 'default',
    exportHints: ['png', 'pdf'],
  },
  {
    id: 'host-lanes',
    label: 'Host lanes',
    tagline: 'One row per system',
    desc: 'Events grouped by hostname on a shared timeline — answer “what happened on this box?”',
    audiences: ['analyst', 'tech'],
    thumb: 'hosts',
    vizType: 'host-lanes',
    vizStyle: 'default',
    exportHints: ['png', 'csv'],
  },
  {
    id: 'evidence-table',
    label: 'Evidence table',
    tagline: 'Sortable event log',
    desc: 'Table-first layout with timestamps, entities, and details — ready for reports and review.',
    audiences: ['analyst', 'report'],
    thumb: 'table',
    vizType: 'evidence-table',
    vizStyle: 'default',
    exportHints: ['markdown', 'csv', 'docx'],
  },
  {
    id: 'host-journey',
    label: 'Host journey',
    tagline: 'Lateral movement map',
    desc: 'Transit-style diagram showing flow between systems over time.',
    audiences: ['tech'],
    thumb: 'journey',
    vizType: 'soc-details',
    vizStyle: 'metro',
    exportHints: ['png', 'svg'],
  },
  {
    id: 'attack-graph',
    label: 'Attack graph',
    tagline: 'Linked entity flow',
    desc: 'Force-directed graph from event links — visualize paths and relationships.',
    audiences: ['tech'],
    thumb: 'graph',
    vizType: 'soc-details',
    vizStyle: 'attack-flow',
    exportHints: ['png', 'svg'],
  },
  {
    id: 'sequence-chart',
    label: 'Sequence chart',
    tagline: 'Step-by-step progression',
    desc: 'Mermaid sequence diagram of attack progression for engineering audiences.',
    audiences: ['tech'],
    thumb: 'sequence',
    vizType: 'soc-details',
    vizStyle: 'sequence',
    exportHints: ['png', 'svg'],
  },
  {
    id: 'leadership-board',
    label: 'Leadership board',
    tagline: 'Board-ready summary',
    desc: 'Phased chevrons, milestones, and leadership narrative — for executives and legal counsel.',
    audiences: ['executive'],
    thumb: 'executive',
    vizType: 'ciso-summary',
    vizStyle: 'default',
    exportHints: ['executive-pdf', 'pptx'],
  },
  {
    id: 'milestone-storyboard',
    label: 'Milestone storyboard',
    tagline: 'Key moments only',
    desc: 'Auto-selected milestones in a briefing slide format — hide noise, keep the story.',
    audiences: ['executive', 'ir-lead'],
    thumb: 'storyboard',
    vizType: 'milestone-storyboard',
    vizStyle: 'default',
    exportHints: ['executive-pdf', 'pptx', 'png'],
  },
  {
    id: 'report-appendix',
    label: 'Report appendix',
    tagline: 'One page for PDF/Word',
    desc: 'Doc-width activity strip plus compact event table — matches appendix export formats.',
    audiences: ['report'],
    thumb: 'appendix',
    vizType: 'appendix-timeline',
    vizStyle: 'default',
    exportHints: ['appendix-pdf', 'appendix-png', 'docx'],
  },
];

const LAYOUT_BY_ID = new Map(DESIGN_LAYOUTS.map((l) => [l.id, l]));

/** Legacy variant ids from Phase A picker → new layout ids. */
const LEGACY_LAYOUT_IDS = {
  activity: 'horizon-strip',
  gantt: 'gantt-phases',
  swimlanes: 'swimlane-timeline',
  metro: 'host-journey',
  appendix: 'report-appendix',
  spine: 'case-file-spine',
  stack: 'investigator-log',
  'phase-columns': 'kill-chain-board',
  'soc-cards': 'case-file-spine',
  'attack-flow': 'attack-graph',
  sequence: 'sequence-chart',
  'executive-summary': 'leadership-board',
};

/** @param {string} audienceId */
export function layoutsForAudience(audienceId) {
  if (!audienceId || audienceId === 'all') return DESIGN_LAYOUTS;
  return DESIGN_LAYOUTS.filter((l) => l.audiences.includes(audienceId));
}

/** @param {string} layoutId */
export function layoutById(layoutId) {
  const resolved = LEGACY_LAYOUT_IDS[layoutId] || layoutId;
  return LAYOUT_BY_ID.get(resolved) || DESIGN_LAYOUTS[0];
}

/** @returns {{ layoutId: string, vizType: string, vizStyle: string }} */
export function designToViz(layoutId) {
  const layout = layoutById(layoutId);
  return {
    layoutId: layout.id,
    vizType: layout.vizType,
    vizStyle: layout.vizStyle || 'default',
  };
}

/** Resolve gallery selection from persisted vizType / vizStyle. */
export function vizToDesign(vizType, vizStyle, compareView = 'gantt') {
  const style = vizStyle || 'default';

  if (vizType === 'compare') {
    return { layoutId: 'horizon-strip' };
  }

  const exact = DESIGN_LAYOUTS.find((l) => l.vizType === vizType && (l.vizStyle || 'default') === style);
  if (exact) return { layoutId: exact.id };

  const byType = DESIGN_LAYOUTS.find((l) => l.vizType === vizType && (l.vizStyle || 'default') === 'default');
  if (byType) return { layoutId: byType.id };

  return { layoutId: 'horizon-strip' };
}

/** @param {string} layoutId */
export function layoutExportHints(layoutId) {
  return layoutById(layoutId).exportHints || [];
}

/** @param {string} layoutId */
export function isCaseFileLayout(layoutId) {
  return layoutById(layoutId).family === 'case-file';
}

/** Case file family variants for secondary picker. */
export function caseFileLayouts() {
  return DESIGN_LAYOUTS.filter((l) => l.family === 'case-file');
}

/** Suggest default layout from event count. */
export function suggestLayoutId(eventCount) {
  if (eventCount <= 0) return 'horizon-strip';
  if (eventCount < 15) return 'case-file-spine';
  if (eventCount <= 40) return 'swimlane-timeline';
  return 'investigator-log';
}

/** @param {string} audienceId */
export function audienceLabel(audienceId) {
  return DESIGN_AUDIENCES.find((a) => a.id === audienceId)?.label || 'All';
}
