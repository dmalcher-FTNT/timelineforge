import { exportJSON } from './export.js';

const SHARE_INSTRUCTIONS = `TimelineForge — sharing this timeline

1. Send the attached JSON file to your recipient.
2. They open TimelineForge and use File → Open (or ⌘O / Ctrl+O).
3. Select this JSON file to load the full timeline.

Portable links use the same host you opened TimelineForge on (GitHub Pages, localhost, or your server) with the timeline in the URL hash (#data=…).

For large timelines, download the JSON file — recipients open it via File → Open (⌘O).`;

export function shareFileBaseName(timeline) {
  const title = (timeline.meta?.title || 'timeline')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return title || 'timeline';
}

/** Download JSON + copy cross-device sharing instructions. */
export async function downloadSharePack(timeline) {
  await exportJSON(timeline);
  try {
    await navigator.clipboard.writeText(SHARE_INSTRUCTIONS);
    return { ok: true, copied: true };
  } catch {
    return { ok: true, copied: false };
  }
}

export function shareModeHint(mode, host = '') {
  if (mode === 'stored') {
    return 'Same-browser bookmark — opens only in this browser. Use a portable link or timeline file to share with others.';
  }
  if (mode === 'inline') {
    const hostNote = host
      ? ` Built from ${host} — recipients open TimelineForge at the same address (demo site, localhost, or your host).`
      : ' Uses the current site address — works on GitHub Pages, localhost, or any host.';
    return `Portable link — timeline embedded in the URL hash.${hostNote} For email attachments, use Download timeline file.`;
  }
  return '';
}
