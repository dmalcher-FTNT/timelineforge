import * as d3 from 'd3';
import { CATEGORIES, formatDateRange } from '../utils.js';
import { escapeHtml, displayText, displayEventDetails, TEXT_LIMITS, vizTitleHtml } from './viz-helpers.js';

export function renderSocDetails(container, { events, meta, vizStyle }) {
  const sorted = events;
  const fullWidth = vizStyle === 'case-full';
  const wrap = document.createElement('div');
  wrap.className = `viz-soc${fullWidth ? ' viz-soc-full' : ''}`;

  wrap.innerHTML = `
    <header class="viz-header">
      <div>
        ${vizTitleHtml(meta)}
      </div>
      <div class="viz-legend category-legend">
        ${Object.entries(CATEGORIES).map(([k, v]) => `<span><i style="background:${v.color}">${v.icon}</i>${v.label}</span>`).join('')}
      </div>
    </header>
    <div class="soc-timeline" id="soc-timeline"></div>
    <section class="soc-takeaways">
      <h3>Key Takeaways</h3>
      <ul>${buildTakeaways(sorted).map((t) => `<li><span style="color:${t.color}">${t.icon}</span> ${escapeHtml(t.text)}</li>`).join('')}</ul>
    </section>
  `;

  container.appendChild(wrap);
  const timelineEl = wrap.querySelector('#soc-timeline');

  sorted.forEach((evt, i) => {
    const cat = CATEGORIES[evt.category] || CATEGORIES.reconnaissance;
    const side = fullWidth ? 'full' : (i % 2 === 0 ? 'left' : 'right');
    const card = document.createElement('article');
    card.className = `soc-card soc-${side}`;
    card.dataset.eventId = evt.id;
    card.innerHTML = `
      <div class="soc-rail" style="background:${cat.color}">
        <span class="soc-seq">${i + 1}</span>
        <span class="soc-icon">${cat.icon}</span>
      </div>
      <div class="soc-content">
        <time style="color:${cat.color}">${formatDateRange(evt.timestampStart, evt.timestampEnd)}</time>
        <div class="soc-meta">
          <span title="${escapeHtml(evt.hostname)}">🖥 ${escapeHtml(displayText(evt.hostname, TEXT_LIMITS.host))}</span>
          <span title="${escapeHtml(evt.username)}">👤 ${escapeHtml(displayText(evt.username, TEXT_LIMITS.user))}</span>
        </div>
        <p>${escapeHtml(displayEventDetails(evt, TEXT_LIMITS.socDetails))}</p>
        <div class="soc-tags">
          <span class="soc-cat">${cat.label}</span>
          ${evt.technique ? `<span class="soc-mitre">${escapeHtml(evt.technique)}</span>` : ''}
        </div>
      </div>
    `;
    timelineEl.appendChild(card);
  });
}

function buildTakeaways(events) {
  const first = events[0];
  const last = events[events.length - 1];
  const exfil = events.find((e) => e.category === 'exfiltration');
  const impact = events.filter((e) => e.category === 'impact');
  const detection = events.filter((e) => e.category === 'detection');

  return [
    first && { ...CATEGORIES['initial-access'], text: displayText(`Initial compromise: ${displayEventDetails(first, TEXT_LIMITS.socTakeaway)}`, TEXT_LIMITS.socTakeaway) },
    exfil && { ...CATEGORIES.exfiltration, text: displayEventDetails(exfil, TEXT_LIMITS.socTakeaway) },
    impact.length && { ...CATEGORIES.impact, text: `${impact.length} impact event(s) including wiper/GPO activity.` },
    detection.length && { ...CATEGORIES.detection, text: displayText(`Detection/containment: ${displayEventDetails(detection[detection.length - 1], TEXT_LIMITS.socTakeaway)}`, TEXT_LIMITS.socTakeaway) },
  ].filter(Boolean);
}

export function renderFahrplan(container, { events, meta }) {
  const sorted = events;
  container.innerHTML = '';
  const svg = d3.select(container).append('svg').attr('class', 'viz-fahrplan');
  const width = 1100;
  const height = Math.max(600, sorted.length * 70 + 120);
  svg.attr('viewBox', `0 0 ${width} ${height}`);

  const stations = sorted.map((e, i) => ({
    ...e,
    index: i,
    x: 120 + (i % 4) * 240,
    y: 80 + Math.floor(i / 4) * 130,
    cat: CATEGORIES[e.category] || CATEGORIES.reconnaissance,
  }));

  const line = d3.line().curve(d3.curveCatmullRom.alpha(0.5));
  const pathData = stations.map((s) => [s.x, s.y]);

  svg.append('path')
    .attr('d', line(pathData))
    .attr('fill', 'none')
    .attr('stroke', '#cbd5e1')
    .attr('stroke-width', 8)
    .attr('stroke-linecap', 'round');

  stations.forEach((s, i) => {
    const g = svg.append('g').attr('transform', `translate(${s.x},${s.y})`).attr('data-event-id', s.id);

    g.append('circle').attr('r', 18).attr('fill', s.cat.color).attr('stroke', '#fff').attr('stroke-width', 3);
    g.append('text').attr('text-anchor', 'middle').attr('dy', '0.35em').attr('fill', '#fff').attr('font-size', 11).text(i + 1);

    const labelX = i % 2 === 0 ? 28 : -28;
    const anchor = i % 2 === 0 ? 'start' : 'end';

    g.append('text').attr('x', labelX).attr('y', -24).attr('text-anchor', anchor).attr('font-size', 10).attr('font-weight', 600).attr('fill', s.cat.color)
      .text(formatDateRange(s.timestampStart, s.timestampEnd).slice(0, 22));

    g.append('text').attr('x', labelX).attr('y', -8).attr('text-anchor', anchor).attr('font-size', 9).attr('fill', '#64748b')
      .text(displayText(`${s.hostname} · ${s.username}`, TEXT_LIMITS.metaPair));

    const words = displayEventDetails(s, TEXT_LIMITS.socDetails).split(/\s+/);
    let line = '';
    let dy = 8;
    words.forEach((w) => {
      const test = `${line} ${w}`.trim();
      if (test.length > 42) {
        g.append('text').attr('x', labelX).attr('y', dy).attr('text-anchor', anchor).attr('font-size', 9).attr('fill', '#334155').text(line);
        line = w;
        dy += 12;
      } else line = test;
    });
    if (line) g.append('text').attr('x', labelX).attr('y', dy).attr('text-anchor', anchor).attr('font-size', 9).attr('fill', '#334155')
      .text(displayText(line, 48));
  });

  svg.append('text').attr('x', width / 2).attr('y', 36).attr('text-anchor', 'middle').attr('font-size', 18).attr('font-weight', 700).attr('fill', '#0f172a')
    .text(meta.title || 'Incident Fahrplan');
}
