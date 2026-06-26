/**
 * Bootstrap: register Alpine data BEFORE Alpine.start().
 * (Defer Alpine CDN in <head> races with this module and leaves the page blank.)
 */
import Alpine from 'alpinejs';
import { createApp } from './app.js';
import { APP_NAME } from './version.js';

Alpine.data('app', createApp);

window.addEventListener('error', (e) => {
  showBootError(e.message || 'Unknown error');
});

window.addEventListener('unhandledrejection', (e) => {
  showBootError(e.reason?.message || String(e.reason));
});

function showBootError(msg) {
  const el = document.getElementById('boot-error');
  if (el) {
    el.textContent = `${APP_NAME} failed to start: ${msg}`;
    el.hidden = false;
  }
  document.body?.removeAttribute('x-cloak');
}

Alpine.start();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
