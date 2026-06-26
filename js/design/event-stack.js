import { CATEGORIES, formatDateRange } from '../utils.js';
import { escapeHtml, displayText, displayEventDetails, TEXT_LIMITS, vizTitleHtml } from './viz-helpers.js';

/** Compact single-column vertical timeline. */
export function renderEventStack(container, { events, meta }) {
  const wrap = document.createElement('div');
  wrap.className = 'viz-event-stack';

  wrap.innerHTML = `
    <header class="viz-header">
      <div>${vizTitleHtml(meta)}</div>
      <div class="viz-legend category-legend">
        ${Object.entries(CATEGORIES).map(([k, v]) => `<span><i style="background:${v.color}">${v.icon}</i>${v.label}</span>`).join('')}
      </div>
    </header>
    <ol class="event-stack-list"></ol>
  `;

  container.appendChild(wrap);
  const list = wrap.querySelector('.event-stack-list');

  events.forEach((evt, i) => {
    const cat = CATEGORIES[evt.category] || CATEGORIES.reconnaissance;
    const item = document.createElement('li');
    item.className = 'event-stack-item';
    item.dataset.eventId = evt.id;
    item.innerHTML = `
      <div class="event-stack-rail" style="--rail-color:${cat.color}">
        <span class="event-stack-seq">${i + 1}</span>
      </div>
      <div class="event-stack-body">
        <div class="event-stack-head">
          <time style="color:${cat.color}">${formatDateRange(evt.timestampStart, evt.timestampEnd)}</time>
          <span class="event-stack-cat">${escapeHtml(cat.label)}</span>
          ${evt.technique ? `<span class="event-stack-mitre">${escapeHtml(evt.technique)}</span>` : ''}
        </div>
        <div class="event-stack-meta">
          <span title="${escapeHtml(evt.hostname)}">🖥 ${escapeHtml(displayText(evt.hostname, TEXT_LIMITS.host))}</span>
          <span title="${escapeHtml(evt.username)}">👤 ${escapeHtml(displayText(evt.username, TEXT_LIMITS.user))}</span>
        </div>
        <p class="event-stack-details">${escapeHtml(displayEventDetails(evt, TEXT_LIMITS.socDetails))}</p>
      </div>
    `;
    list.appendChild(item);
  });
}
