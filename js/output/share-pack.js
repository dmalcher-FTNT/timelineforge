import { exportJSON } from './export.js';

const SHARE_INSTRUCTIONS = `TimelineForge — sharing this timeline

1. Send the attached JSON file to your recipient.
2. They open TimelineForge and use File → Open (or ⌘O / Ctrl+O).
3. Select this JSON file to load the full timeline.

Portable links use the same host you opened TimelineForge on (GitHub Pages, localhost, or your server). The timeline is compressed into the URL hash (#data=…) — no server or account required.

For timelines that exceed the URL size limit, download the JSON file — recipients open it via File → Open (⌘O).`;

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
  if (mode === 'inline') {
    const hostNote = host
      ? ` Built from ${host} — recipients open TimelineForge at the same address.`
      : ' Works on GitHub Pages, localhost, or any static host.';
    return `Portable share link — timeline embedded in the URL hash (no server).${hostNote} For very large timelines, use Download timeline file.`;
  }
  return '';
}
