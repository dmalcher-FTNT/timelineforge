import { CATEGORIES, formatDateRange, sortEvents } from '../utils.js';
import { escapeHtml, displayText, displayEventDetails, TEXT_LIMITS, vizTitleHtml } from './viz-helpers.js';
import { buildTimeAxis, timeToPercent } from './phase-content.js';

/** Events grouped by hostname on a shared horizontal timeline. */
export function renderHostLanes(container, { events, meta }) {
  const sorted = sortEvents(events);
  const axis = buildTimeAxis(sorted);

  const byHost = new Map();
  sorted.forEach((evt) => {
    const host = evt.hostname?.trim() || 'Unknown host';
    if (!byHost.has(host)) byHost.set(host, []);
    byHost.get(host).push(evt);
  });

  const hosts = [...byHost.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  const wrap = document.createElement('div');
  wrap.className = 'viz-host-lanes';
  wrap.innerHTML = `
    <header class="viz-header">
      <div>${vizTitleHtml(meta)}</div>
      <div class="viz-legend category-legend">
        ${Object.entries(CATEGORIES).map(([k, v]) => `<span><i style="background:${v.color}">${v.icon}</i>${v.label}</span>`).join('')}
      </div>
    </header>
    <div class="host-lanes-chart">
      <div class="host-lanes-axis">
        <div class="host-lanes-months" id="host-lanes-months"></div>
      </div>
      <div class="host-lanes-body" id="host-lanes-body"></div>
    </div>
  `;

  container.appendChild(wrap);

  const monthsEl = wrap.querySelector('#host-lanes-months');
  axis.months.forEach((m) => {
    const span = document.createElement('span');
    span.className = 'host-lanes-month-mark';
    span.style.left = `${timeToPercent(m.time, axis.min, axis.max)}%`;
    span.textContent = m.label;
    monthsEl.appendChild(span);
  });

  const body = wrap.querySelector('#host-lanes-body');
  hosts.forEach(([host, hostEvents]) => {
    const lane = document.createElement('div');
    lane.className = 'host-lane';
    lane.innerHTML = `<div class="host-lane-label" title="${escapeHtml(host)}">${escapeHtml(displayText(host, 28))}</div>`;
    const track = document.createElement('div');
    track.className = 'host-lane-track';

    hostEvents.forEach((evt) => {
      const cat = CATEGORIES[evt.category] || CATEGORIES.reconnaissance;
      const t = new Date(evt.timestampStart).getTime();
      const left = timeToPercent(t, axis.min, axis.max);
      const marker = document.createElement('button');
      marker.type = 'button';
      marker.className = 'host-lane-marker';
      marker.dataset.eventId = evt.id;
      marker.style.left = `${left}%`;
      marker.style.setProperty('--marker-color', cat.color);
      marker.title = `${formatDateRange(evt.timestampStart, evt.timestampEnd)} — ${displayEventDetails(evt, 80)}`;
      marker.innerHTML = `<span class="host-lane-marker-dot">${cat.icon}</span>`;
      track.appendChild(marker);
    });

    lane.appendChild(track);
    body.appendChild(lane);
  });
}
