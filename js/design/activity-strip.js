import { CATEGORIES, formatDate, formatDwellTime } from '../utils.js';
import { buildActivityPreview } from '../edit/activity-preview.js';
import { escapeHtml, vizTitleHtml } from './viz-helpers.js';

function formatStat(iso, timezone) {
  if (!iso) return '—';
  return formatDate(iso, { timezone, seconds: false });
}

/**
 * Full-page activity overview — exportable sibling of the incident-panel mini chart.
 */
export function renderActivityStrip(container, { events, meta }) {
  const timezone = meta?.timezone || 'UTC';
  const preview = buildActivityPreview(events, { timezone });
  const wrap = document.createElement('div');
  wrap.className = 'viz-activity-strip';

  if (!preview) {
    wrap.innerHTML = `<p class="viz-empty">No events with valid timestamps to chart.</p>`;
    container.appendChild(wrap);
    return;
  }

  const earliest = new Date(preview.min).toISOString();
  const latest = new Date(preview.max).toISOString();
  const dwell = formatDwellTime(earliest, latest);
  const usedCategories = [...new Set(events.map((e) => e.category).filter(Boolean))];

  wrap.innerHTML = `
    <header class="viz-header">
      <div>${vizTitleHtml(meta)}</div>
      <div class="activity-strip-stats">
        <span class="activity-strip-stat"><strong>${events.length}</strong> events</span>
        <span class="activity-strip-stat"><strong>${dwell}</strong></span>
      </div>
    </header>

    <div class="activity-strip-chart" role="img" aria-label="Timeline activity overview">
      <div class="activity-strip-density">
        ${preview.buckets.map((b) => `
          <span class="activity-strip-bar" style="left:${b.leftPct}%;width:${b.widthPct}%;height:${Math.max(8, b.heightPct)}%"></span>
        `).join('')}
      </div>
      <div class="activity-strip-lanes" style="--lane-count:${preview.laneCount}">
        ${preview.markers.map((m) => `
          <button type="button" class="activity-strip-marker${m.isPoint ? ' is-point' : ''}"
            data-event-id="${escapeHtml(m.id)}"
            style="--marker-row:${m.row};left:${m.leftPct}%;width:${m.widthPct}%;background:${m.color}"
            title="${escapeHtml(m.title)}"></button>
        `).join('')}
      </div>
      <div class="activity-strip-axis-line" aria-hidden="true"></div>
    </div>

    <div class="activity-strip-ticks" aria-hidden="true">
      ${preview.ticks.map((t) => `<span class="activity-strip-tick" style="left:${t.leftPct}%">${escapeHtml(t.label)}</span>`).join('')}
    </div>

    <div class="activity-strip-endpoints">
      <div>
        <span class="activity-strip-end-label">First seen</span>
        <time>${escapeHtml(formatStat(earliest, timezone))}</time>
      </div>
      <div class="activity-strip-end-right">
        <span class="activity-strip-end-label">Last seen</span>
        <time>${escapeHtml(formatStat(latest, timezone))}</time>
      </div>
    </div>

    <div class="viz-legend category-legend activity-strip-legend">
      ${usedCategories.map((key) => {
        const cat = CATEGORIES[key] || { color: '#64748b', label: key, icon: '•' };
        return `<span><i style="background:${cat.color}">${cat.icon || '•'}</i>${escapeHtml(cat.label || key)}</span>`;
      }).join('')}
    </div>
    ${preview.truncated ? '<p class="activity-strip-note">Showing first 150 events in chart — open SOC cards for full detail.</p>' : ''}
  `;

  container.appendChild(wrap);
}
