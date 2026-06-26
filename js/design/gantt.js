import * as d3 from 'd3';
import { CATEGORIES, sortEvents } from '../utils.js';
import { resolvePhases } from '../phases.js';
import { displayText, displayEventDetails, escapeHtml, TEXT_LIMITS } from './viz-helpers.js';
import { assignIntervalRows, eventInterval } from './phase-content.js';

const SUB_ROW_H = 22;
const LANE_PAD = 8;
const PHASE_GAP = 6;

export function renderGantt(container, { events, meta }) {
  const sorted = sortEvents(events);
  const phaseDefs = resolvePhases(meta);
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'viz-gantt';
  container.appendChild(wrap);

  const width = 1100;
  const margin = { top: 50, right: 30, bottom: 40, left: 200 };

  const phaseLanes = phaseDefs.map((phase) => {
    const phaseEvents = sorted.filter((e) => e.phase === phase.id);
    const laid = assignIntervalRows(
      phaseEvents.map((event) => ({ event, ...eventInterval(event) })),
    );
    const rowCount = laid.length
      ? Math.max(...laid.map((i) => i.row)) + 1
      : 1;
    return { phase, laid, rowCount, laneHeight: rowCount * SUB_ROW_H + LANE_PAD * 2 };
  }).filter((lane) => lane.laid.length);

  const lanesHeight = phaseLanes.reduce((sum, lane) => sum + lane.laneHeight + PHASE_GAP, 0);
  const height = Math.max(160, margin.top + lanesHeight + margin.bottom);

  const svg = d3.select(wrap).append('svg').attr('viewBox', `0 0 ${width} ${height}`);

  svg.append('text').attr('x', width / 2).attr('y', 28).attr('text-anchor', 'middle').attr('font-size', 16).attr('font-weight', 700)
    .text(`${meta.title || 'Timeline'} — Gantt View`);

  const times = sorted.flatMap((e) => {
    const iv = eventInterval(e);
    return [iv.start, iv.end];
  }).filter(Number.isFinite);
  const x = d3.scaleTime().domain(d3.extent(times)).range([margin.left, width - margin.right]);

  svg.append('g').attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(8).tickFormat(d3.timeFormat('%b %d %Y')));

  let yCursor = margin.top;
  phaseLanes.forEach(({ phase, laid, rowCount, laneHeight }) => {
    svg.append('rect')
      .attr('x', margin.left - 4)
      .attr('y', yCursor)
      .attr('width', width - margin.left - margin.right + 8)
      .attr('height', laneHeight)
      .attr('rx', 4)
      .attr('fill', phase.color)
      .attr('opacity', 0.06);

    svg.append('text')
      .attr('x', margin.left - 10)
      .attr('y', yCursor + laneHeight / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('font-size', 9)
      .attr('font-weight', 600)
      .attr('fill', phase.color)
      .text(displayText(phase.name, TEXT_LIMITS.phaseLabel));

    const innerH = laneHeight - LANE_PAD * 2;
    const barH = innerH / rowCount - 2;

    laid.forEach(({ event: e, row, start, end }) => {
      const cat = CATEGORIES[e.category] || CATEGORIES.reconnaissance;
      const x0 = x(start);
      const x1 = x(end);
      const barY = yCursor + LANE_PAD + row * (innerH / rowCount) + 1;

      svg.append('rect')
        .attr('data-event-id', e.id)
        .attr('data-lane', phase.id)
        .attr('data-viz-bar', 'gantt')
        .attr('x', x0)
        .attr('y', barY)
        .attr('width', Math.max(3, x1 - x0))
        .attr('height', Math.max(4, barH))
        .attr('rx', 3)
        .attr('fill', cat.color)
        .attr('opacity', 0.92);

      if (x1 - x0 > 52) {
        svg.append('text')
          .attr('x', x0 + 4)
          .attr('y', barY + barH / 2)
          .attr('dy', '0.35em')
          .attr('font-size', 8)
          .attr('fill', '#fff')
          .attr('pointer-events', 'none')
          .text(displayText(
            e.hostname && e.hostname !== 'N/A' ? e.hostname : displayEventDetails(e, TEXT_LIMITS.ganttHost),
            TEXT_LIMITS.ganttHost,
          ));
      }
    });

    yCursor += laneHeight + PHASE_GAP;
  });
}

export function renderRetro(container, { events, meta }) {
  const sorted = events;
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'viz-retro';
  wrap.innerHTML = `<div class="retro-screen"><div class="retro-title">${meta.title || 'INCIDENT QUEST'}</div><div class="retro-events"></div></div>`;
  container.appendChild(wrap);

  const list = wrap.querySelector('.retro-events');
  sorted.forEach((e, i) => {
    const cat = CATEGORIES[e.category] || CATEGORIES.reconnaissance;
    const row = document.createElement('div');
    row.className = 'retro-row';
    row.dataset.eventId = e.id;
    row.style.borderLeftColor = cat.color;
    row.innerHTML = `
      <span class="retro-lvl">LV${String(i + 1).padStart(2, '0')}</span>
      <span class="retro-date">${new Date(e.timestampStart).toISOString().slice(0, 16).replace('T', ' ')}</span>
      <span class="retro-host">${e.hostname}</span>
      <p>${escapeHtml(displayEventDetails(e, TEXT_LIMITS.retroDetails))}</p>
    `;
    list.appendChild(row);
  });
}

export function renderScribing(container, { events, meta }) {
  const sorted = events;
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'viz-scribing';
  wrap.innerHTML = `<h2>${meta.title || 'Visual Recording'}</h2><div class="scribing-canvas"></div>`;
  container.appendChild(wrap);

  const canvas = wrap.querySelector('.scribing-canvas');
  sorted.forEach((e, i) => {
    const cat = CATEGORIES[e.category] || CATEGORIES.reconnaissance;
    const bubble = document.createElement('div');
    bubble.className = 'scribe-bubble';
    bubble.dataset.eventId = e.id;
    bubble.style.transform = `rotate(${(i % 3 - 1) * 1.5}deg)`;
    bubble.innerHTML = `
      <div class="scribe-icon" style="background:${cat.color}">${cat.icon}</div>
      <div class="scribe-sketch">${handDrawnBox(displayEventDetails(e, TEXT_LIMITS.scribingDetails))}</div>
      <div class="scribe-arrow">↓</div>
    `;
    canvas.appendChild(bubble);
  });
}

function handDrawnBox(text) {
  const safe = escapeHtml(text);
  return `<svg viewBox="0 0 200 60" class="sketch-box"><path d="M4,8 Q2,4 8,4 H192 Q198,4 196,10 V52 Q198,58 192,56 H8 Q2,58 4,52 Z" fill="#fffef7" stroke="#334155" stroke-width="2"/><text x="12" y="28" font-size="9" fill="#1e293b">${safe}</text></svg>`;
}
