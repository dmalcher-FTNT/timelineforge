import { CATEGORIES, formatDateRange, sortEvents } from '../utils.js';
import { actorLaneLabel, classifyEventActor } from '../edit/actor-classify.js';
import { escapeHtml, displayEventDetails, vizTitleHtml } from './viz-helpers.js';
import { buildTimeAxis, timeToPercent } from './phase-content.js';

const LANES = ['attacker', 'defender'];

/** Attacker vs defender response on a shared timeline. */
export function renderContainmentLanes(container, { events, meta }) {
  const sorted = sortEvents(events);
  const axis = buildTimeAxis(sorted);

  const byActor = new Map(LANES.map((lane) => [lane, []]));
  sorted.forEach((evt) => {
    byActor.get(classifyEventActor(evt)).push(evt);
  });

  const wrap = document.createElement('div');
  wrap.className = 'viz-containment-lanes';
  wrap.innerHTML = `
    <header class="viz-header">
      <div>${vizTitleHtml(meta)}</div>
      <p class="containment-lanes-lead">Attacker actions vs defender containment and detection on one timeline.</p>
    </header>
    <div class="containment-lanes-chart">
      <div class="containment-lanes-axis">
        <div class="containment-lanes-months" id="containment-lanes-months"></div>
      </div>
      <div class="containment-lanes-body" id="containment-lanes-body"></div>
    </div>
  `;

  container.appendChild(wrap);

  const monthsEl = wrap.querySelector('#containment-lanes-months');
  axis.months.forEach((m) => {
    const span = document.createElement('span');
    span.className = 'containment-lanes-month-mark';
    span.style.left = `${timeToPercent(m.time, axis.min, axis.max)}%`;
    span.textContent = m.label;
    monthsEl.appendChild(span);
  });

  const body = wrap.querySelector('#containment-lanes-body');
  LANES.forEach((lane) => {
    const laneEvents = byActor.get(lane) || [];
    const row = document.createElement('div');
    row.className = `containment-lane containment-lane-${lane}`;
    row.innerHTML = `<div class="containment-lane-label">${escapeHtml(actorLaneLabel(lane))} <span class="containment-lane-count">${laneEvents.length}</span></div>`;
    const track = document.createElement('div');
    track.className = 'containment-lane-track';

    laneEvents.forEach((evt) => {
      const cat = CATEGORIES[evt.category] || CATEGORIES.reconnaissance;
      const t = new Date(evt.timestampStart).getTime();
      const left = timeToPercent(t, axis.min, axis.max);
      const marker = document.createElement('button');
      marker.type = 'button';
      marker.className = 'containment-lane-marker';
      marker.dataset.eventId = evt.id;
      marker.style.left = `${left}%`;
      marker.style.setProperty('--marker-color', lane === 'defender' ? '#2563eb' : cat.color);
      marker.title = `${formatDateRange(evt.timestampStart, evt.timestampEnd)} — ${displayEventDetails(evt, 80)}`;
      marker.innerHTML = `<span class="containment-lane-marker-dot">${lane === 'defender' ? '🛡' : cat.icon}</span>`;
      track.appendChild(marker);
    });

    row.appendChild(track);
    body.appendChild(row);
  });
}
