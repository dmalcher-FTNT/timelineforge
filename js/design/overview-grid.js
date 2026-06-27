import {
  formatDateRange, sortEvents, timelineSpanMonths, uniqueHosts, uniqueUsers,
} from '../utils.js';
import { resolvePhases } from '../phases.js';
import { computePhaseSummaries, escapeHtml, displayText, displayEventDetails, TEXT_LIMITS, vizTitleHtml } from './viz-helpers.js';
import {
  PHASE_ICONS,
  buildExecutiveTakeaway,
  buildTimeAxis,
  countExternalIps,
  deconflictBoxPositions,
  deriveAttackerObjectives,
  derivePhaseBlurb,
  pickPhaseHighlights,
  timeToPercent,
  timelineChartMinWidth,
} from './phase-content.js';

export function renderOverviewGrid(container, { events, meta }) {
  const sorted = sortEvents(events);
  const phaseDefs = resolvePhases(meta);
  const phases = computePhaseSummaries(sorted, phaseDefs);
  const axis = buildTimeAxis(sorted);
  const objectives = deriveAttackerObjectives(sorted);

  const wrap = document.createElement('div');
  wrap.className = 'viz-overview';

  wrap.innerHTML = `
    <header class="viz-header">
      <div>
        ${vizTitleHtml(meta)}
      </div>
      <div class="viz-legend">${phaseDefs.map((p) => `<span><i style="background:${p.color}"></i>${escapeHtml(p.name.split('&')[0].trim())}</span>`).join('')}</div>
    </header>

    <div class="overview-chart">
      <div class="overview-axis">
        <div class="overview-years" id="overview-years"></div>
        <div class="overview-months" id="overview-months"></div>
      </div>
      <div class="overview-lanes" id="overview-lanes"></div>
    </div>

    <section class="ciso-bottom-panels overview-bottom">
      <div class="ciso-stats overview-stats">
        <div><strong>${timelineSpanMonths(sorted)}</strong><span>Months</span></div>
        <div><strong>${sorted.length}</strong><span>Events</span></div>
        <div><strong>${uniqueHosts(sorted).length}</strong><span>Hosts</span></div>
        <div><strong>${uniqueUsers(sorted).length}+</strong><span>Accounts</span></div>
        ${countExternalIps(sorted) ? `<div><strong>${countExternalIps(sorted)}</strong><span>External IPs</span></div>` : ''}
      </div>
      <div class="ciso-objectives">
        <h4>Attacker Objectives</h4>
        <ul>${objectives.map((o) => `<li>✓ ${escapeHtml(o)}</li>`).join('')}</ul>
      </div>
      <div class="ciso-takeaway">
        <h4>Key Takeaway</h4>
        <p>${escapeHtml(buildExecutiveTakeaway(sorted))}</p>
      </div>
    </section>
  `;

  container.appendChild(wrap);

  const chartEl = wrap.querySelector('.overview-chart');
  chartEl.style.minWidth = `${timelineChartMinWidth(axis.months.length)}px`;

  const yearsEl = wrap.querySelector('#overview-years');
  axis.years.forEach((y) => {
    const left = timeToPercent(y.startTime, axis.min, axis.max);
    const span = document.createElement('span');
    span.className = 'overview-year-mark';
    span.style.left = `${left}%`;
    span.textContent = String(y.year);
    yearsEl.appendChild(span);
  });

  const monthsEl = wrap.querySelector('#overview-months');
  axis.months.forEach((m) => {
    const left = timeToPercent(m.time, axis.min, axis.max);
    const span = document.createElement('span');
    span.className = 'overview-month-mark';
    span.style.left = `${left}%`;
    span.textContent = m.label;
    monthsEl.appendChild(span);
  });

  const lanesEl = wrap.querySelector('#overview-lanes');
  phases.forEach((phase, i) => {
    const lane = document.createElement('div');
    lane.className = 'overview-lane';
    lane.innerHTML = `
      <div class="overview-lane-label">
        <span class="overview-phase-num" style="background:${phase.color}">${phase.id}</span>
        <span class="overview-phase-icon">${PHASE_ICONS[i] || '•'}</span>
        <div class="overview-phase-text">
          <strong style="color:${phase.color}">${escapeHtml(displayText(phase.name, 28))}</strong>
          <p>${escapeHtml(derivePhaseBlurb(phase.events))}</p>
        </div>
      </div>
      <div class="overview-lane-track" style="--lane-color:${phase.color}">
        <div class="overview-lane-line"></div>
        <div class="overview-lane-boxes"></div>
      </div>
    `;

    const boxesEl = lane.querySelector('.overview-lane-boxes');
    const highlights = pickPhaseHighlights(phase.events, 3);
    const boxes = deconflictBoxPositions(
      highlights.map((e) => ({
        event: e,
        pct: timeToPercent(Date.parse(e.timestampStart), axis.min, axis.max),
        row: 0,
      })),
      { minGapPct: 8, boxWidthPct: 16 },
    );

    boxes.forEach(({ event: e, pct, row }) => {
      const box = document.createElement('article');
      box.className = 'overview-event-box';
      box.dataset.eventId = e.id;
      box.style.left = `${pct}%`;
      box.style.top = `${row * 52}px`;
      box.innerHTML = `
        <time>${escapeHtml(formatDateRange(e.timestampStart, e.timestampEnd))}</time>
        <p>${escapeHtml(displayEventDetails(e, 72))}</p>
      `;
      boxesEl.appendChild(box);
    });

    const track = lane.querySelector('.overview-lane-track');
    const maxRow = boxes.reduce((m, b) => Math.max(m, b.row || 0), 0);
    track.style.minHeight = `${Math.max(72, 56 + maxRow * 52)}px`;

    lanesEl.appendChild(lane);
  });
}
