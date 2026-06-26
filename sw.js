const CACHE = 'timelineforge-offline-v4';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/main.css',
  './css/print.css',
  './assets/timelineforge-logo.svg',
  './assets/timelineforge-logo-light.svg',
  './assets/timelineforge-logo-dark.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './js/bootstrap.js',
  './js/app.js',
  './js/version.js',
  './js/utils.js',
  './js/storage.js',
  './js/theme.js',
  './js/timezones.js',
  './js/workspace.js',
  './js/phases.js',
  './js/share-store.js',
  './data/example-timeline.json',
  './vendor/alpinejs.mjs',
  './vendor/d3.mjs',
  './vendor/lz-string.mjs',
  './vendor/mammoth.mjs',
  './vendor/html2canvas.mjs',
  './vendor/jspdf.mjs',
  './vendor/svg2pdf.mjs',
  './vendor/pptxgenjs.mjs',
  './vendor/fflate.mjs',
  './vendor/mermaid.esm.min.mjs',
  './vendor/pdfjs-dist/build/pdf.mjs',
  './vendor/pdfjs-dist/build/pdf.worker.mjs',
  './vendor/tesseract/tesseract.esm.min.js',
  './vendor/tesseract/worker.min.js',
  './vendor/tesseract/tesseract-core-simd.wasm.js',
  './vendor/tesseract/lang/eng.traineddata.gz',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const network = fetch(event.request).then((response) => {
          if (response.ok) {
            caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
          }
          return response;
        }).catch(() => cached);
        return cached || network;
      }),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
        }
        return response;
      });
    }),
  );
});
