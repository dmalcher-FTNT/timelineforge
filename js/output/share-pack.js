import { exportJSON } from './export.js';

const SHARE_INSTRUCTIONS = `TimelineForge — sharing this timeline

1. Send the attached JSON file to your recipient.
2. They open TimelineForge and use File → Open (or ⌘O / Ctrl+O).
3. Select this JSON file to load the full timeline.

Links with #data=… embed the timeline in the URL and work on any device with TimelineForge.

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

export function shareModeHint(mode) {
  if (mode === 'stored') {
    return 'Local bookmark — opens only in this browser. Use the portable link or timeline file to share with others.';
  }
  if (mode === 'inline') {
    return 'Portable link — paste into any browser running TimelineForge. For email attachments, use Download timeline file.';
  }
  return '';
}
