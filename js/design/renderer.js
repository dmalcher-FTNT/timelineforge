import { renderAppendixTimeline } from './appendix-timeline.js';
import { renderActivityStrip } from './activity-strip.js';
import { renderAttackFlow } from './attack-flow.js';
import { renderEventStack } from './event-stack.js';
import { renderEvidenceTable } from './evidence-table.js';
import { applyCompareOverlay } from './compare-overlay.js';
import { renderCompare } from './compare.js';
import { renderCisoSummary } from './ciso-summary.js';
import { renderContainmentLanes } from './containment-lanes.js';
import { renderHostLanes } from './host-lanes.js';
import { renderMitreHeatmap } from './mitre-heatmap.js';
import { renderMilestoneStoryboard } from './milestone-storyboard.js';
import { renderOverviewGrid } from './overview-grid.js';
import { renderPhaseColumns } from './phase-columns.js';
import { renderFahrplan, renderSocDetails } from './soc-details.js';
import { renderGantt } from './gantt.js';
import { getCustomRenderer } from './plugins.js';
import { orderEventsForViz } from './viz-helpers.js';

const TYPE_RENDERERS = {
  'activity-strip': renderActivityStrip,
  'appendix-timeline': renderAppendixTimeline,
  'ciso-summary': renderCisoSummary,
  'incident-overview': renderOverviewGrid,
  'phase-columns': renderPhaseColumns,
  'soc-details': renderSocDetails,
  'event-stack': renderEventStack,
  'host-lanes': renderHostLanes,
  'mitre-heatmap': renderMitreHeatmap,
  'containment-lanes': renderContainmentLanes,
  'evidence-table': renderEvidenceTable,
  'milestone-storyboard': renderMilestoneStoryboard,
  compare: renderCompare,
};

const STYLE_RENDERERS = {
  gantt: renderGantt,
  metro: renderFahrplan,
  'attack-flow': renderAttackFlow,
  sequence: 'mermaid',
};

const LEGACY_STYLE = {
  icons: 'default',
  fahrplan: 'metro',
  mermaid: 'sequence',
  retro: 'default',
  scribing: 'default',
};

export function normalizeVizStyle(vizStyle) {
  return LEGACY_STYLE[vizStyle] || vizStyle || 'default';
}

function resolveRendererKey(vizType, vizStyle) {
  const style = normalizeVizStyle(vizStyle);
  if (vizType === 'activity-strip') return 'activity-strip';
  if (vizType === 'appendix-timeline') return 'appendix-timeline';
  if (vizType === 'event-stack') return 'event-stack';
  if (vizType === 'host-lanes') return 'host-lanes';
  if (vizType === 'mitre-heatmap') return 'mitre-heatmap';
  if (vizType === 'containment-lanes') return 'containment-lanes';
  if (vizType === 'evidence-table') return 'evidence-table';
  if (vizType === 'milestone-storyboard') return 'milestone-storyboard';
  if (style === 'case-full') return 'soc-details';
  if (style === 'default') return vizType;
  if (STYLE_RENDERERS[style]) return style;
  return vizType;
}

export function renderVisualization(container, { events, meta, vizType, vizStyle, theme, compareTimeline }) {
  container.innerHTML = '';
  const ordered = orderEventsForViz(events);
  const overlayCtx = { events: ordered, meta, compareTimeline };
  const style = normalizeVizStyle(vizStyle);

  const applyOverlay = () => {
    if (vizType !== 'compare' && vizType !== 'activity-strip' && vizType !== 'appendix-timeline' && vizType !== 'event-stack' && vizType !== 'evidence-table') applyCompareOverlay(container, overlayCtx);
  };

  if (vizType === 'compare') {
    const compareView = style === 'default' ? (meta.compareView || 'gantt') : style;
    renderCompare(container, { events: ordered, meta, compareTimeline, theme, compareView });
    if (theme === 'dark') container.firstChild?.classList.add('viz-dark');
    return;
  }

  const key = resolveRendererKey(vizType, style);

  if (key === 'sequence' || key === 'mermaid') {
    import('./mermaid-flow.js').then(({ renderMermaidFlow }) => {
      renderMermaidFlow(container, { events: ordered, meta, theme }).then(() => {
        applyOverlay();
        if (theme === 'dark') container.querySelector('.viz-mermaid')?.classList.add('viz-dark');
      });
    });
    return;
  }

  const plugin = getCustomRenderer(key);
  if (plugin) {
    plugin.render(container, { events: ordered, meta, theme, vizType, vizStyle: style });
    applyOverlay();
    if (theme === 'dark') container.querySelector('.viz-minimal-list, .viz-plugin')?.classList.add('viz-dark');
    return;
  }

  const renderer = TYPE_RENDERERS[key] || STYLE_RENDERERS[key] || TYPE_RENDERERS['soc-details'];
  renderer(container, { events: ordered, meta, theme, vizType, vizStyle: style });
  applyOverlay();
  if (theme === 'dark') {
    container.querySelector('.viz-ciso, .viz-overview, .viz-phase-columns, .viz-soc, .viz-event-stack, .viz-host-lanes, .viz-evidence-table, .viz-storyboard, .viz-gantt, .viz-mermaid, .viz-attack-flow, .viz-activity-strip, .viz-appendix, .viz-fahrplan, .viz-mitre-heatmap, .viz-containment-lanes')?.classList.add('viz-dark');
  }
}

export function getPreviewDimensions(vizType) {
  if (vizType === 'activity-strip') return { width: 1200, height: 520 };
  if (vizType === 'appendix-timeline') return { width: 960, height: 680 };
  if (vizType === 'ciso-summary') return { width: 1200, height: 1100 };
  if (vizType === 'incident-overview') return { width: 1200, height: 900 };
  if (vizType === 'phase-columns') return { width: 1200, height: 850 };
  if (vizType === 'soc-details') return { width: 900, height: 1400 };
  if (vizType === 'event-stack') return { width: 880, height: 1400 };
  if (vizType === 'host-lanes') return { width: 1100, height: Math.max(600, 900) };
  if (vizType === 'mitre-heatmap') return { width: 960, height: Math.max(520, 680) };
  if (vizType === 'containment-lanes') return { width: 1100, height: Math.max(520, 720) };
  if (vizType === 'evidence-table') return { width: 1000, height: 1200 };
  if (vizType === 'milestone-storyboard') return { width: 1100, height: 720 };
  if (vizType === 'compare') return { width: 1200, height: 900 };
  return { width: 1100, height: 900 };
}
