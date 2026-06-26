import { loadPdfJs, TESSERACT_PATHS } from './pdfjs-loader.js';

/** Heuristic: scanned PDFs yield very little selectable text per page. */
export function pdfLikelyNeedsOcr(text, numPages) {
  const pages = Math.max(1, numPages || 1);
  const charsPerPage = (text || '').replace(/\s+/g, ' ').trim().length / pages;
  return charsPerPage < 80;
}

async function renderPageToCanvas(pdfDoc, pageNum, scale = 2) {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  return canvas;
}

/**
 * OCR a PDF ArrayBuffer page-by-page (client-side via Tesseract.js).
 * @param {ArrayBuffer} arrayBuffer
 * @param {(info: { page: number, total: number }) => void} [onProgress]
 */
export async function ocrPdf(arrayBuffer, onProgress, language = 'eng') {
  const pdfjs = await loadPdfJs();
  const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const { createWorker } = await import('tesseract.js');

  const worker = await createWorker(language, 1, {
    workerPath: TESSERACT_PATHS.workerPath,
    corePath: TESSERACT_PATHS.corePath,
    langPath: TESSERACT_PATHS.langPath,
  });
  const pageTexts = [];

  try {
    for (let i = 1; i <= doc.numPages; i++) {
      onProgress?.({ page: i, total: doc.numPages });
      const canvas = await renderPageToCanvas(doc, i);
      const { data: { text } } = await worker.recognize(canvas);
      pageTexts.push(text.trim());
    }
  } finally {
    await worker.terminate();
  }

  return { text: pageTexts.join('\n\n'), numPages: doc.numPages };
}

export async function ocrPdfFile(file, onProgress, language = 'eng') {
  const buffer = await file.arrayBuffer();
  return ocrPdf(buffer, onProgress, language);
}
