import * as d3 from 'd3';
import { CATEGORIES } from '../utils.js';
import { escapeHtml, displayText, displayEventDetails, TEXT_LIMITS, vizTitleHtml } from './viz-helpers.js';

export function renderAttackFlow(container, { events, meta }) {
  container.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'viz-attack-flow';
  wrap.innerHTML = `
    ${vizTitleHtml(meta) ? `<header class="viz-header"><div>${vizTitleHtml(meta)}</div></header>` : ''}
    <div class="attack-flow-svg" id="attack-flow-svg"></div>
  `;
  container.appendChild(wrap);

  const nodes = events.map((e, i) => ({
    id: e.id,
    index: i + 1,
    label: displayEventDetails(e, TEXT_LIMITS.attackNode),
    category: e.category,
    color: (CATEGORIES[e.category] || CATEGORIES.reconnaissance).color,
  }));

  const nodeIds = new Set(nodes.map((n) => n.id));
  const links = [];
  events.forEach((e) => {
    (e.linkedEventIds || []).forEach((target) => {
      if (nodeIds.has(target)) links.push({ source: e.id, target });
    });
  });

  if (!nodes.length) return;

  const width = 1000;
  const height = Math.max(400, nodes.length * 35);
  const svg = d3.select(wrap.querySelector('#attack-flow-svg'))
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`);

  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id((d) => d.id).distance(90))
    .force('charge', d3.forceManyBody().strength(-280))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('y', d3.forceY((d) => 40 + d.index * (height - 80) / nodes.length).strength(0.08));

  const link = svg.append('g').selectAll('line').data(links).join('line')
    .attr('stroke', '#94a3b8').attr('stroke-width', 2).attr('marker-end', 'url(#arrow)');

  svg.append('defs').append('marker')
    .attr('id', 'arrow').attr('viewBox', '0 -5 10 10').attr('refX', 22)
    .attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
    .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#94a3b8');

  const node = svg.append('g').selectAll('g').data(nodes).join('g')
    .attr('data-event-id', (d) => d.id)
    .call(d3.drag()
    .on('start', (ev, d) => { if (!ev.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
    .on('drag', (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
    .on('end', (ev, d) => { if (!ev.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }));

  node.append('circle').attr('r', 14).attr('fill', (d) => d.color).attr('stroke', '#fff').attr('stroke-width', 2);
  node.append('text').attr('text-anchor', 'middle').attr('dy', '0.35em').attr('fill', '#fff').attr('font-size', 9).text((d) => d.index);
  node.append('text').attr('x', 20).attr('y', 4).attr('font-size', 9).attr('fill', '#334155').text((d) => d.label);

  simulation.on('tick', () => {
    link.attr('x1', (d) => d.source.x).attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x).attr('y2', (d) => d.target.y);
    node.attr('transform', (d) => `translate(${d.x},${d.y})`);
  });
}
