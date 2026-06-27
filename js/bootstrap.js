/**
 * Bootstrap: register Alpine data BEFORE Alpine.start().
 * (Defer Alpine CDN in <head> races with this module and leaves the page blank.)
 */
import Alpine from 'alpinejs';
import { createApp } from './app.js';
import { WORKSPACE_STEPS } from './workspace-tabs.js';
import { APP_NAME } from './version.js';

/** Patch state when a stale service-worker app.js is missing newer fields. */
function createAppState() {
  const state = createApp();
  if (!state.workspaceSteps) state.workspaceSteps = WORKSPACE_STEPS;
  if (state.incidentOverviewCollapsed === undefined) {
    state.incidentOverviewCollapsed = false;
    try {
      state.incidentOverviewCollapsed = localStorage.getItem('timelineforge-incident-collapsed') === '1';
    } catch {
      /* ignore storage errors */
    }
  }
  if (typeof state.toggleIncidentOverview !== 'function') {
    state.toggleIncidentOverview = function toggleIncidentOverviewFallback() {
      this.incidentOverviewCollapsed = !this.incidentOverviewCollapsed;
      try {
        localStorage.setItem('timelineforge-incident-collapsed', this.incidentOverviewCollapsed ? '1' : '0');
      } catch {
        /* ignore */
      }
    };
  }
  return state;
}

Alpine.data('app', createAppState);

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
