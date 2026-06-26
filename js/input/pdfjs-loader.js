/** Shared PDF.js loader — uses vendored build for offline use. */
const PDFJS_WORKER = './vendor/pdfjs-dist/build/pdf.worker.mjs';

let pdfjsLib = null;

export async function loadPdfJs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  }
  return pdfjsLib;
}

export const TESSERACT_PATHS = {
  workerPath: './vendor/tesseract/worker.min.js',
  corePath: './vendor/tesseract/tesseract-core-simd.wasm.js',
  langPath: './vendor/tesseract/lang',
};
