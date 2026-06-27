import PptxGenJS from 'pptxgenjs';
import { normalizeAccentColor } from '../theme.js';
import { resolvePhases } from '../phases.js';
import { CATEGORIES, sortEvents, timelineSpanMonths, uniqueHosts, formatDate } from '../utils.js';
import { capturePreviewCanvas } from './export-capture.js';
import { captureAppendixImage } from './export-appendix.js';
import { exportBasename, exportTitle } from './export-names.js';
import { fitToBox } from './export-fit.js';

/** Add a full-width appendix timeline slide to an existing deck. */
export async function addAppendixSlide(pptx, timeline, accentHex) {
  const imgData = await captureAppendixImage(timeline);
  const slide = pptx.addSlide();
  slide.addText('Timeline appendix', {
    x: 0.5, y: 0.2, w: 9, fontSize: 18, bold: true, color: accentHex,
  });
  slide.addImage({ data: imgData, x: 0.35, y: 0.55, w: 9.3, h: 4.75 });
}

/** Minimal deck — title (optional) + appendix snapshot slide. */
export async function exportAppendixPPTX(timeline) {
  const pptx = new PptxGenJS();
  const title = exportTitle(timeline.meta);
  const accent = normalizeAccentColor(timeline.meta.accentColor).replace('#', '');
  pptx.title = title || 'Timeline appendix';
  pptx.layout = 'LAYOUT_16x9';

  if (title) {
    const titleSlide = pptx.addSlide();
    titleSlide.addText(title, {
      x: 0.5, y: 2, w: 9, h: 1, fontSize: 28, bold: true, color: accent,
    });
  }

  await addAppendixSlide(pptx, timeline, accent);
  await pptx.writeFile({ fileName: `${exportBasename(timeline.meta)}-appendix.pptx` });
}

export async function exportPPTX(timeline, previewElement) {
  const pptx = new PptxGenJS();
  const title = exportTitle(timeline.meta);
  pptx.title = title || 'Timeline';
  pptx.layout = 'LAYOUT_16x9';

  const events = sortEvents(timeline.events);
  const phaseDefs = resolvePhases(timeline.meta);
  const accent = normalizeAccentColor(timeline.meta.accentColor).replace('#', '');
  const tz = timeline.meta?.timezone || 'UTC';
  const statsLine = `${events.length} events · ${uniqueHosts(events).length} hosts · ${timelineSpanMonths(events)} months span`;

  const titleSlide = pptx.addSlide();
  if (title) {
    titleSlide.addText(title, {
      x: 0.5, y: 1.5, w: 9, h: 1.2, fontSize: 32, bold: true, color: accent,
    });
    titleSlide.addText(statsLine, { x: 0.5, y: 2.85, w: 9, fontSize: 12, color: '64748b' });
  } else {
    titleSlide.addText(statsLine, {
      x: 0.5, y: 2.2, w: 9, h: 0.8, fontSize: 20, bold: true, color: accent,
    });
  }

  if (events.length) {
    try {
      await addAppendixSlide(pptx, timeline, accent);
    } catch {
      /* skip appendix slide if capture fails */
    }
  }

  const phaseSlide = pptx.addSlide();
  phaseSlide.addText('Attack Phases', { x: 0.5, y: 0.3, w: 9, fontSize: 22, bold: true, color: accent });
  phaseDefs.forEach((p, i) => {
    const count = events.filter((e) => e.phase === p.id).length;
    const col = i % 3;
    const row = Math.floor(i / 3);
    phaseSlide.addText(`${p.id}. ${p.name}`, {
      x: 0.5 + col * 3.1, y: 1.2 + row * 1.5, w: 2.9, h: 0.4, fontSize: 11, bold: true,
      color: p.color.replace('#', ''),
    });
    phaseSlide.addText(`${count} event(s) · ${p.range}`, {
      x: 0.5 + col * 3.1, y: 1.6 + row * 1.5, w: 2.9, h: 0.5, fontSize: 9, color: '64748b',
    });
  });

  const chunkSize = 6;
  for (let i = 0; i < events.length; i += chunkSize) {
    const chunk = events.slice(i, i + chunkSize);
    const slide = pptx.addSlide();
    slide.addText(`Timeline Events (${i + 1}–${i + chunk.length})`, {
      x: 0.5, y: 0.3, w: 9, fontSize: 18, bold: true, color: accent,
    });

    const tableRows = [
      [
        { text: '#', options: { bold: true, fill: accent, color: 'FFFFFF', fontSize: 9 } },
        { text: 'Date/Time', options: { bold: true, fill: accent, color: 'FFFFFF', fontSize: 9 } },
        { text: 'Host', options: { bold: true, fill: accent, color: 'FFFFFF', fontSize: 9 } },
        { text: 'Details', options: { bold: true, fill: accent, color: 'FFFFFF', fontSize: 9 } },
      ],
    ];

    chunk.forEach((e, j) => {
      const cat = CATEGORIES[e.category] || CATEGORIES.reconnaissance;
      tableRows.push([
        { text: String(i + j + 1), options: { fontSize: 8 } },
        { text: formatDate(e.timestampStart, { timezone: tz, seconds: false }), options: { fontSize: 8 } },
        { text: (e.hostname || '').slice(0, 18), options: { fontSize: 8 } },
        { text: (e.details || '').slice(0, 120), options: { fontSize: 8, color: cat.color.replace('#', '') } },
      ]);
    });

    slide.addTable(tableRows, {
      x: 0.4, y: 0.9, w: 9.2,
      colW: [0.4, 1.4, 1.2, 6.2],
      fontSize: 8,
      border: { type: 'solid', color: 'E2E8F0', pt: 0.5 },
      autoPage: false,
    });
  }

  if (previewElement) {
    try {
      const canvas = await capturePreviewCanvas(previewElement);
      const imgData = canvas.toDataURL('image/png');
      const vizSlide = pptx.addSlide();
      vizSlide.addText('Visualization', { x: 0.5, y: 0.2, w: 9, fontSize: 18, bold: true, color: accent });
      const boxW = 9;
      const boxH = 4.75;
      const fitted = fitToBox(canvas.width, canvas.height, boxW, boxH);
      const x = 0.5 + (boxW - fitted.width) / 2;
      const y = 0.65 + (boxH - fitted.height) / 2;
      vizSlide.addImage({ data: imgData, x, y, w: fitted.width, h: fitted.height });
    } catch {
      /* skip image slide if capture fails */
    }
  }

  await pptx.writeFile({ fileName: `${exportBasename(timeline.meta)}.pptx` });
}
