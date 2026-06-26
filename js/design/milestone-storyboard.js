import { CATEGORIES, formatDateRange, sortEvents } from '../utils.js';
import { resolvePhases } from '../phases.js';
import { escapeHtml, displayText, displayEventDetails, TEXT_LIMITS, vizTitleHtml } from './viz-helpers.js';
import { buildExecutiveTakeaway, pickMilestones } from './phase-content.js';

/** Milestone-only briefing board — key moments without full event noise. */
export function renderMilestoneStoryboard(container, { events, meta }) {
  const sorted = sortEvents(events);
  const phaseDefs = resolvePhases(meta);
  const milestones = pickMilestones(sorted, phaseDefs, 8);

  const wrap = document.createElement('div');
  wrap.className = 'viz-storyboard';
  wrap.innerHTML = `
    <header class="viz-header">
      <div>${vizTitleHtml(meta)}</div>
      <p class="storyboard-subtitle">Key milestones · ${milestones.length} of ${sorted.length} events</p>
    </header>
    <div class="storyboard-track"></div>
    <section class="storyboard-takeaway">
      <h3>Key takeaway</h3>
      <p>${escapeHtml(buildExecutiveTakeaway(sorted))}</p>
    </section>
  `;

  container.appendChild(wrap);
  const track = wrap.querySelector('.storyboard-track');

  milestones.forEach((evt, i) => {
    const cat = CATEGORIES[evt.category] || CATEGORIES.reconnaissance;
    const phase = phaseDefs.find((p) => p.id === evt.phase);
    const card = document.createElement('article');
    card.className = 'storyboard-card';
    card.dataset.eventId = evt.id;
    card.innerHTML = `
      <div class="storyboard-card-rail" style="background:${cat.color}">
        <span class="storyboard-seq">${i + 1}</span>
      </div>
      <div class="storyboard-card-body">
        <time style="color:${cat.color}">${formatDateRange(evt.timestampStart, evt.timestampEnd)}</time>
        ${phase ? `<span class="storyboard-phase">${escapeHtml(phase.name.split('&')[0].trim())}</span>` : ''}
        <h4>${escapeHtml(displayText(displayEventDetails(evt, 72), 72))}</h4>
        <p class="storyboard-meta">
          <span>🖥 ${escapeHtml(displayText(evt.hostname, TEXT_LIMITS.host))}</span>
          <span>👤 ${escapeHtml(displayText(evt.username, TEXT_LIMITS.user))}</span>
        </p>
        ${evt.technique ? `<span class="storyboard-mitre">${escapeHtml(evt.technique)}</span>` : ''}
      </div>
    `;
    track.appendChild(card);
  });
}
