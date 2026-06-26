const OVERFLOW_SELECTORS = [
  '.soc-content p',
  '.soc-meta span',
  '.ciso-ms-card p',
  '.ciso-ms-card time',
  '.chevron-body h3',
  '.chevron-body p',
  '.ciso-col li',
  '.ciso-takeaway p',
  '.event-stack-details',
  '.event-stack-head time',
  '.overview-event-box p',
  '.overview-event-box time',
  '.overview-phase-text p',
  '.phase-column-summary',
  '.phase-column-milestones li',
  '.appendix-table td',
  '.retro-row p',
  '.viz-legend span',
  '.viz-gantt text',
  '.ciso-swimlane text',
].join(',');

/** Elements with absolutely positioned ::before/::after must not use static positioning. */
export const PSEUDO_ANCHOR_SELECTORS = [
  { selector: '.soc-timeline', label: 'SOC timeline spine (::before)' },
];

export function isPositionedLayout(position) {
  return position === 'relative' || position === 'absolute' || position === 'fixed' || position === 'sticky';
}

function auditPseudoElementAnchors(root) {
  const items = [];
  const seen = new Set();

  PSEUDO_ANCHOR_SELECTORS.forEach(({ selector, label }) => {
    root.querySelectorAll(selector).forEach((el) => {
      if (!isVisible(el)) return;
      const position = getComputedStyle(el).position;
      if (isPositionedLayout(position)) return;
      const message = `${label} needs position: relative — decorative line may escape its container (${selector}).`;
      if (seen.has(message)) return;
      seen.add(message);
      items.push({ severity: 'warning', message });
    });
  });

  return items;
}

function isVisible(el) {
  if (!el || !el.isConnected) return false;
  const style = getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function checkOverflow(el) {
  if (!isVisible(el)) return null;
  if (usesIntentionalClamp(el)) return null;
  const pad = 2;
  if (el.scrollWidth > el.clientWidth + pad || el.scrollHeight > el.clientHeight + pad) {
    const snippet = (el.textContent || '').trim().slice(0, 48);
    return snippet ? `"${snippet}${snippet.length >= 48 ? '…' : ''}"` : el.className || el.tagName;
  }
  return null;
}

function usesIntentionalClamp(el) {
  const style = getComputedStyle(el);
  const clamp = style.webkitLineClamp || style.lineClamp;
  if (clamp && clamp !== 'none' && clamp !== '0') return true;
  if (style.overflow === 'hidden' && style.textOverflow === 'ellipsis') return true;
  if (style.overflow === 'hidden' && (style.display === '-webkit-box' || el.classList.contains('ciso-ms-card'))) {
    return true;
  }
  return false;
}

function rectsOverlap(a, b, tolerance = 1) {
  return a.x + a.width - tolerance > b.x
    && b.x + b.width - tolerance > a.x
    && a.y + a.height - tolerance > b.y
    && b.y + b.height - tolerance > a.y;
}

/** Detect overlapping SVG bars within the same lane (post-deconfliction sanity check). */
function auditSvgBarOverlaps(root) {
  const items = [];
  const bars = [...root.querySelectorAll('rect[data-viz-bar][data-lane]')];
  const byLane = new Map();

  bars.forEach((bar) => {
    const lane = bar.getAttribute('data-lane');
    if (!byLane.has(lane)) byLane.set(lane, []);
    byLane.get(lane).push(bar);
  });

  byLane.forEach((laneBars, lane) => {
    for (let i = 0; i < laneBars.length; i++) {
      const a = laneBars[i].getBoundingClientRect();
      for (let j = i + 1; j < laneBars.length; j++) {
        const b = laneBars[j].getBoundingClientRect();
        if (rectsOverlap(a, b, 2)) {
          items.push({
            severity: 'warning',
            message: `Timeline bars overlap in phase ${lane} — layout may need more vertical space.`,
          });
          return;
        }
      }
    }
  });

  return items;
}

function auditSwimlaneClipping(root) {
  const items = [];
  const svg = root.querySelector('.ciso-swimlane svg');
  if (!svg) return items;

  const bars = svg.querySelectorAll('rect[data-viz-bar="swimlane"]');
  if (!bars.length) return items;

  const svgBox = svg.getBoundingClientRect();
  let clipped = 0;
  bars.forEach((bar) => {
    const box = bar.getBoundingClientRect();
    if (box.bottom > svgBox.bottom + 2 || box.top < svgBox.top - 2) clipped += 1;
  });

  if (clipped > 0) {
    items.push({
      severity: 'warning',
      message: `${clipped} swimlane bar(s) clip the SVG bounds — export may truncate activity.`,
    });
  }
  return items;
}

/**
 * Scan rendered preview for text overflow and layout issues.
 * @param {HTMLElement} root — #viz-preview element
 */
export function auditPreviewLayout(root) {
  const items = [];
  if (!root?.querySelector('.viz-ciso, .viz-overview, .viz-phase-columns, .viz-soc, .viz-event-stack, .viz-host-lanes, .viz-evidence-table, .viz-storyboard, .viz-gantt, .viz-compare, .viz-retro, .viz-scribing, .viz-fahrplan, .attack-flow-svg, .viz-mermaid')) {
    items.push({ severity: 'warning', message: 'Preview is empty — load events and open PUBLISH first.' });
    return { score: 0, overflowCount: 0, items };
  }

  const seen = new Set();
  root.querySelectorAll(OVERFLOW_SELECTORS).forEach((el) => {
    const issue = checkOverflow(el);
    if (issue && !seen.has(issue)) {
      seen.add(issue);
      items.push({
        severity: 'warning',
        message: `Text may overflow its box: ${issue}`,
      });
    }
  });

  const longDetails = root.querySelectorAll('.soc-content p');
  longDetails.forEach((p) => {
    const len = (p.textContent || '').length;
    if (len > 160) {
      items.push({
        severity: 'info',
        message: `SOC card has ${len} characters — consider shortening for cleaner exports.`,
      });
    }
  });

  [...auditSvgBarOverlaps(root), ...auditSwimlaneClipping(root), ...auditPseudoElementAnchors(root)].forEach((item) => {
    if (!seen.has(item.message)) {
      seen.add(item.message);
      items.push(item);
    }
  });

  const overflowCount = items.filter((i) => i.message.includes('overflow')).length;
  const score = Math.max(0, Math.min(100, 100 - overflowCount * 12 - items.filter((i) => i.severity === 'warning').length * 4));

  return {
    score,
    overflowCount,
    items: items.slice(0, 10),
  };
}
