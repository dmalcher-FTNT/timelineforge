import { exportJSON } from './export.js';

function slug(title) {
  return (title || 'timeline').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** Parse a timeline JSON file. */
export async function readTimelineFile(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!data?.events && !Array.isArray(data)) {
    throw new Error('Invalid timeline JSON — expected { events: [...] }');
  }
  if (Array.isArray(data)) return { meta: { title: file.name.replace(/\.json$/i, ''), version: 1 }, events: data };
  return data;
}

/** Save timeline — native picker when available, else download. */
export async function saveTimelineFile(timeline, suggestedName) {
  const name = `${slug(suggestedName || timeline.meta?.title)}.json`;
  const json = JSON.stringify(timeline, null, 2);

  if ('showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: name,
        types: [{ description: 'Timeline JSON', accept: { 'application/json': ['.json'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      return { method: 'picker', name: handle.name || name };
    } catch (e) {
      if (e.name === 'AbortError') return { method: 'cancelled' };
    }
  }

  await exportJSON(timeline);
  return { method: 'download', name };
}
