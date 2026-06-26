import * as d3 from 'd3';
import {
  CATEGORIES, formatDateRange, sortEvents, timelineSpanMonths, uniqueHosts, uniqueUsers,
} from '../utils.js';
import { findPhase, resolvePhases } from '../phases.js';
import { computePhaseSummaries, escapeHtml, displayText, displayEventDetails, TEXT_LIMITS, vizTitleHtml } from './viz-helpers.js';
import {
  PHASE_ICONS,
  buildExecutiveTakeaway,
  deriveAttackerObjectives,
  derivePhaseSummary,
  pickMilestones,
  assignIntervalRows,
  eventInterval,
} from './phase-content.js';

export function renderCisoSummary(container, { events, meta }) {
  const sorted = sortEvents(events);
  const phaseDefs = resolvePhases(meta);
  const phases = computePhaseSummaries(sorted, phaseDefs);
  const milestones = pickMilestones(sorted, phaseDefs, 9);
  const objectives = deriveAttackerObjectives(sorted);
  const wrap = document.createElement('div');
  wrap.className = 'viz-ciso';

  wrap.innerHTML = `
    <header class="viz-header">
      <div>
        ${vizTitleHtml(meta)}
      </div>
      <div class="viz-legend">${phaseDefs.map((p) => `<span><i style="background:${p.color}"></i>${escapeHtml(p.name.split('&')[0].trim())}</span>`).join('')}</div>
    </header>

    <section class="ciso-chevrons" id="ciso-chevrons"></section>
    <div class="ciso-time-axis" id="ciso-time-axis"></div>

    <h3 class="ciso-section-title">Key Milestones (${milestones.length})</h3>
    <section class="ciso-milestones-row" id="ciso-milestones"></section>

    <h3 class="ciso-section-title">Supporting Events</h3>
    <section class="ciso-columns" id="ciso-columns"></section>

    <section class="ciso-bottom-panels">
      <div class="ciso-stats">
        <div><strong>${timelineSpanMonths(sorted)}</strong><span>Months</span></div>
        <div><strong>${sorted.length}</strong><span>Events</span></div>
        <div><strong>${uniqueHosts(sorted).length}</strong><span>Hosts</span></div>
        <div><strong>${uniqueUsers(sorted).length}</strong><span>Accounts</span></div>
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

    <div class="ciso-metro" id="ciso-metro"></div>
  `;

  container.appendChild(wrap);

  const chevronsEl = wrap.querySelector('#ciso-chevrons');
  phases.forEach((phase, i) => {
    const el = document.createElement('article');
    el.className = 'ciso-chevron';
    el.style.setProperty('--phase-color', phase.color);
    el.innerHTML = `
      <div class="chevron-head" style="background:${phase.color}">
        <span class="chevron-num">${phase.id}</span>
        <span class="chevron-icon">${PHASE_ICONS[i] || '•'}</span>
      </div>
      <div class="chevron-body">
        <h3>${escapeHtml(displayText(phase.name, TEXT_LIMITS.chevronTitle))}</h3>
        <time>${escapeHtml(phase.range)}</time>
        <p>${escapeHtml(derivePhaseSummary(phase.events))}</p>
      </div>
    `;
    chevronsEl.appendChild(el);
  });

  const axisEl = wrap.querySelector('#ciso-time-axis');
  phases.forEach((p) => {
    const mark = document.createElement('span');
    mark.textContent = p.range.split('–')[0]?.trim() || '';
    mark.style.color = p.color;
    axisEl.appendChild(mark);
  });

  const msEl = wrap.querySelector('#ciso-milestones');
  milestones.forEach((m, i) => {
    const phase = findPhase(phaseDefs, m.phase);
    const node = document.createElement('div');
    node.className = 'ciso-ms-card';
    node.dataset.eventId = m.id;
    node.style.borderColor = phase.color;
    node.innerHTML = `
      <div class="ms-num" style="background:${phase.color}">${i + 1}</div>
      <time style="color:${phase.color}">${formatDateRange(m.timestampStart, m.timestampEnd)}</time>
      <p>${escapeHtml(displayEventDetails(m, TEXT_LIMITS.milestone))}</p>
    `;
    msEl.appendChild(node);
  });

  const colsEl = wrap.querySelector('#ciso-columns');
  phases.forEach((phase) => {
    const col = document.createElement('div');
    col.className = 'ciso-col';
    col.innerHTML = `
      <h4 style="color:${phase.color}">${escapeHtml(phase.name.split(' ')[0])}</h4>
      <ul>${phase.events.slice(0, 6).map((e) => `<li>${escapeHtml(displayEventDetails(e, TEXT_LIMITS.columnItem))}</li>`).join('') || '<li class="muted">No events</li>'}</ul>
    `;
    colsEl.appendChild(col);
  });

  renderMetroTimeline(wrap.querySelector('#ciso-metro'), sorted, phaseDefs);
  renderSwimlane(wrap, sorted, phaseDefs);
}

function renderMetroTimeline(el, events, phaseDefs) {
  if (!el || events.length < 2) return;
  const nodes = pickMilestones(events, phaseDefs, 10);
  const width = 1100;
  const height = 100;
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${width} ${height}`).attr('class', 'ciso-metro-svg');

  const x = d3.scalePoint().domain(nodes.map((_, i) => i)).range([60, width - 60]);
  const line = d3.line().curve(d3.curveMonotoneX);

  svg.append('path')
    .attr('d', line(nodes.map((_, i) => [x(i), 50])))
    .attr('fill', 'none')
    .attr('stroke', '#cbd5e1')
    .attr('stroke-width', 6)
    .attr('stroke-linecap', 'round');

  nodes.forEach((n, i) => {
    const color = findPhase(phaseDefs, n.phase).color;
    const g = svg.append('g').attr('transform', `translate(${x(i)},50)`);
    g.append('circle').attr('r', 10).attr('fill', color).attr('stroke', '#fff').attr('stroke-width', 2);
    g.append('text').attr('y', 28).attr('text-anchor', 'middle').attr('font-size', 8).attr('fill', '#64748b')
      .text(formatDateRange(n.timestampStart, n.timestampEnd).slice(0, 12));
  });
}

function renderSwimlane(wrap, events, phaseDefs) {
  const svgWrap = document.createElement('div');
  svgWrap.className = 'ciso-swimlane';
  wrap.appendChild(svgWrap);

  const width = 1100;
  const margin = { top: 16, right: 20, bottom: 28, left: 130 };
  const subRowH = 16;
  const lanePad = 5;
  const laneGap = 4;

  const times = events.flatMap((e) => {
    const iv = eventInterval(e);
    return [iv.start, iv.end];
  }).filter(Number.isFinite);

  const phaseLanes = phaseDefs.map((phase) => {
    const phaseEvents = events.filter((e) => e.phase === phase.id);
    const laid = assignIntervalRows(
      phaseEvents.map((event) => ({ event, ...eventInterval(event) })),
    );
    const rowCount = laid.length ? Math.max(...laid.map((i) => i.row)) + 1 : 1;
    return {
      phase,
      laid,
      rowCount,
      laneHeight: Math.max(24, rowCount * subRowH + lanePad * 2),
    };
  });

  const lanesHeight = phaseLanes.reduce((sum, lane) => sum + lane.laneHeight + laneGap, 0);
  const height = Math.max(120, margin.top + lanesHeight + margin.bottom);

  const svg = d3.select(svgWrap).append('svg').attr('viewBox', `0 0 ${width} ${height}`);
  const x = d3.scaleTime().domain(d3.extent(times)).range([margin.left, width - margin.right]);

  let yCursor = margin.top;
  phaseLanes.forEach(({ phase, laid, rowCount, laneHeight }) => {
    svg.append('text')
      .attr('x', 6)
      .attr('y', yCursor + laneHeight / 2)
      .attr('dy', '0.35em')
      .attr('fill', phase.color)
      .attr('font-size', 9)
      .text(displayText(phase.name, TEXT_LIMITS.phaseLabel));

    const innerH = laneHeight - lanePad * 2;
    const barH = innerH / rowCount - 2;

    laid.forEach(({ event: e, row, start, end }) => {
      const x0 = x(start);
      const barW = Math.max(4, x(end) - x0);
      const barY = yCursor + lanePad + row * (innerH / rowCount) + 1;

      svg.append('rect')
        .attr('data-event-id', e.id)
        .attr('data-lane', phase.id)
        .attr('data-viz-bar', 'swimlane')
        .attr('x', x0)
        .attr('y', barY)
        .attr('width', barW)
        .attr('height', Math.max(4, barH))
        .attr('rx', 2)
        .attr('fill', phase.color)
        .attr('opacity', 0.88);
    });

    yCursor += laneHeight + laneGap;
  });

  svg.append('g').attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat('%b %Y')));
}
