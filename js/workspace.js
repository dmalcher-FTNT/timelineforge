import { DEFAULT_ACCENT } from './theme.js';

/** Default empty timeline for a fresh workspace. */
export function createEmptyTimeline(preserve = {}) {
  return {
    meta: {
      title: '',
      subtitle: '',
      timezone: preserve.timezone || 'UTC',
      version: 1,
      theme: preserve.theme || 'light',
      accentColor: preserve.accentColor || DEFAULT_ACCENT,
      applyEditFiltersToExport: false,
      sourceMode: 'manual',
      sourceText: '',
      sourceImportTool: 'generic-csv',
    },
    events: [],
  };
}
