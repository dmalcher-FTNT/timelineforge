import { CATEGORIES, formatDate, formatDwellTime, sortEvents } from '../utils.js';
import { buildActivityPreview } from '../edit/activity-preview.js';
import {
  displayEventDetails,
  displayText,
  escapeHtml,
  TEXT_LIMITS,
  vizTitleHtml,
} from './viz-helpers.js';

/** Printable width for US Letter / A4 landscape with typical report margins. */
export const APPENDIX_DOC_WIDTH = 960;
export const APPENDIX_MAX_EVENTS = 40;
/** Use two compact columns when event count exceeds this. */
export const APPENDIX_TWO_COLUMN_MIN = 19;

function formatStat(iso, timezone) {
  if (!iso) return '—';
  return formatDate(iso, { timezone, seconds: false });
}

export function splitEventColumns(events) {
  if (events.length <= APPENDIX_TWO_COLUMN_MIN) {
    return { left: events, right: [] };
  }
  const mid = Math.ceil(events.length / 2);
  return { left: events.slice(0, mid), right: events.slice(mid) };
}

function renderEventTable(events, timezone, startIndex = 0) {
  if (!events.length) return '';
  const rows = events.map((e, i) => {
    const cat = CATEGORIES[e.category] || { color: '#64748b', label: e.category };
    return `
      <tr data-event-id="${escapeHtml(e.id)}">
        <td class="appendix-num">${startIndex + i + 1}</td>
        <td class="appendix-date">${escapeHtml(formatStat(e.timestampStart, timezone))}</td>
        <td class="appendix-host">${escapeHtml(displayText(e.hostname || '—', TEXT_LIMITS.host))}</td>
        <td class="appendix-details">
          <span class="appendix-cat-dot" style="background:${cat.color}" title="${escapeHtml(cat.label || e.category)}"></span>
          ${escapeHtml(displayEventDetails(e, TEXT_LIMITS.appendixDetails))}
        </td>
      </tr>`;
  }).join('');

  return `
    <table class="appendix-table">
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">Date</th>
          <th scope="col">Host</th>
          <th scope="col">Event</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

/**
 * Single-page appendix layout — doc-width activity strip + compact event table.
 */
export function renderAppendixTimeline(container, { events, meta }) {
  const timezone = meta?.timezone || 'UTC';
  const sorted = sortEvents(events);
  const shown = sorted.slice(0, APPENDIX_MAX_EVENTS);
  const preview = buildActivityPreview(shown, { timezone });
  const wrap = document.createElement('div');
  wrap.className = 'viz-appendix';

  if (!preview) {
    wrap.innerHTML = `<p class="viz-empty">No events with valid timestamps for appendix layout.</p>`;
    container.appendChild(wrap);
    return;
  }

  const earliest = new Date(preview.min).toISOString();
  const latest = new Date(preview.max).toISOString();
  const dwell = formatDwellTime(earliest, latest);
  const usedCategories = [...new Set(shown.map((e) => e.category).filter(Boolean))];
  const { left, right } = splitEventColumns(shown);

  wrap.innerHTML = `
    <header class="viz-header appendix-header">
      <div>${vizTitleHtml(meta)}</div>
      <p class="appendix-meta">
        <span><strong>${shown.length}</strong>${sorted.length > shown.length ? ` of ${sorted.length}` : ''} events</span>
        <span>${escapeHtml(dwell)} activity window</span>
      </p>
    </header>

    <div class="appendix-chart" role="img" aria-label="Appendix timeline overview">
      <div class="appendix-chart-density">
        ${preview.buckets.map((b) => `
          <span class="appendix-chart-bar" style="left:${b.leftPct}%;width:${b.widthPct}%;height:${Math.max(10, b.heightPct)}%"></span>
        `).join('')}
      </div>
      <div class="appendix-chart-lanes" style="--lane-count:${preview.laneCount}">
        ${preview.markers.map((m) => `
          <span class="appendix-chart-marker${m.isPoint ? ' is-point' : ''}"
            data-event-id="${escapeHtml(m.id)}"
            style="--marker-row:${m.row};left:${m.leftPct}%;width:${m.widthPct}%;background:${m.color}"
            title="${escapeHtml(m.title)}"></span>
        `).join('')}
      </div>
      <div class="appendix-chart-axis" aria-hidden="true"></div>
      <div class="appendix-chart-ticks" aria-hidden="true">
        ${preview.ticks.map((t) => `<span class="appendix-chart-tick" style="left:${t.leftPct}%">${escapeHtml(t.label)}</span>`).join('')}
      </div>
    </div>

    <div class="appendix-table-wrap${right.length ? ' is-two-col' : ''}">
      ${renderEventTable(left, timezone, 0)}
      ${right.length ? renderEventTable(right, timezone, left.length) : ''}
    </div>

    <footer class="appendix-footer">
      <div class="viz-legend category-legend appendix-legend">
        ${usedCategories.map((key) => {
          const cat = CATEGORIES[key] || { color: '#64748b', label: key, icon: '•' };
          return `<span><i style="background:${cat.color}">${cat.icon || '•'}</i>${escapeHtml(cat.label || key)}</span>`;
        }).join('')}
      </div>
      ${sorted.length > APPENDIX_MAX_EVENTS
    ? `<p class="appendix-note">Showing first ${APPENDIX_MAX_EVENTS} events — export full data as CSV or Markdown from OUTPUT.</p>`
    : ''}
      ${preview.truncated && sorted.length <= APPENDIX_MAX_EVENTS
    ? `<p class="appendix-note">Chart shows first 150 timed events; table lists all rows above.</p>`
    : ''}
    </footer>
  `;

  container.appendChild(wrap);
}
