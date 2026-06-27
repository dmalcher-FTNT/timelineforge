import { techniqueLabel } from '../data/mitre-techniques.js';
import { escapeHtml, vizTitleHtml } from './viz-helpers.js';

const PHASES = [1, 2, 3, 4, 5];

function heatColor(count, max) {
  if (!count) return 'transparent';
  const t = count / max;
  const alpha = 0.18 + t * 0.72;
  return `rgba(238, 49, 36, ${alpha.toFixed(2)})`;
}

/** MITRE technique × kill-chain phase coverage heatmap. */
export function renderMitreHeatmap(container, { events, meta }) {
  const byTechnique = new Map();

  events.forEach((evt) => {
    const tech = (evt.technique || '').trim().toUpperCase();
    if (!tech) return;
    if (!byTechnique.has(tech)) {
      byTechnique.set(tech, { phaseCounts: Object.fromEntries(PHASES.map((p) => [p, 0])), total: 0 });
    }
    const row = byTechnique.get(tech);
    const phase = PHASES.includes(evt.phase) ? evt.phase : null;
    if (phase) row.phaseCounts[phase] += 1;
    row.total += 1;
  });

  const rows = [...byTechnique.entries()].sort((a, b) => b[1].total - a[1].total);
  const maxCell = Math.max(1, ...rows.flatMap(([, r]) => PHASES.map((p) => r.phaseCounts[p])));

  const wrap = document.createElement('div');
  wrap.className = 'viz-mitre-heatmap';

  if (!rows.length) {
    wrap.innerHTML = `
      <header class="viz-header"><div>${vizTitleHtml(meta)}</div></header>
      <p class="mitre-heatmap-empty">No MITRE technique IDs on events yet — add techniques in Refine or run quality recommendations.</p>
    `;
    container.appendChild(wrap);
    return;
  }

  const phaseHeaders = PHASES.map((p) => `<th scope="col">Phase ${p}</th>`).join('');
  const bodyRows = rows.map(([tech, row]) => {
    const cells = PHASES.map((p) => {
      const count = row.phaseCounts[p];
      return `<td class="mitre-heatmap-cell" style="background:${heatColor(count, maxCell)}" title="${count} event${count === 1 ? '' : 's'}">${count || ''}</td>`;
    }).join('');
    return `
      <tr>
        <th scope="row" class="mitre-heatmap-tech" title="${escapeHtml(techniqueLabel(tech))}">${escapeHtml(tech)}</th>
        ${cells}
        <td class="mitre-heatmap-total">${row.total}</td>
      </tr>
    `;
  }).join('');

  wrap.innerHTML = `
    <header class="viz-header">
      <div>${vizTitleHtml(meta)}</div>
      <p class="mitre-heatmap-lead">Event counts by MITRE technique and kill-chain phase — darker cells mean more coverage.</p>
    </header>
    <div class="mitre-heatmap-scroll">
      <table class="mitre-heatmap-table">
        <thead>
          <tr>
            <th scope="col">Technique</th>
            ${phaseHeaders}
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>
  `;

  container.appendChild(wrap);
}
