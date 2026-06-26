import { renderAppendixTimeline } from '../design/appendix-timeline.js';
import { capturePreviewCanvas } from './export-capture.js';
import { exportPDF, exportPNG } from './export.js';
import { exportBasename, exportTitle } from './export-names.js';

/** Mount appendix viz off-screen for capture (uses page CSS variables). */
export function mountAppendixPreview(timeline) {
  const host = document.createElement('div');
  host.setAttribute('data-appendix-export', '');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:960px;pointer-events:none;visibility:hidden';
  const wrap = document.createElement('div');
  wrap.className = 'viz-preview-wrap viz-export-capture';
  wrap.style.width = '960px';
  const preview = document.createElement('div');
  preview.className = 'viz-export-ready';
  wrap.appendChild(preview);
  host.appendChild(wrap);
  document.body.appendChild(host);

  renderAppendixTimeline(preview, {
    events: timeline.events || [],
    meta: timeline.meta || {},
  });
  const theme = timeline.meta?.theme || 'light';
  if (theme === 'dark') preview.querySelector('.viz-appendix')?.classList.add('viz-dark');

  return {
    element: preview,
    cleanup() {
      host.remove();
    },
  };
}

/** Rasterize appendix layout for embedding in Word or other documents. */
export async function captureAppendixImage(timeline) {
  const { element, cleanup } = mountAppendixPreview(timeline);
  try {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const canvas = await capturePreviewCanvas(element);
    return canvas.toDataURL('image/jpeg', 0.92);
  } finally {
    cleanup();
  }
}

export async function exportAppendixPDF(timeline) {
  const { element, cleanup } = mountAppendixPreview(timeline);
  try {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const name = exportBasename(timeline.meta);
    const title = exportTitle(timeline.meta);
    return exportPDF(element, `${name}-appendix`, title);
  } finally {
    cleanup();
  }
}

export async function exportAppendixPNG(timeline) {
  const { element, cleanup } = mountAppendixPreview(timeline);
  try {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const name = exportBasename(timeline.meta);
    return exportPNG(element, `${name}-appendix`);
  } finally {
    cleanup();
  }
}
