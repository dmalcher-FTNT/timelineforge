const CACHE = 'timelineforge-offline-v18';
/** Replaced to ./lib/ in dist/ (GitHub Pages blocks /vendor/). */
const DEPS = './vendor/';

/** Minimum assets required to boot — kept small so mobile SW install succeeds. */
const CORE_SHELL = [
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
  './js/workspace-tabs.js',
  './js/version.js',
  './js/utils.js',
  './js/storage.js',
  './js/theme.js',
  './js/timezones.js',
  './js/workspace.js',
  './js/phases.js',
  './js/share-store.js',
  './data/example-timeline.json',
  `${DEPS}alpinejs.mjs`,
  `${DEPS}d3.mjs`,
  `${DEPS}lz-string.mjs`,
  `${DEPS}fflate.mjs`,
];

/** Cached lazily on first use — too large for fragile mobile precache. */
const OPTIONAL_SHELL = [
  `${DEPS}mammoth.mjs`,
  `${DEPS}html2canvas.mjs`,
  `${DEPS}jspdf.mjs`,
  `${DEPS}svg2pdf.mjs`,
  `${DEPS}pptxgenjs.mjs`,
  `${DEPS}mermaid.esm.min.mjs`,
  `${DEPS}pdfjs-dist/build/pdf.mjs`,
  `${DEPS}pdfjs-dist/build/pdf.worker.mjs`,
  `${DEPS}tesseract/tesseract.esm.min.js`,
  `${DEPS}tesseract/worker.min.js`,
  `${DEPS}tesseract/tesseract-core-simd.wasm.js`,
  `${DEPS}tesseract/lang/eng.traineddata.gz`,
];

function isDocumentRequest(request, url) {
  if (request.mode === 'navigate') return true;
  const path = url.pathname;
  return path.endsWith('/index.html') || path.endsWith('/') && !/\.[a-z0-9]+$/i.test(path);
}

function isAppShellRequest(url) {
  if (url.origin !== self.location.origin) return false;
  const path = url.pathname;
  if (path.endsWith('/sw.js')) return true;
  if (path.includes('/js/') && !path.includes('/vendor/') && !path.includes('/lib/')) return true;
  return false;
}

function isDependencyRequest(url) {
  const path = url.pathname;
  return path.includes('/vendor/') || path.includes('/lib/');
}

function isStaleHtml(text) {
  return text.includes('./vendor/') && !text.includes('./lib/');
}

async function networkFirst(request, { allowStaleHtml = false } = {}) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (!cached) throw new Error('Offline and not cached');
    if (!allowStaleHtml) return cached;
    const text = await cached.clone().text();
    if (isStaleHtml(text)) throw new Error('Stale HTML cache');
    return cached;
  }
}

async function networkOnlyDocument(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (!cached) throw new Error('Offline and not cached');
    const text = await cached.clone().text();
    if (isStaleHtml(text)) throw new Error('Stale HTML cache');
    return cached;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

async function precacheResilient(urls) {
  const cache = await caches.open(CACHE);
  await Promise.all(
    urls.map(async (url) => {
      try {
        await cache.add(url);
      } catch {
        /* skip missing or oversized assets — boot must not fail on mobile */
      }
    }),
  );
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    precacheResilient(CORE_SHELL)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => precacheResilient(OPTIONAL_SHELL))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (isDocumentRequest(event.request, url)) {
    event.respondWith(networkOnlyDocument(event.request));
    return;
  }

  if (isAppShellRequest(url) || isDependencyRequest(url)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});
