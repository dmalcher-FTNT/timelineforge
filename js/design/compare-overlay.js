import { diffTimelines, formatDiffSummary } from '../edit/timeline-diff.js';
import { escapeHtml } from './viz-helpers.js';

/** Map current event ids to overlay status: added | changed */
export function buildCompareStatusMap(baseEvents, currentEvents) {
  const diff = diffTimelines(baseEvents, currentEvents);
  const map = new Map();
  diff.added.forEach((e) => map.set(e.id, 'added'));
  diff.changed.forEach((c) => {
    const id = c?.after?.id || c?.before?.id;
    if (id) map.set(id, 'changed');
  });
  return { map, diff };
}

/**
 * Banner + DOM marks for non-compare visualizations when a baseline is loaded.
 */
export function applyCompareOverlay(container, { events, compareTimeline, meta }) {
  if (!compareTimeline?.events?.length || meta.showCompareOverlay === false) return null;

  const { map, diff } = buildCompareStatusMap(compareTimeline.events, events);

  const existing = container.querySelector('.compare-overlay-banner');
  existing?.remove();

  const banner = document.createElement('div');
  banner.className = 'compare-overlay-banner';
  banner.innerHTML = `
    <div class="compare-overlay-banner-inner">
      <strong>Baseline diff</strong>
      <span>${escapeHtml(formatDiffSummary(diff))}</span>
      <span class="compare-overlay-detail">
        vs ${escapeHtml(compareTimeline.meta?.title || 'baseline')}
        · ${diff.removed.length} removed (not shown)
      </span>
      <span class="compare-overlay-legend">
        <span class="compare-legend-added">Added</span>
        <span class="compare-legend-changed">Changed</span>
      </span>
    </div>
  `;
  container.insertBefore(banner, container.firstChild);

  container.querySelectorAll('[data-event-id]').forEach((el) => {
    el.classList.remove('compare-overlay-added', 'compare-overlay-changed');
    const status = map.get(el.dataset.eventId);
    if (status) el.classList.add(`compare-overlay-${status}`);
  });

  return diff;
}
