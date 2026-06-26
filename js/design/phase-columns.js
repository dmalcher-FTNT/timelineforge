import * as d3 from 'd3';
import {
  formatDateRange, sortEvents, timelineSpanMonths, uniqueHosts, uniqueUsers,
} from '../utils.js';
import { findPhase, resolvePhases } from '../phases.js';
import { computePhaseSummaries, escapeHtml, displayText, displayEventDetails, TEXT_LIMITS, vizTitleHtml } from './viz-helpers.js';
import {
  PHASE_ICONS,
  buildExecutiveTakeaway,
  deriveAttackerObjectives,
  derivePhaseSummary,
  pickMilestones,
  pickPhaseHighlights,
} from './phase-content.js';

export function renderPhaseColumns(container, { events, meta }) {
  const sorted = sortEvents(events);
  const phaseDefs = resolvePhases(meta);
  const phases = computePhaseSummaries(sorted, phaseDefs);
  const spineNodes = pickMilestones(sorted, phaseDefs, 10);
  const objectives = deriveAttackerObjectives(sorted);

  const wrap = document.createElement('div');
  wrap.className = 'viz-phase-columns';

  wrap.innerHTML = `
    <header class="viz-header">
      <div>${vizTitleHtml(meta)}</div>
    </header>

    <section class="phase-columns-row" id="phase-columns-row"></section>
    <section class="phase-spine-wrap" id="phase-spine"></section>

    <section class="ciso-bottom-panels phase-columns-bottom">
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
  `;

  container.appendChild(wrap);

  const rowEl = wrap.querySelector('#phase-columns-row');
  phases.forEach((phase, i) => {
    const milestones = pickPhaseHighlights(phase.events, 3);
    const col = document.createElement('article');
    col.className = 'phase-column';
    col.style.setProperty('--phase-color', phase.color);
    col.innerHTML = `
      <div class="phase-column-head" style="background:${phase.color}">
        <span class="phase-column-num">${phase.id}</span>
        <span class="phase-column-icon">${PHASE_ICONS[i] || '•'}</span>
      </div>
      <div class="phase-column-body">
        <h3>${escapeHtml(displayText(phase.name, TEXT_LIMITS.chevronTitle))}</h3>
        <time>${escapeHtml(phase.range)}</time>
        <p class="phase-column-summary">${escapeHtml(derivePhaseSummary(phase.events))}</p>
        <div class="phase-column-milestones">
          <h4>Key Milestones</h4>
          <ul>
            ${milestones.length
    ? milestones.map((m) => `<li><time>${escapeHtml(formatDateRange(m.timestampStart, m.timestampEnd))}</time> ${escapeHtml(displayEventDetails(m, TEXT_LIMITS.milestone))}</li>`).join('')
    : '<li class="muted">No events</li>'}
          </ul>
        </div>
      </div>
    `;
    rowEl.appendChild(col);
  });

  renderPhaseSpine(wrap.querySelector('#phase-spine'), spineNodes, phaseDefs);
}

function renderPhaseSpine(el, nodes, phaseDefs) {
  if (!el || nodes.length < 1) return;

  const width = 1100;
  const height = 130;
  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${width} ${height}`).attr('class', 'phase-spine-svg');

  const x = d3.scalePoint().domain(nodes.map((_, i) => i)).range([48, width - 48]);
  const line = d3.line().curve(d3.curveMonotoneX);

  svg.append('path')
    .attr('d', line(nodes.map((_, i) => [x(i), 36])))
    .attr('fill', 'none')
    .attr('stroke', '#cbd5e1')
    .attr('stroke-width', 5)
    .attr('stroke-linecap', 'round');

  svg.append('path')
    .attr('d', `M ${x(nodes.length - 1)} 36 L ${width - 28} 36`)
    .attr('fill', 'none')
    .attr('stroke', '#EE3124')
    .attr('stroke-width', 3)
    .attr('stroke-linecap', 'round')
    .attr('marker-end', 'url(#spine-arrow)');

  svg.append('defs').append('marker')
    .attr('id', 'spine-arrow')
    .attr('viewBox', '0 0 10 10')
    .attr('refX', 8)
    .attr('refY', 5)
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M 0 0 L 10 5 L 0 10 z')
    .attr('fill', '#EE3124');

  nodes.forEach((n, i) => {
    const phase = findPhase(phaseDefs, n.phase);
    const g = svg.append('g')
      .attr('transform', `translate(${x(i)},36)`)
      .attr('data-event-id', n.id);

    g.append('circle').attr('r', 11).attr('fill', phase.color).attr('stroke', '#fff').attr('stroke-width', 2);
    g.append('text').attr('text-anchor', 'middle').attr('dy', '0.35em').attr('fill', '#fff').attr('font-size', 8).attr('font-weight', 700)
      .text(i + 1);

    const label = `${formatDateRange(n.timestampStart, n.timestampEnd).slice(0, 14)}: ${displayEventDetails(n, 42)}`;
    g.append('text')
      .attr('y', 28)
      .attr('text-anchor', 'middle')
      .attr('font-size', 7)
      .attr('fill', '#475569')
      .text(displayText(label, 52));
  });
}
