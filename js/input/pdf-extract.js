import { loadPdfJs } from './pdfjs-loader.js';

/**
 * Extract plain text from a PDF ArrayBuffer (client-side, no upload).
 * @param {ArrayBuffer} arrayBuffer
 * @param {(page: number, total: number) => void} [onProgress]
 */
export async function extractTextFromPdf(arrayBuffer, onProgress) {
  const pdfjs = await loadPdfJs();
  const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const pageTexts = [];

  for (let i = 1; i <= doc.numPages; i++) {
    onProgress?.(i, doc.numPages);
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pageTexts.push(joinTextItems(content.items));
  }

  return { text: pageTexts.join('\n\n'), numPages: doc.numPages };
}

export async function extractPdfFile(file, onProgress) {
  const buffer = await file.arrayBuffer();
  return extractTextFromPdf(buffer, onProgress);
}

/** Preserve line breaks using Y-position clustering (helps table appendices). */
function joinTextItems(items) {
  if (!items.length) return '';

  const lines = [];
  let currentLine = [];
  let lastY = null;

  items.forEach((item) => {
    const y = item.transform?.[5] ?? 0;
    if (lastY !== null && Math.abs(y - lastY) > 4) {
      if (currentLine.length) lines.push(currentLine.join(' ').trim());
      currentLine = [];
    }
    if (item.str?.trim()) currentLine.push(item.str);
    lastY = y;
  });
  if (currentLine.length) lines.push(currentLine.join(' ').trim());

  return lines.join('\n');
}
