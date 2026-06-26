import { renderAppendixTimeline } from './appendix-timeline.js';
import { renderActivityStrip } from './activity-strip.js';
import { renderAttackFlow } from './attack-flow.js';
import { applyCompareOverlay } from './compare-overlay.js';
import { renderCompare } from './compare.js';
import { renderCisoSummary } from './ciso-summary.js';
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
    if (vizType !== 'compare' && vizType !== 'activity-strip' && vizType !== 'appendix-timeline') applyCompareOverlay(container, overlayCtx);
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
    container.querySelector('.viz-ciso, .viz-overview, .viz-phase-columns, .viz-soc, .viz-gantt, .viz-mermaid, .viz-attack-flow, .viz-activity-strip, .viz-appendix, .viz-fahrplan')?.classList.add('viz-dark');
  }
}

export function getPreviewDimensions(vizType) {
  if (vizType === 'activity-strip') return { width: 1200, height: 520 };
  if (vizType === 'appendix-timeline') return { width: 960, height: 680 };
  if (vizType === 'ciso-summary') return { width: 1200, height: 1100 };
  if (vizType === 'incident-overview') return { width: 1200, height: 900 };
  if (vizType === 'phase-columns') return { width: 1200, height: 850 };
  if (vizType === 'soc-details') return { width: 900, height: 1400 };
  if (vizType === 'compare') return { width: 1200, height: 900 };
  return { width: 1100, height: 900 };
}
