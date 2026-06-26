import * as d3 from 'd3';
import { CATEGORIES, sortEvents } from '../utils.js';
import { DEFAULT_ACCENT } from '../theme.js';
import { diffTimelines, formatDiffSummary } from '../edit/timeline-diff.js';
import { escapeHtml, displayText, displayEventDetails, TEXT_LIMITS } from './viz-helpers.js';

export function renderCompare(container, { events, meta, compareTimeline, compareView = 'gantt' }) {
  container.innerHTML = '';
  if (!compareTimeline?.events?.length) {
    container.innerHTML = `<div class="compare-empty"><p>Load a comparison timeline in DESIGN options to use this view.</p></div>`;
    return;
  }

  const a = sortEvents(events);
  const b = sortEvents(compareTimeline.events);
  const diff = diffTimelines(b, a);
  const wrap = document.createElement('div');
  wrap.className = 'viz-compare';

  wrap.innerHTML = `
    <header class="viz-header">
      <div>
        <h2>${escapeHtml(meta.title || 'Current')} vs ${escapeHtml(compareTimeline.meta?.title || 'Baseline')}</h2>
      </div>
    </header>
    <div class="compare-diff-banner">
      <strong>Diff:</strong> ${escapeHtml(formatDiffSummary(diff))}
      <span class="compare-diff-detail">
        ${diff.summary.unchanged} unchanged · baseline ${diff.summary.baseCount} → current ${diff.summary.currentCount}
      </span>
    </div>
    <div class="compare-legend">
      <span><i style="background:${meta.accentColor || DEFAULT_ACCENT}"></i>${escapeHtml(meta.title || 'Primary')} (${a.length})</span>
      <span><i style="background:#ea580c"></i>${escapeHtml(compareTimeline.meta?.title || 'Baseline')} (${b.length})</span>
    </div>
    <div id="compare-body"></div>
    <div class="compare-stats">
      <div><strong>${overlapDays(a, b)}</strong><span>Overlapping days</span></div>
      <div><strong>${uniqueCategories(a, b)}</strong><span>Shared categories</span></div>
      <div><strong>${a.length + b.length}</strong><span>Combined events</span></div>
    </div>
  `;
  container.appendChild(wrap);

  const body = wrap.querySelector('#compare-body');
  if (compareView === 'split') {
    renderSplitTimeline(body, a, b, meta, compareTimeline.meta, diff);
  } else if (compareView === 'category') {
    renderCategoryChart(body, a, b, meta, compareTimeline.meta);
  } else {
    body.id = 'compare-chart';
    renderDualGantt(body, a, b, meta, compareTimeline.meta);
  }
}

function renderSplitTimeline(el, eventsA, eventsB, metaA, metaB, diff) {
  el.className = 'compare-split';
  const addedIds = new Set(diff.added.map((e) => e.id));
  const removedIds = new Set(diff.removed.map((e) => e.id));
  const changedIds = new Set(
    diff.changed.map((c) => c?.after?.id || c?.before?.id).filter(Boolean),
  );

  const col = (title, list, lane, badge) => {
    const cards = list.map((e) => {
      let status = '';
      if (lane === 'a' && addedIds.has(e.id)) status = 'added';
      if (lane === 'a' && changedIds.has(e.id)) status = 'changed';
      if (lane === 'b' && removedIds.has(e.id)) status = 'removed';
      const cat = CATEGORIES[e.category] || CATEGORIES.reconnaissance;
      return `
        <div class="compare-card compare-card-${status}" style="border-left-color:${cat.color}">
          <time>${escapeHtml((e.timestampStart || '').slice(0, 16))}</time>
          <strong>${escapeHtml(e.hostname || '')}</strong>
          <p>${escapeHtml(displayEventDetails(e, TEXT_LIMITS.compareCard))}</p>
          ${status ? `<span class="compare-card-badge">${status}</span>` : ''}
        </div>`;
    }).join('');
    return `<div class="compare-split-col"><h4>${escapeHtml(title)} ${badge}</h4>${cards || '<p class="compare-empty-col">No events</p>'}</div>`;
  };

  el.innerHTML = [
    col(metaA.title || 'Current', eventsA, 'a', `<span class="compare-lane-a">${eventsA.length}</span>`),
    col(metaB.title || 'Baseline', eventsB, 'b', `<span class="compare-lane-b">${eventsB.length}</span>`),
  ].join('');
}

function renderCategoryChart(el, eventsA, eventsB, metaA, metaB) {
  el.className = 'compare-category-chart';
  const cats = [...new Set([...eventsA, ...eventsB].map((e) => e.category))].sort();
  const countA = Object.fromEntries(cats.map((c) => [c, eventsA.filter((e) => e.category === c).length]));
  const countB = Object.fromEntries(cats.map((c) => [c, eventsB.filter((e) => e.category === c).length]));
  const max = Math.max(1, ...cats.flatMap((c) => [countA[c], countB[c]]));

  const width = 900;
  const rowH = 28;
  const height = cats.length * rowH + 60;
  const margin = { top: 20, left: 140, right: 20, bottom: 30 };
  const barMax = width - margin.left - margin.right;

  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${width} ${height}`);
  const y = d3.scaleBand().domain(cats).range([margin.top, height - margin.bottom]).padding(0.2);
  const x = d3.scaleLinear().domain([0, max]).range([0, barMax / 2 - 8]);

  cats.forEach((cat) => {
    const label = CATEGORIES[cat]?.label || cat;
    const yi = y(cat);
    const bh = y.bandwidth() / 2 - 2;
    svg.append('text').attr('x', margin.left - 6).attr('y', yi + y.bandwidth() / 2).attr('dy', '0.35em')
      .attr('text-anchor', 'end').attr('font-size', 9).text(displayText(label, TEXT_LIMITS.phaseLabel));
    svg.append('rect').attr('x', margin.left).attr('y', yi).attr('width', x(countA[cat])).attr('height', bh)
      .attr('fill', metaA.accentColor || DEFAULT_ACCENT).attr('rx', 3);
    svg.append('rect').attr('x', margin.left + barMax / 2 + 8).attr('y', yi + bh + 4).attr('width', x(countB[cat])).attr('height', bh)
      .attr('fill', '#ea580c').attr('rx', 3);
    svg.append('text').attr('x', margin.left + x(countA[cat]) + 4).attr('y', yi + bh / 2).attr('dy', '0.35em')
      .attr('font-size', 8).text(countA[cat]);
    svg.append('text').attr('x', margin.left + barMax / 2 + 8 + x(countB[cat]) + 4).attr('y', yi + bh + 4 + bh / 2).attr('dy', '0.35em')
      .attr('font-size', 8).text(countB[cat]);
  });

  svg.append('text').attr('x', margin.left).attr('y', 12).attr('font-size', 9).attr('fill', metaA.accentColor || DEFAULT_ACCENT)
    .text(displayText(metaA.title || 'Current', TEXT_LIMITS.compareTitle));
  svg.append('text').attr('x', margin.left + barMax / 2 + 8).attr('y', 12).attr('font-size', 9).attr('fill', '#ea580c')
    .text(displayText(metaB.title || 'Baseline', TEXT_LIMITS.compareTitle));
}

function renderDualGantt(el, eventsA, eventsB, metaA, metaB) {
  const width = 1100;
  const rowH = 22;
  const height = (eventsA.length + eventsB.length) * rowH + 100;
  const margin = { top: 50, right: 30, bottom: 40, left: 220 };

  const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${width} ${height}`);

  const allTimes = [...eventsA, ...eventsB].flatMap((e) => [
    Date.parse(e.timestampStart),
    e.timestampEnd ? Date.parse(e.timestampEnd) : Date.parse(e.timestampStart),
  ]).filter(Boolean);

  const x = d3.scaleTime().domain(d3.extent(allTimes)).range([margin.left, width - margin.right]);

  const rows = [
    ...eventsA.map((e) => ({ ...e, lane: 'a', color: metaA.accentColor || DEFAULT_ACCENT })),
    ...eventsB.map((e) => ({ ...e, lane: 'b', color: '#ea580c' })),
  ];

  const y = d3.scaleBand().domain(rows.map((_, i) => i)).range([margin.top, height - margin.bottom]).padding(0.15);

  svg.append('text').attr('x', margin.left).attr('y', 30).attr('font-size', 11).attr('font-weight', 600)
    .attr('fill', metaA.accentColor || DEFAULT_ACCENT).text(displayText(metaA.title || 'Primary', 40));
  svg.append('text').attr('x', margin.left).attr('y', 30 + eventsA.length * rowH * 0.55)
    .attr('font-size', 11).attr('font-weight', 600).attr('fill', '#ea580c')
    .text(displayText(metaB.title || 'Compare', 40));

  svg.append('g').attr('transform', `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(8).tickFormat(d3.timeFormat('%b %Y')));

  rows.forEach((e, i) => {
    const cat = CATEGORIES[e.category] || CATEGORIES.reconnaissance;
    const x0 = x(Date.parse(e.timestampStart));
    const x1 = e.timestampEnd ? x(Date.parse(e.timestampEnd)) : x0 + 4;

    svg.append('text').attr('x', margin.left - 8).attr('y', y(i) + y.bandwidth() / 2).attr('dy', '0.35em')
      .attr('text-anchor', 'end').attr('font-size', 8).attr('fill', '#475569')
      .text(`${e.lane === 'a' ? 'A' : 'B'} · ${(e.hostname || '').slice(0, 16)}`);

    svg.append('rect').attr('x', x0).attr('y', y(i)).attr('width', Math.max(3, x1 - x0))
      .attr('height', y.bandwidth()).attr('rx', 3)
      .attr('fill', e.lane === 'a' ? (metaA.accentColor || cat.color) : '#ea580c')
      .attr('opacity', 0.85);
  });
}

function overlapDays(a, b) {
  const ta = a.flatMap((e) => [Date.parse(e.timestampStart), e.timestampEnd ? Date.parse(e.timestampEnd) : Date.parse(e.timestampStart)]);
  const tb = b.flatMap((e) => [Date.parse(e.timestampStart), e.timestampEnd ? Date.parse(e.timestampEnd) : Date.parse(e.timestampStart)]);
  const minA = Math.min(...ta);
  const maxA = Math.max(...ta);
  const minB = Math.min(...tb);
  const maxB = Math.max(...tb);
  const overlap = Math.min(maxA, maxB) - Math.max(minA, minB);
  return overlap > 0 ? Math.round(overlap / 86400000) : 0;
}

function uniqueCategories(a, b) {
  const ca = new Set(a.map((e) => e.category));
  return b.filter((e) => ca.has(e.category)).length;
}
