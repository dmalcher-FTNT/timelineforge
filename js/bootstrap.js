/**
 * Bootstrap: register Alpine data BEFORE Alpine.start().
 * (Defer Alpine CDN in <head> races with this module and leaves the page blank.)
 */
import Alpine from 'alpinejs';
import { createApp } from './app.js';
import { WORKSPACE_STEPS } from './workspace-tabs.js';
import { APP_NAME } from './version.js';
import { decodeShareLinkInline } from './output/share-encode.js';
import { markWelcomeSeen } from './onboarding.js';

/** Hydrate #data= share links before Alpine paints (avoids blank flash). */
function sharedTimelineFromHash() {
  try {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (!hash || !hash.includes('data=')) return null;
    const shared = decodeShareLinkInline(hash);
    if (shared?.events?.length) {
      markWelcomeSeen();
      return shared;
    }
  } catch {
    /* invalid hash */
  }
  return null;
}

/** Patch state when a stale service-worker app.js is missing newer fields. */
function createAppState() {
  const state = createApp();
  const shared = sharedTimelineFromHash();
  if (shared) {
    state.timeline = shared;
    state.tab = 'publish';
    state.workspaceVisited = { input: true, edit: true, publish: true };
    state.showWelcomeModal = false;
    state._sharedFromHash = true;
  }
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
