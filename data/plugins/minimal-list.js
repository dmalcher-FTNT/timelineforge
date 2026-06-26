import { escapeHtml, vizTitleHtml } from '../../js/design/viz-helpers.js';

/** Example TimelineForge plugin — plain chronological list. */
export function register(registerRenderer) {
  registerRenderer('minimal-list', {
    label: 'Minimal List',
    desc: 'Plain text event list',
    render(container, { events, meta, theme }) {
      container.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.className = `viz-minimal-list${theme === 'dark' ? ' viz-dark' : ''}`;
      const title = vizTitleHtml(meta);
      wrap.innerHTML = `
        ${title ? `<header class="viz-header">${title}</header>` : ''}
        <ol class="minimal-list">
          ${events.map((e) => `
            <li>
              <time>${escapeHtml(e.timestampStart || '')}</time>
              <strong>${escapeHtml(e.hostname || '')}</strong>
              <span>${escapeHtml((e.details || '').slice(0, 120))}</span>
            </li>
          `).join('')}
        </ol>
      `;
      container.appendChild(wrap);
    },
  });
}
