import { CATEGORIES, formatDateRange, sortEvents } from '../utils.js';
import { escapeHtml, displayText, displayEventDetails, TEXT_LIMITS, vizTitleHtml } from './viz-helpers.js';

/** Table-first evidence log for analysts and report appendices. */
export function renderEvidenceTable(container, { events, meta }) {
  const sorted = sortEvents(events);
  const wrap = document.createElement('div');
  wrap.className = 'viz-evidence-table';

  wrap.innerHTML = `
    <header class="viz-header">
      <div>${vizTitleHtml(meta)}</div>
      <p class="evidence-table-count">${sorted.length} event${sorted.length === 1 ? '' : 's'}</p>
    </header>
    <div class="evidence-table-wrap">
      <table class="evidence-table">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Time</th>
            <th scope="col">Host</th>
            <th scope="col">User</th>
            <th scope="col">Category</th>
            <th scope="col">MITRE</th>
            <th scope="col">Details</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  `;

  container.appendChild(wrap);
  const tbody = wrap.querySelector('tbody');

  sorted.forEach((evt, i) => {
    const cat = CATEGORIES[evt.category] || CATEGORIES.reconnaissance;
    const row = document.createElement('tr');
    row.dataset.eventId = evt.id;
    row.innerHTML = `
      <td class="evidence-num">${i + 1}</td>
      <td class="evidence-time"><time style="color:${cat.color}">${formatDateRange(evt.timestampStart, evt.timestampEnd)}</time></td>
      <td class="evidence-host" title="${escapeHtml(evt.hostname)}">${escapeHtml(displayText(evt.hostname, TEXT_LIMITS.host))}</td>
      <td class="evidence-user" title="${escapeHtml(evt.username)}">${escapeHtml(displayText(evt.username, TEXT_LIMITS.user))}</td>
      <td class="evidence-cat"><span class="evidence-cat-badge" style="--cat-color:${cat.color}">${escapeHtml(cat.label)}</span></td>
      <td class="evidence-mitre">${escapeHtml(displayText(evt.technique || '—', 16))}</td>
      <td class="evidence-details">${escapeHtml(displayEventDetails(evt, TEXT_LIMITS.socDetails))}</td>
    `;
    tbody.appendChild(row);
  });
}
