import { displayEventDetails } from '../event-details.js';
import { CATEGORIES, sortEvents } from '../utils.js';
import { escapeHtml, vizTitleHtml } from './viz-helpers.js';

export async function renderMermaidFlow(container, { events, meta }) {
  container.innerHTML = '';
  const sorted = sortEvents(events);
  const wrap = document.createElement('div');
  wrap.className = 'viz-mermaid';

  const diagram = buildSequenceDiagram(sorted);
  wrap.innerHTML = `
    ${vizTitleHtml(meta) ? `<header class="viz-header"><div>${vizTitleHtml(meta)}</div></header>` : ''}
    <pre class="mermaid-source">${escapeHtml(diagram)}</pre>
    <div class="mermaid-render" id="mermaid-target"></div>
  `;
  container.appendChild(wrap);

  const target = wrap.querySelector('#mermaid-target');
  target.textContent = diagram;

  try {
    const mermaid = (await import('mermaid')).default;
    mermaid.initialize({
      startOnLoad: false,
      theme: meta.theme === 'dark' ? 'dark' : 'neutral',
      securityLevel: 'strict',
    });
    const { svg } = await mermaid.render(`mermaid-${Date.now()}`, diagram);
    target.innerHTML = svg;
    wrap.querySelector('.mermaid-source')?.remove();
  } catch (err) {
    target.innerHTML = `<p class="mermaid-fallback">Mermaid render failed — source diagram shown above. (${escapeHtml(err.message)})</p>`;
  }
}

function buildSequenceDiagram(events) {
  const lines = ['sequenceDiagram'];
  const participants = new Set(['Analyst']);

  events.forEach((e, i) => {
    const host = sanitizeId(e.hostname || `Host${i}`);
    participants.add(host);
  });

  [...participants].forEach((p) => lines.push(`    participant ${p}`));

  let prevHost = 'Analyst';
  events.forEach((e, i) => {
    const host = sanitizeId(e.hostname || `Host${i}`);
    const cat = CATEGORIES[e.category]?.label || 'Event';
    const label = displayEventDetails(e, 60).replace(/"/g, "'");
    const arrow = i % 2 === 0 ? '->>' : '-->>';
    lines.push(`    ${prevHost}${arrow}${host}: ${label}`);
    prevHost = host;
  });

  return lines.join('\n');
}

function sanitizeId(s) {
  return s.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 24) || 'System';
}

export function getMermaidSource(events, meta) {
  return buildSequenceDiagram(sortEvents(events));
}
