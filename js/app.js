import { dedupeEventDetails } from './event-details.js';
import { enrichEvents, linkSequentialEvents } from './edit/enrich.js';
import { analyzeTimeline, applySuggestion, analysisIssues, analysisRecommendations } from './edit/analyzer.js';
import { buildActivityPreview } from './edit/activity-preview.js';
import { anonymizeTimeline, scanTimeline } from './edit/anonymize.js';
import {
  countByField,
  countByTag,
  filterEvents,
  filtersActive,
  toggleSingleFilter,
  uniqueFieldValues,
  uniqueTagValues,
} from './edit/event-filters.js';
import { bulkUpdateEvents, computeTimelineStats } from './edit/timeline-stats.js';
import { diffTimelines, formatDiffSummary } from './edit/timeline-diff.js';
import {
  canRedo as historyCanRedo,
  canUndo as historyCanUndo,
  createHistory,
  pushHistoryState,
  redoHistory,
  undoHistory,
} from './edit/history.js';
import {
  listCustomRenderers,
  loadBuiltinPlugins,
} from './design/plugins.js';
import { MITRE_TECHNIQUES } from './data/mitre-techniques.js';
import { processInput, parseInputHint, processInputDetailed } from './input/parser.js';
import { serializeEventsToSource, sourceFormatForInputMode } from './input/serialize.js';
import { parseIrTool } from './input/ir-tools.js';
import { exportJSON, exportPDF, exportPNG, exportStandaloneHTML } from './output/export.js';
import { encodeShareLink, decodeShareLink, encodeLocalShareLink } from './output/share-encode.js';
import { validateExport } from './output/export-validate.js';
import { auditPreviewLayout } from './output/layout-audit.js';
import { createExportThumbnail } from './output/export-capture.js';
import { exportBasename, exportTitle } from './output/export-names.js';
import {
  canSkipVisualExportPreflight,
  exportConfirmLabel,
  exportPreflightStatus,
  exportPreflightSummary,
} from './output/export-preflight.js';
import { downloadSharePack } from './output/share-pack.js';
import { findPreviewEventTarget, stepEventIndex } from './edit/event-focus.js';
import { clearDraft, draftAgeLabel, loadDraft, loadDraftAsync, migrateLegacyStorage, saveDraft } from './storage.js';
import { accentHoverColor, DEFAULT_ACCENT, normalizeAccentColor } from './theme.js';
import { COMMON_TIMEZONES, resolveTimezone, timezoneLabel, timezoneShortLabel, browserTimezone } from './timezones.js';
import { APP_CONTACT_EMAIL, APP_CONTACT_NAME, APP_DESCRIPTION, APP_FULL_TITLE, APP_NAME, APP_SUBTITLE, APP_VERSION } from './version.js';
import { createEmptyTimeline } from './workspace.js';
import { defaultPhasesCopy, resolvePhases } from './phases.js';
import { CATEGORIES, IR_TOOL_FORMATS, formatDate, generateId, parseFlexibleDate, randomStatus, sortEvents, delay } from './utils.js';

const exampleDataUrl = new URL('../data/example-timeline.json', import.meta.url);
const scenarioUrls = {
  ransomware: new URL('../data/templates/ransomware.json', import.meta.url),
  bec: new URL('../data/templates/bec.json', import.meta.url),
  insider: new URL('../data/templates/insider.json', import.meta.url),
  'supply-chain': new URL('../data/templates/supply-chain.json', import.meta.url),
  'cloud-breach': new URL('../data/templates/cloud-breach.json', import.meta.url),
};

let saveTimer = null;
let changeTimer = null;
let analyzeTimer = null;
let previewTimer = null;
let inputTimer = null;
let historyTimer = null;
let sourceSyncTimer = null;
let renderVisualizationFn = null;
/** @type {ReturnType<typeof createHistory> | null} */
let appHistory = null;

async function getRenderVisualization() {
  if (!renderVisualizationFn) {
    ({ renderVisualization: renderVisualizationFn } = await import('./design/renderer.js'));
  }
  return renderVisualizationFn;
}

export function createApp() {
  return {
    appName: APP_NAME,
    appSubtitle: APP_SUBTITLE,
    appVersion: APP_VERSION,
    appDescription: APP_DESCRIPTION,
    appContactName: APP_CONTACT_NAME,
    appContactEmail: APP_CONTACT_EMAIL,

    tab: 'input',
    busy: false,
    statusMessage: '',
    progress: 0,

    inputMode: 'manual',
    inputText: '',
    _syncingSource: false,
    importTool: 'generic-csv',
    irTools: IR_TOOL_FORMATS,

    timeline: { meta: { title: '', subtitle: '', timezone: 'UTC', version: 1, theme: 'light', accentColor: DEFAULT_ACCENT }, events: [] },

    editSearch: '',
    editHostFilter: '',
    editUserFilter: '',
    editCategoryFilter: '',
    editTagFilter: '',
    showDiffPanel: true,
    selectedEventIds: [],

    pluginStyles: [],

    timezones: COMMON_TIMEZONES,
    showShareModal: false,
    shareLinkResult: null,
    shareFallbackTimeline: null,
    showNewTimelineModal: false,

    analysis: null,
    dragIndex: null,
    dragOverIndex: null,
    showShortcutsHelp: false,
    showExportPreflight: false,
    exportPreflight: null,
    exportPreviewThumb: null,
    pendingExportType: null,
    previewLayoutScore: null,
    previewLayoutOverflow: 0,
    pdfMeta: null,
    pdfUploadBuffer: null,
    pdfNeedsOcr: false,
    ocrLanguage: 'eng',
    ocrLanguages: [
      { id: 'eng', label: 'English' },
      { id: 'deu', label: 'German' },
      { id: 'fra', label: 'French' },
      { id: 'spa', label: 'Spanish' },
      { id: 'ita', label: 'Italian' },
      { id: 'nld', label: 'Dutch' },
    ],
    draftSavedAt: null,
    currentFileName: null,

    editViewMode: 'simple',
    editExpandedId: null,
    focusedEventId: null,

    showQualityPanel: false,

    showAnonymizeModal: false,
    showAboutModal: false,
    showPhasesModal: false,
    anonymizePreview: null,

    showEventDetailModal: false,
    eventDetailId: null,

    inputError: '',
    inputParseStats: null,

    compareTimeline: null,
    compareLabel: '',
    compareView: 'gantt',

    compareViews: [
      { id: 'gantt', label: 'Dual Gantt', desc: 'Shared time axis' },
      { id: 'split', label: 'Side by side', desc: 'Parallel timelines with diff badges' },
      { id: 'category', label: 'Category counts', desc: 'Category breakdown per timeline' },
    ],

    headerMenuOpen: null,
    fileSamplesOpen: false,

    headerExportSections: [
      {
        title: 'Visual reports',
        items: [
          { type: 'executive-pdf', label: 'Executive one-pager (PDF)' },
          { type: 'pdf', label: 'PDF report' },
          { type: 'appendix-pdf', label: 'Appendix page (PDF)' },
          { type: 'png', label: 'PNG snapshot' },
          { type: 'appendix-png', label: 'Appendix page (PNG)' },
          { type: 'pptx', label: 'PowerPoint' },
          { type: 'appendix-pptx', label: 'Appendix slide (PPTX)' },
          { type: 'docx', label: 'Word document' },
          { type: 'report-pack', label: 'Report pack (ZIP)' },
        ],
      },
      {
        title: 'Data exports',
        items: [
          { type: 'json', label: 'JSON timeline' },
          { type: 'csv', label: 'CSV spreadsheet' },
          { type: 'markdown', label: 'Markdown table' },
          { type: 'stix', label: 'STIX 2.1 bundle' },
        ],
      },
    ],

    headerToolsSections: [
      {
        title: 'Share & collaborate',
        accent: true,
        items: [
          { action: 'share-link', label: 'Copy share link…', featured: true },
          { action: 'share-file', label: 'Download timeline file' },
        ],
      },
        {
        title: 'Prepare timeline',
        items: [
          { action: 'phases', label: 'Edit attack phases…' },
          { action: 'link-sequential', label: 'Link sequential events' },
          { action: 'anonymize', label: 'Anonymize…' },
          { action: 'baseline', label: 'Save as baseline' },
          { action: 'quality', label: 'Quality analysis' },
        ],
      },
      {
        title: 'Utilities',
        items: [
          { action: 'print', label: 'Print…' },
        ],
      },
    ],

    mitreTechniques: MITRE_TECHNIQUES,

    fileSamples: [
      { id: 'example', label: 'APT breach' },
      { id: 'ransomware', label: 'Ransomware' },
      { id: 'bec', label: 'Business email compromise' },
      { id: 'insider', label: 'Insider threat' },
      { id: 'supply-chain', label: 'Supply chain' },
      { id: 'cloud-breach', label: 'Cloud breach' },
    ],

    vizType: 'activity-strip',
    vizStyle: 'default',
    categories: CATEGORIES,

    vizTypes: [
      { id: 'activity-strip', label: 'Activity overview', desc: 'Compact density chart with category-colored events — at-a-glance before deep dives' },
      { id: 'appendix-timeline', label: 'Appendix timeline', desc: 'Doc-width single page — activity strip plus compact event table for report appendices' },
      { id: 'soc-details', label: 'SOC event cards', desc: 'Full chronological cards with host, user, and narrative detail' },
      { id: 'ciso-summary', label: 'Executive summary', desc: 'Phased chevrons, milestones, and leadership-ready timeline' },
      { id: 'incident-overview', label: 'Phase swimlanes', desc: 'Events on a shared time axis grouped by kill-chain phase' },
      { id: 'phase-columns', label: 'Phase columns', desc: 'Five phase columns with milestone spine' },
      { id: 'compare', label: 'Baseline compare', desc: 'Compare current timeline against a saved baseline' },
    ],
    vizStyles: [
      { id: 'default', label: 'Standard layout', desc: 'Native layout for the selected visualization' },
      { id: 'gantt', label: 'Gantt bars', desc: 'Time-range bars stacked by phase' },
      { id: 'metro', label: 'Metro map', desc: 'Transit-diagram style flow between systems' },
      { id: 'attack-flow', label: 'Attack flow', desc: 'Force-directed graph from event links' },
      { id: 'sequence', label: 'Sequence diagram', desc: 'Mermaid sequence of attack progression' },
    ],

    init() {
      document.title = APP_FULL_TITLE;
      migrateLegacyStorage();
      this.ensureTimelineMeta();

      this.$watch('tab', (t) => {
        if (t === 'design') this.$nextTick(() => this.renderPreview());
      });
      this.$watch('vizType', () => {
        this.normalizeVizSelection();
        this.$nextTick(() => this.renderPreview());
      });
      this.$watch('compareView', () => {
        if (!this.timeline.meta) this.timeline.meta = {};
        this.timeline.meta.compareView = this.compareView;
        this.scheduleSave();
        if (this.tab === 'design' && this.vizType === 'compare') {
          this.vizStyle = this.compareView;
          this.$nextTick(() => this.renderPreview());
        }
      });
      this.$watch('vizStyle', () => {
        if (this.vizType === 'compare') {
          this.compareView = this.vizStyle;
          if (this.timeline.meta) this.timeline.meta.compareView = this.vizStyle;
          this.scheduleSave();
        }
        this.$nextTick(() => this.renderPreview());
      });
      this.$watch('timeline.meta.theme', () => this.applyTheme());
      this.initAutomation();
      this.initPlugins();
      this.loadEditViewMode();
      this.normalizeVizSelection();
      this.bootstrapFromUrlOrDraft();
    },

    normalizeVizSelection() {
      const legacy = { icons: 'default', fahrplan: 'metro', mermaid: 'sequence', retro: 'default', scribing: 'default' };
      if (legacy[this.vizStyle]) this.vizStyle = legacy[this.vizStyle];
      if (this.vizType === 'compare') {
        const view = this.compareView || this.timeline.meta?.compareView || 'gantt';
        this.compareView = view;
        this.vizStyle = view;
        return;
      }
      if (this.vizType === 'activity-strip' || this.vizType === 'appendix-timeline') {
        this.vizStyle = 'default';
        return;
      }
      const compareIds = new Set(this.compareViews.map((v) => v.id));
      if (compareIds.has(this.vizStyle)) this.vizStyle = 'default';
      const available = new Set(this.availableVizStyles().map((s) => s.id));
      if (!available.has(this.vizStyle)) this.vizStyle = 'default';
    },

    availableVizStyles() {
      if (this.vizType === 'compare') return this.compareViews;
      if (this.vizType === 'activity-strip' || this.vizType === 'appendix-timeline') return [];
      return [...this.vizStyles, ...(this.pluginStyles || [])];
    },

    showVizStylePicker() {
      return this.vizType !== 'activity-strip' && this.vizType !== 'appendix-timeline';
    },

    selectedVizType() {
      return this.vizTypes.find((v) => v.id === this.vizType) || this.vizTypes[0];
    },

    designStyleLabel() {
      return this.vizType === 'compare' ? 'Compare view' : 'Style';
    },

    async bootstrapFromUrlOrDraft() {
      try {
        const shared = await decodeShareLink(window.location.hash);
        if (shared?.events) {
          this.timeline = shared;
          this.ensureTimelineMeta();
          this.afterTimelineLoad();
          if (this.refreshEventDetails()) this.scheduleSave();
          this.applyTheme();
          this.notifyTimelineChanged({ skipSourceSync: true });
          this.tab = 'design';
          appHistory = createHistory(this.timeline);
          this.scheduleAutoAnalyze();
          return;
        }
      } catch {
        /* invalid share hash */
      }

      const draft = (await loadDraftAsync()) || loadDraft();
      if (draft?.timeline) {
        this.timeline = draft.timeline;
        this.compareTimeline = draft.compareTimeline || null;
        this.draftSavedAt = draft.savedAt;
        this.ensureTimelineMeta();
        this.afterTimelineLoad();
        if (this.refreshEventDetails()) this.scheduleSave();
        this.applyTheme();
        if (this.timeline.events?.length) this.notifyTimelineChanged({ skipSourceSync: true });
      } else {
        await this.loadFileSample('example');
      }
      appHistory = createHistory(this.timeline);
      if (this.timeline.events?.length) this.scheduleAutoAnalyze();
    },

    initAutomation() {
      let ready = false;
      setTimeout(() => { ready = true; }, 600);

      this.$watch('inputText', () => {
        if (!ready || this._syncingSource) return;
        this.persistInputToMeta();
        if (!this.inputText.trim()) {
          if (this.timeline.events.length) {
            this.timeline.events = [];
            this.notifyTimelineChanged({ fromInput: true });
          }
          this.inputError = '';
          this.inputParseStats = null;
          return;
        }
        clearTimeout(inputTimer);
        inputTimer = setTimeout(() => this.processInputAuto(), 700);
      });

      this.$watch('importTool', () => {
        if (!ready || this._syncingSource) return;
        this.persistInputToMeta();
        if (this.inputText.trim() && this.inputMode === 'import') this.processInputAuto();
      });

      this.$watch('inputMode', () => {
        if (!ready || this._syncingSource) return;
        this.timeline.meta.sourceMode = this.inputMode;
        if (this.timeline.events?.length) {
          this.syncSourceFromEvents();
        } else if (this.inputText.trim()) {
          this.processInputAuto();
        }
      });
    },

    async initPlugins() {
      try {
        await loadBuiltinPlugins();
      } catch {
        // Plugin bundle unavailable in some test environments
      }
      this.refreshPluginStyles();
    },

    refreshPluginStyles() {
      this.pluginStyles = listCustomRenderers();
    },

    handlePaste(e) {
      if (this.tab !== 'input') return;
      if (e.target.matches('textarea, input')) return;
      const text = e.clipboardData?.getData('text/plain');
      if (!text?.trim()) return;
      e.preventDefault();
      this.inputText = text;
      this.statusMessage = 'Pasted from clipboard — parsing…';
    },

    notifyTimelineChanged(options = {}) {
      this.scheduleSave();
      this.scheduleAutoAnalyze();
      this.scheduleRenderPreview();
      if (!options.skipHistory) this.scheduleHistoryPush();
      if (!options.skipSourceSync && !options.fromInput) this.scheduleSourceSync();
    },

    scheduleSourceSync() {
      clearTimeout(sourceSyncTimer);
      sourceSyncTimer = setTimeout(() => this.syncSourceFromEvents(), 300);
    },

    persistInputToMeta() {
      if (!this.timeline.meta) this.timeline.meta = {};
      this.timeline.meta.sourceText = this.inputText;
      this.timeline.meta.sourceMode = this.inputMode;
      this.timeline.meta.sourceImportTool = this.importTool;
    },

    hydrateInputFromTimeline() {
      this.ensureTimelineMeta();
      const meta = this.timeline.meta;
      this.inputMode = meta.sourceMode === 'llm' ? 'manual' : (meta.sourceMode || 'manual');
      this.importTool = meta.sourceImportTool || 'generic-csv';
      this._syncingSource = true;
      this.inputText = meta.sourceText || '';
      this.$nextTick(() => { this._syncingSource = false; });
    },

    ensureSourceText() {
      if (!this.timeline.events?.length) return;
      if (this.timeline.meta.sourceText?.trim()) return;
      this.timeline.meta.sourceMode = 'table';
      this.timeline.meta.sourceText = serializeEventsToSource(this.timeline, 'table');
    },

    afterTimelineLoad() {
      this.ensureTimelineMeta();
      this.ensureSourceText();
      this.hydrateInputFromTimeline();
    },

    syncSourceFromEvents() {
      if (!this.timeline.meta) this.timeline.meta = {};
      const format = sourceFormatForInputMode(this.inputMode);
      const text = this.timeline.events?.length
        ? serializeEventsToSource(this.timeline, format)
        : (this.inputText || '');
      this.timeline.meta.sourceText = text;
      this.timeline.meta.sourceMode = this.inputMode;
      this.timeline.meta.sourceImportTool = this.importTool;
      this._syncingSource = true;
      this.inputText = text;
      this.$nextTick(() => { this._syncingSource = false; });
    },

    inputUsesStructuredParse() {
      const trimmed = this.inputText.trim();
      return ['import', 'report'].includes(this.inputMode) && trimmed.startsWith('{');
    },

    scheduleHistoryPush() {
      if (!appHistory) return;
      clearTimeout(historyTimer);
      historyTimer = setTimeout(() => {
        pushHistoryState(appHistory, this.timeline);
      }, 400);
    },

    canUndo() {
      return appHistory ? historyCanUndo(appHistory) : false;
    },

    canRedo() {
      return appHistory ? historyCanRedo(appHistory) : false;
    },

    undo() {
      if (!this.canUndo()) return;
      const restored = undoHistory(appHistory);
      if (restored) {
        this.timeline = restored;
        this.ensureTimelineMeta();
        this.hydrateInputFromTimeline();
        this.notifyTimelineChanged({ skipHistory: true, skipSourceSync: true });
        this.statusMessage = 'Undone.';
      }
      setTimeout(() => { if (!this.busy) this.statusMessage = ''; }, 1500);
    },

    redo() {
      if (!this.canRedo()) return;
      const restored = redoHistory(appHistory);
      if (restored) {
        this.timeline = restored;
        this.ensureTimelineMeta();
        this.hydrateInputFromTimeline();
        this.notifyTimelineChanged({ skipHistory: true, skipSourceSync: true });
        this.statusMessage = 'Redone.';
      }
      setTimeout(() => { if (!this.busy) this.statusMessage = ''; }, 1500);
    },

    scheduleAutoAnalyze() {
      clearTimeout(analyzeTimer);
      analyzeTimer = setTimeout(() => {
        if (this.timeline.events?.length) {
          this.analysis = analyzeTimeline(this.timeline.events);
        } else {
          this.analysis = null;
        }
      }, 350);
    },

    scheduleRenderPreview() {
      clearTimeout(previewTimer);
      previewTimer = setTimeout(() => {
        if (this.tab === 'design') this.renderPreview();
      }, 250);
    },

    async processInputAuto() {
      if (!this.inputText.trim()) return;

      let events = [];
      let parseStats = null;
      try {
        if (this.inputUsesStructuredParse()) {
          const detailed = processInputDetailed({ mode: 'json', text: this.inputText });
          events = detailed.events;
          parseStats = detailed;
        } else if (this.inputMode === 'import') {
          events = parseIrTool(this.importTool, this.inputText);
          parseStats = { attempted: events.length, parsed: events.length, skipped: 0 };
        } else {
          const mode = this.inputMode === 'report' ? 'report'
            : this.inputMode === 'table' ? 'table'
            : 'manual';
          const detailed = processInputDetailed({ mode, text: this.inputText });
          events = detailed.events;
          parseStats = detailed;
        }
      } catch (e) {
        this.inputError = e.message;
        this.inputParseStats = null;
        this.statusMessage = e.message;
        return;
      }

      if (!events.length) {
        this.inputError = parseInputHint(this.inputMode);
        this.inputParseStats = null;
        this.statusMessage = this.inputError;
        return;
      }

      this.inputError = '';
      if (parseStats?.skipped > 0) {
        this.inputParseStats = parseStats;
      } else {
        this.inputParseStats = null;
      }
      events = enrichEvents(events);
      this.applyParsedEvents(events);
    },

    applyParsedEvents(events) {
      this.persistInputToMeta();
      this.timeline.events = events;
      this.timeline.meta.manualOrder = false;
      this.notifyTimelineChanged({ fromInput: true });
      let msg = `${events.length} events parsed`;
      if (this.inputParseStats?.skipped) {
        msg += ` (${this.inputParseStats.skipped} line(s) skipped)`;
      }
      this.statusMessage = msg;
      setTimeout(() => { if (!this.busy) this.statusMessage = ''; }, 2000);
    },

    ensureTimelineMeta() {
      if (!this.timeline.meta) this.timeline.meta = {};
      if (!this.timeline.meta.theme) this.timeline.meta.theme = 'light';
      if (!this.timeline.meta.accentColor) this.timeline.meta.accentColor = DEFAULT_ACCENT;
      this.timeline.meta.accentColor = normalizeAccentColor(this.timeline.meta.accentColor);
      if (this.timeline.meta.applyEditFiltersToExport === undefined) {
        this.timeline.meta.applyEditFiltersToExport = false;
      }
      if (!this.timeline.meta.timezone) this.timeline.meta.timezone = 'UTC';
      if (!this.timeline.meta.sourceMode) this.timeline.meta.sourceMode = 'manual';
      if (this.timeline.meta.sourceText === undefined) this.timeline.meta.sourceText = '';
      if (!this.timeline.meta.sourceImportTool) this.timeline.meta.sourceImportTool = 'generic-csv';
      if (!this.timeline.meta.compareView) this.timeline.meta.compareView = 'gantt';
      if (this.timeline.meta.showCompareOverlay === undefined) {
        this.timeline.meta.showCompareOverlay = true;
      }
      this.compareView = this.timeline.meta.compareView;
      this.ensureEventIds(this.timeline.events);
      if (this.compareTimeline?.events) this.ensureEventIds(this.compareTimeline.events);
    },

    /** Assign ids to legacy or hand-edited events missing them (required for diff keys). */
    ensureEventIds(events) {
      if (!events?.length) return;
      events.forEach((e) => {
        if (e && !e.id) e.id = generateId();
      });
    },

    refreshEventDetails() {
      if (!this.timeline?.events?.length) return false;
      let changed = false;
      this.timeline.events = this.timeline.events.map((e) => {
        const details = dedupeEventDetails(e);
        if (details && details !== e.details) {
          changed = true;
          return { ...e, details };
        }
        return e;
      });
      return changed;
    },

    displayTimezone() {
      return resolveTimezone(this.timeline.meta);
    },

    displayTimezoneLabel() {
      return timezoneLabel(this.displayTimezone());
    },

    displayTimezoneShort() {
      return timezoneShortLabel(this.displayTimezone());
    },

    localTimezone() {
      return browserTimezone();
    },

    localTimezoneShort() {
      return timezoneShortLabel(this.localTimezone());
    },

    setDisplayTimezone(id) {
      this.timeline.meta.timezone = id;
      this.closeHeaderMenu();
      this.notifyTimelineChanged({ skipHistory: true });
    },

    useLocalTimezone() {
      this.setDisplayTimezone(this.localTimezone());
    },

    incidentStatsEvents() {
      if (this.filterIsActive()) return this.filteredEditEvents();
      return this.timeline.events;
    },

    incidentStats() {
      return computeTimelineStats(this.incidentStatsEvents());
    },

    incidentEventCount() {
      const total = this.timeline.events.length;
      if (!total) return '0';
      if (this.filterIsActive()) {
        const showing = this.filteredEditEvents().length;
        return `${showing}/${total}`;
      }
      return String(total);
    },

    incidentCatBarWidth(count) {
      const top = this.incidentStats().topCategories;
      const max = top[0]?.count || 1;
      return Math.max(10, Math.round((count / max) * 100));
    },

    activityPreview() {
      return buildActivityPreview(this.incidentStatsEvents(), {
        timezone: this.displayTimezone(),
      });
    },

    formatEditTimestamp(iso) {
      if (!iso) return '';
      return formatDate(iso, { timezone: this.displayTimezone(), seconds: false });
    },

    updateEventTimestamp(id, field, raw) {
      const trimmed = (raw || '').trim();
      if (!trimmed) {
        this.updateEvent(id, field, field === 'timestampEnd' ? null : '');
        return;
      }
      const parsed = parseFlexibleDate(trimmed);
      if (!parsed) {
        this.statusMessage = `Could not parse date: ${trimmed}`;
        setTimeout(() => { if (!this.busy) this.statusMessage = ''; }, 2500);
        return;
      }
      this.updateEvent(id, field, parsed);
    },

    onIncidentMetaChange() {
      this.scheduleSave();
      if (this.tab === 'design') this.$nextTick(() => this.renderPreview());
    },

    activePhases() {
      return resolvePhases(this.timeline.meta);
    },

    hasCustomPhases() {
      return Boolean(this.timeline.meta.customPhases?.length);
    },

    ensureCustomPhases() {
      if (!this.timeline.meta.customPhases?.length) {
        this.timeline.meta.customPhases = defaultPhasesCopy();
      }
    },

    updatePhaseField(id, field, value) {
      this.ensureCustomPhases();
      const phase = this.timeline.meta.customPhases.find((p) => p.id === id);
      if (!phase) return;
      phase[field] = value;
      this.debouncedTimelineChanged();
    },

    resetPhasesToDefault() {
      this.timeline.meta.customPhases = null;
      this.notifyTimelineChanged();
      if (this.tab === 'design') this.$nextTick(() => this.renderPreview());
    },

    openPhasesModal() {
      this.ensureCustomPhases();
      this.showPhasesModal = true;
    },

    closePhasesModal() {
      this.showPhasesModal = false;
    },

    debouncedTimelineChanged() {
      clearTimeout(changeTimer);
      changeTimer = setTimeout(() => this.notifyTimelineChanged(), 400);
    },

    applyTheme() {
      const root = document.documentElement;
      const dark = this.timeline.meta.theme === 'dark';
      const accent = normalizeAccentColor(this.timeline.meta.accentColor || DEFAULT_ACCENT);
      this.timeline.meta.accentColor = accent;
      document.body.classList.toggle('theme-dark', dark);
      root.style.setProperty('--accent', accent);
      root.style.setProperty('--accent-hover', accentHoverColor(accent, dark));
      const themeMeta = document.querySelector('meta[name="theme-color"]');
      if (themeMeta) themeMeta.content = dark ? '#1A1A1A' : '#FFFFFF';
    },

    toggleTheme() {
      this.timeline.meta.theme = this.timeline.meta.theme === 'dark' ? 'light' : 'dark';
      this.applyTheme();
      this.scheduleSave();
      if (this.tab === 'design') this.$nextTick(() => this.renderPreview());
    },

    brandLogoSrc() {
      return (this.timeline.meta?.theme || 'light') === 'dark'
        ? 'assets/timelineforge-logo-dark.svg'
        : 'assets/timelineforge-logo-light.svg';
    },

    async loadFileSample(id) {
      const url = id === 'example' ? exampleDataUrl : scenarioUrls[id];
      if (!url) return;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.timeline = await res.json();
        this.ensureTimelineMeta();
        this.applyTheme();
        appHistory = createHistory(this.timeline);
        this.afterTimelineLoad();
        this.notifyTimelineChanged({ skipHistory: true, skipSourceSync: true });
        this.scheduleAutoAnalyze();
        const label = this.fileSamples.find((s) => s.id === id)?.label || id;
        this.statusMessage = `Loaded ${label} (${this.timeline.events.length} events).`;
        setTimeout(() => { this.statusMessage = ''; }, 2500);
      } catch (e) {
        console.error('loadFileSample failed', e);
        this.statusMessage = id === 'example'
          ? `Failed to load example: ${e.message}. Check the dev server is running from timelineforge/.`
          : `Failed to load scenario: ${e.message}`;
      }
    },

    applyLinkSequential() {
      const events = this.timeline.events || [];
      if (events.length < 2) {
        this.statusMessage = events.length ? 'Need at least two events to link.' : 'Add events before linking.';
        setTimeout(() => { if (!this.busy) this.statusMessage = ''; }, 2500);
        return;
      }
      this.timeline.events = linkSequentialEvents(events);
      this.notifyTimelineChanged();
      this.statusMessage = 'Sequential links applied — try Attack flow in DESIGN.';
      setTimeout(() => { if (!this.busy) this.statusMessage = ''; }, 3000);
    },

    syncJson() {
      this.notifyTimelineChanged();
    },

    scheduleSave() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        saveDraft(this.timeline, this.compareTimeline);
        this.draftSavedAt = Date.now();
      }, 800);
    },

    draftLabel() {
      return draftAgeLabel(this.draftSavedAt);
    },

    applyJson() {},

    setTab(t) {
      this.tab = t;
      this.closeHeaderMenu();
      this.closeAllModals();
      if (t === 'input' && this.timeline.events?.length) {
        this.syncSourceFromEvents();
      }
    },

    handleKeydown(e) {
      if (e.target.matches('input, textarea, select') && !e.metaKey && !e.ctrlKey && e.key !== 'Escape') return;
      if (e.key === 'Escape') {
        this.closeAllModals();
        return;
      }
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        this.showShortcutsHelp = !this.showShortcutsHelp;
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n' && !e.shiftKey) {
        e.preventDefault();
        this.openNewTimelineModal();
        return;
      }
      if (!(e.metaKey || e.ctrlKey)) return;
      const map = { '1': 'input', '2': 'edit', '3': 'design', '4': 'output' };
      if (map[e.key]) {
        e.preventDefault();
        this.setTab(map[e.key]);
      }
      if (e.key === 's') {
        e.preventDefault();
        saveDraft(this.timeline, this.compareTimeline);
        this.draftSavedAt = Date.now();
        this.statusMessage = 'Draft saved.';
        setTimeout(() => { this.statusMessage = ''; }, 1500);
      }
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      }
      if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        this.redo();
      }
      if (e.key === 'p' && this.tab === 'design') {
        e.preventDefault();
        this.exportAs('print');
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
        e.preventDefault();
        this.triggerOpenTimeline();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 's') {
        e.preventDefault();
        this.saveTimelineToDisk();
      }
      if (this.tab === 'edit' && !e.metaKey && !e.ctrlKey && !e.target.matches('input, textarea, select')) {
        if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); this.focusNextEditEvent(1); }
        if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); this.focusNextEditEvent(-1); }
      }
    },

    handlePreviewClick(event) {
      if (this.tab !== 'design') return;
      const root = document.getElementById('viz-preview');
      const id = findPreviewEventTarget(event.target, root);
      if (id) this.openEventDetail(id);
    },

    eventDetailEvent() {
      if (!this.eventDetailId) return null;
      return this.timeline.events.find((e) => e.id === this.eventDetailId) || null;
    },

    openEventDetail(id) {
      if (!id || !this.timeline.events.some((e) => e.id === id)) return;
      this.eventDetailId = id;
      this.showEventDetailModal = true;
    },

    closeEventDetailModal() {
      this.showEventDetailModal = false;
      this.eventDetailId = null;
    },

    openEventDetailInEdit() {
      const id = this.eventDetailId;
      this.closeEventDetailModal();
      if (id) this.jumpToEvent(id);
    },

    eventDetailCategoryLabel(category) {
      return this.categories[category]?.label || category || '—';
    },

    eventDetailPhaseLabel(phaseId) {
      const phase = this.activePhases().find((p) => p.id === phaseId);
      return phase ? `${phase.id} — ${phase.name}` : (phaseId ? String(phaseId) : '—');
    },

    jumpToEvent(id) {
      if (!id || !this.timeline.events.some((e) => e.id === id)) return;
      const filtered = this.editEvents();
      const idx = filtered.findIndex((e) => e.id === id);
      this.tab = 'edit';
      this.focusedEventId = id;
      this.editExpandedId = id;
      if (idx < 0) {
        this.statusMessage = 'Event is hidden by active EDIT filters — clear filters to edit it.';
        setTimeout(() => { this.statusMessage = ''; }, 3500);
        return;
      }
      this.$nextTick(() => {
        const row = document.querySelector(`[data-event-id="${CSS.escape(id)}"]`);
        row?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
    },

    focusNextEditEvent(delta) {
      const events = this.editEvents();
      if (!events.length) return;
      const currentIdx = this.focusedEventId
        ? events.findIndex((e) => e.id === this.focusedEventId)
        : -1;
      const nextIdx = stepEventIndex(currentIdx, delta, events.length);
      this.jumpToEvent(events[nextIdx].id);
    },

    isEventFocused(id) {
      return this.focusedEventId === id;
    },

    async runWithStatus(fn) {
      this.busy = true;
      this.progress = 0;
      const interval = setInterval(() => {
        this.statusMessage = randomStatus();
        this.progress = Math.min(95, this.progress + 8 + Math.random() * 12);
      }, 450);
      try {
        await fn();
        this.progress = 100;
        this.statusMessage = 'Done. Your timeline looks sharper than most vendor PDFs.';
      } finally {
        clearInterval(interval);
        await delay(400);
        this.busy = false;
        this.progress = 0;
      }
    },

    async processInput() {
      await this.processInputAuto();
    },

    async processLlmInput() {
      await this.processInputAuto();
    },

    analyzeData() {
      this.analysis = analyzeTimeline(this.timeline.events);
    },

    applyAnalysisSuggestion(s) {
      this.timeline.events = applySuggestion(this.timeline.events, s);
      this.notifyTimelineChanged();
    },

    openAnonymizeModal() {
      this.anonymizePreview = scanTimeline(this.timeline);
      this.showAnonymizeModal = true;
    },

    closeAnonymizeModal() {
      this.showAnonymizeModal = false;
      this.anonymizePreview = null;
    },

    openAboutModal() {
      this.showAboutModal = true;
    },

    closeAboutModal() {
      this.showAboutModal = false;
    },

    closeAllModals() {
      this.closeAnonymizeModal();
      this.closeAboutModal();
      this.closeShareModal();
      this.closeNewTimelineModal();
      this.cancelExport();
      this.closeHeaderMenu();
      this.showShortcutsHelp = false;
      this.showQualityPanel = false;
    },

    toggleHeaderMenu(name) {
      this.headerMenuOpen = this.headerMenuOpen === name ? null : name;
    },

    closeHeaderMenu() {
      this.headerMenuOpen = null;
      this.fileSamplesOpen = false;
    },

    headerFileAction(action, arg) {
      this.closeHeaderMenu();
      if (action === 'open') this.triggerOpenTimeline();
      else if (action === 'save') this.saveTimelineToDisk();
      else if (action === 'draft') {
        saveDraft(this.timeline, this.compareTimeline);
        this.draftSavedAt = Date.now();
        this.statusMessage = 'Draft saved.';
        setTimeout(() => { this.statusMessage = ''; }, 1500);
      }
      else if (action === 'new') this.openNewTimelineModal();
      else if (action === 'sample') this.loadFileSample(arg);
      else if (action === 'about') this.openAboutModal();
    },

    async headerExport(type) {
      this.closeHeaderMenu();
      if (type === 'output-tab') {
        this.setTab('output');
        return;
      }
      await this.exportAs(type);
    },

    async headerToolAction(action) {
      this.closeHeaderMenu();
      if (action === 'share-link') {
        await this.openShareLink();
        return;
      }
      if (action === 'share-file') {
        await this.downloadShareFile();
        return;
      }
      if (action === 'anonymize') {
        this.openAnonymizeModal();
        return;
      }
      if (action === 'phases') {
        this.openPhasesModal();
        return;
      }
      if (action === 'link-sequential') {
        this.applyLinkSequential();
        return;
      }
      if (action === 'baseline') {
        this.saveCurrentAsBaseline();
        return;
      }
      if (action === 'quality') {
        this.openQualityPanel();
        return;
      }
      if (action === 'print') {
        await this.exportAs('print');
        return;
      }
      if (action === 'output-tab') {
        this.setTab('output');
        return;
      }
      if (action === 'diff-markdown') {
        await this.exportDiffAs('markdown');
        return;
      }
      if (action === 'diff-csv') {
        await this.exportDiffAs('csv');
        return;
      }
    },

    openOutputTab() {
      this.headerExport('output-tab');
    },

    openNewTimelineModal() {
      this.showNewTimelineModal = true;
    },

    closeNewTimelineModal() {
      this.showNewTimelineModal = false;
    },

    confirmNewTimeline() {
      this.resetWorkspace();
      this.closeNewTimelineModal();
    },

    resetWorkspace() {
      const preserve = {
        theme: this.timeline.meta?.theme,
        timezone: this.timeline.meta?.timezone,
        accentColor: this.timeline.meta?.accentColor,
      };

      clearDraft();
      clearTimeout(saveTimer);
      clearTimeout(historyTimer);
      clearTimeout(analyzeTimer);
      clearTimeout(previewTimer);

      this.timeline = createEmptyTimeline(preserve);
      this.ensureTimelineMeta();
      this.applyTheme();

      this.compareTimeline = null;
      this.compareLabel = '';
      this.compareView = 'gantt';

      this.editSearch = '';
      this.editHostFilter = '';
      this.editUserFilter = '';
      this.editCategoryFilter = '';
      this.editTagFilter = '';
      this.selectedEventIds = [];
      this.focusedEventId = null;
      this.analysis = null;
      this.currentFileName = null;
      this.inputParseStats = null;

      this.inputMode = 'manual';
      this.inputText = '';
      this.importTool = 'generic-csv';
      this.pdfMeta = null;
      this.pdfUploadBuffer = null;
      this.pdfNeedsOcr = false;

      this.draftSavedAt = null;
      this.statusMessage = '';
      this.busy = false;
      this.progress = 0;

      appHistory = createHistory(this.timeline);

      saveDraft(this.timeline, null);
      this.draftSavedAt = Date.now();

      if (window.location.hash) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }

      this.tab = 'input';

      const preview = document.getElementById('viz-preview');
      if (preview) preview.innerHTML = '';
    },

    async openShareLink() {
      const exportTimeline = this.exportTimeline();
      const result = await encodeShareLink(exportTimeline);
      this.shareLinkResult = result;
      this.shareFallbackTimeline = exportTimeline;
      if (!result.tooLarge) {
        try {
          await navigator.clipboard.writeText(result.url);
        } catch {
          /* clipboard blocked — user can copy from modal */
        }
      }
      this.showShareModal = true;
    },

    async copyLocalShareBookmark() {
      const exportTimeline = this.exportTimeline();
      const result = await encodeLocalShareLink(exportTimeline);
      if (result.tooLarge || !result.url) {
        this.statusMessage = 'Local bookmarks need IndexedDB — use Download timeline file instead.';
        setTimeout(() => { this.statusMessage = ''; }, 3500);
        return;
      }
      this.shareLinkResult = result;
      try {
        await navigator.clipboard.writeText(result.url);
        this.statusMessage = 'Local bookmark copied — works only in this browser.';
      } catch {
        this.statusMessage = 'Copy the link from the share dialog.';
      }
      setTimeout(() => { this.statusMessage = ''; }, 3500);
    },

    closeShareModal() {
      this.showShareModal = false;
      this.shareLinkResult = null;
      this.shareFallbackTimeline = null;
    },

    async downloadShareFallback() {
      if (this.shareFallbackTimeline) {
        const result = await downloadSharePack(this.shareFallbackTimeline);
        if (result.copied) {
          this.statusMessage = 'Timeline file downloaded — sharing instructions copied to clipboard.';
        } else {
          this.statusMessage = 'Timeline file downloaded — send the JSON to open in TimelineForge (Header → Open).';
        }
        setTimeout(() => { this.statusMessage = ''; }, 4000);
      }
      this.closeShareModal();
    },

    async downloadShareFile() {
      const exportTimeline = this.exportTimeline();
      const result = await downloadSharePack(exportTimeline);
      if (result.copied) {
        this.statusMessage = 'Timeline file downloaded — sharing instructions copied to clipboard.';
      } else {
        this.statusMessage = 'Timeline file downloaded.';
      }
      setTimeout(() => { this.statusMessage = ''; }, 4000);
    },

    applyAnonymize() {
      const { timeline } = anonymizeTimeline(this.timeline);
      this.timeline = timeline;
      this.closeAnonymizeModal();
      this.notifyTimelineChanged();
      this.statusMessage = 'Timeline anonymized. Review placeholders in EDIT.';
      setTimeout(() => { this.statusMessage = ''; }, 3000);
    },

    addEvent() {
      this.timeline.events.push({
        id: `evt-${Date.now()}`,
        timestampStart: new Date().toISOString(),
        timestampEnd: null,
        hostname: 'HOST-NEW',
        username: 'N/A',
        details: 'New event — edit me',
        category: 'reconnaissance',
        phase: 1,
        technique: '',
        source: '',
        evidence: '',
        linkedEventIds: [],
        tags: [],
      });
      this.notifyTimelineChanged();
    },

    deleteEvent(id) {
      this.timeline.events = this.timeline.events.filter((e) => e.id !== id);
      this.timeline.events.forEach((e) => {
        e.linkedEventIds = (e.linkedEventIds || []).filter((lid) => lid !== id);
      });
      this.notifyTimelineChanged();
    },

    updateEvent(id, field, value) {
      const evt = this.timeline.events.find((e) => e.id === id);
      if (!evt) return;
      if (field === 'linkedEventIds') {
        evt.linkedEventIds = value.split(',').map((s) => s.trim()).filter(Boolean);
      } else if (field === 'tags') {
        evt.tags = value.split(',').map((s) => s.trim()).filter(Boolean);
      } else {
        evt[field] = value;
      }
      this.debouncedTimelineChanged();
    },

    eventLabel(id) {
      const e = this.timeline.events.find((x) => x.id === id);
      if (!e) return id;
      return `#${this.timeline.events.indexOf(e) + 1} ${(e.details || '').slice(0, 30)}`;
    },

    filterIsActive() {
      return filtersActive({
        search: this.editSearch,
        host: this.editHostFilter,
        user: this.editUserFilter,
        category: this.editCategoryFilter,
        tag: this.editTagFilter,
      });
    },

    editFilterState() {
      return {
        search: this.editSearch,
        host: this.editHostFilter,
        user: this.editUserFilter,
        category: this.editCategoryFilter,
        tag: this.editTagFilter,
      };
    },

    filteredEditEvents() {
      return filterEvents(this.timeline.events, this.editFilterState());
    },

    editEvents() {
      return this.filterIsActive() ? this.filteredEditEvents() : this.timeline.events;
    },

    paginatedEditEvents() {
      return this.editEvents();
    },

    editUsesPagination() {
      return false;
    },

    loadEditViewMode() {
      try {
        const saved = localStorage.getItem('timelineforge-edit-view');
        if (saved === 'simple' || saved === 'expert') this.editViewMode = saved;
      } catch {
        /* ignore */
      }
    },

    setEditViewMode(mode) {
      if (mode !== 'simple' && mode !== 'expert') return;
      this.editViewMode = mode;
      try {
        localStorage.setItem('timelineforge-edit-view', mode);
      } catch {
        /* ignore */
      }
    },

    categoryLabel(key) {
      return this.categories[key]?.label || key || '—';
    },

    categoryStyle(key) {
      const color = this.categories[key]?.color || '#94a3b8';
      return `color:${color};border-color:${color};background:${color}18`;
    },

    eventSummaryTime(evt) {
      const start = this.formatEditTimestamp(evt.timestampStart);
      if (!evt.timestampEnd) return start;
      return `${start} → ${this.formatEditTimestamp(evt.timestampEnd)}`;
    },

    eventSummaryDetails(evt, maxLen = 96) {
      const text = (evt.details || '').replace(/\s+/g, ' ').trim();
      if (!text) return '—';
      if (text.length <= maxLen) return text;
      return `${text.slice(0, maxLen - 1)}…`;
    },

    isEventExpanded(id) {
      return this.editExpandedId === id;
    },

    toggleEditExpanded(id) {
      this.editExpandedId = this.editExpandedId === id ? null : id;
      if (this.editExpandedId) this.focusedEventId = id;
    },

    qualityIssueCount() {
      if (!this.analysis) return 0;
      return analysisIssues(this.analysis).length;
    },

    qualityRecommendationCount() {
      if (!this.analysis) return 0;
      return analysisRecommendations(this.analysis).length;
    },

    analysisIssuesList() {
      return this.analysis ? analysisIssues(this.analysis) : [];
    },

    analysisRecommendationsList() {
      return this.analysis ? analysisRecommendations(this.analysis) : [];
    },

    goToAnalysisItem(item) {
      if (!item?.eventId) return;
      this.showQualityPanel = false;
      this.jumpToEvent(item.eventId);
    },

    openQualityPanel() {
      this.analyzeData();
      this.showQualityPanel = true;
      this.setTab('edit');
    },

    triggerOpenTimeline() {
      this.$refs.openTimelineInput?.click();
    },

    async handleOpenTimelineFile(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const data = await readTimelineFile(file);
        this.timeline = data;
        this.compareTimeline = null;
        this.compareLabel = '';
        this.currentFileName = file.name;
        this.ensureTimelineMeta();
        if (this.refreshEventDetails()) this.scheduleSave();
        this.applyTheme();
        appHistory = createHistory(this.timeline);
        this.afterTimelineLoad();
        this.notifyTimelineChanged({ skipHistory: true, skipSourceSync: true });
        this.tab = 'input';
        this.statusMessage = `Opened ${file.name} (${this.timeline.events.length} events)`;
        setTimeout(() => { if (!this.busy) this.statusMessage = ''; }, 2500);
      } catch (e) {
        this.statusMessage = `Could not open file: ${e.message}`;
      }
      event.target.value = '';
    },

    async saveTimelineToDisk() {
      const result = await saveTimelineFile(this.timeline, this.currentFileName || this.timeline.meta.title);
      if (result.method === 'cancelled') return;
      if (result.method === 'picker') this.currentFileName = result.name;
      this.scheduleSave();
      this.statusMessage = result.method === 'picker' ? `Saved ${result.name}` : 'Timeline downloaded as JSON';
      setTimeout(() => { if (!this.busy) this.statusMessage = ''; }, 2000);
    },

    uniqueHostnames() {
      return uniqueFieldValues(this.timeline.events, 'hostname');
    },

    uniqueUsernames() {
      return uniqueFieldValues(this.timeline.events, 'username');
    },

    hostEventCount(host) {
      return countByField(this.timeline.events, 'hostname', host);
    },

    userEventCount(user) {
      return countByField(this.timeline.events, 'username', user);
    },

    uniqueTags() {
      return uniqueTagValues(this.timeline.events);
    },

    tagEventCount(tag) {
      return countByTag(this.timeline.events, tag);
    },

    selectTagFilter(tag) {
      this.editTagFilter = toggleSingleFilter(this.editTagFilter, tag);
    },

    selectHostFilter(host) {
      this.editHostFilter = toggleSingleFilter(this.editHostFilter, host);
    },

    selectUserFilter(user) {
      this.editUserFilter = toggleSingleFilter(this.editUserFilter, user);
    },

    selectCategoryFilter(cat) {
      this.editCategoryFilter = toggleSingleFilter(this.editCategoryFilter, cat);
    },

    clearEditFilters() {
      this.editSearch = '';
      this.editHostFilter = '';
      this.editUserFilter = '';
      this.editCategoryFilter = '';
      this.editTagFilter = '';
      this.clearSelection();
    },

    isEventSelected(id) {
      return this.selectedEventIds.includes(id);
    },

    toggleEventSelection(id, checked) {
      if (checked) {
        if (!this.selectedEventIds.includes(id)) {
          this.selectedEventIds = [...this.selectedEventIds, id];
        }
      } else {
        this.selectedEventIds = this.selectedEventIds.filter((x) => x !== id);
      }
    },

    allVisibleSelected() {
      const visible = this.paginatedEditEvents();
      return visible.length > 0 && visible.every((e) => this.selectedEventIds.includes(e.id));
    },

    toggleSelectAllVisible(checked) {
      const ids = this.paginatedEditEvents().map((e) => e.id);
      if (checked) {
        this.selectedEventIds = [...new Set([...this.selectedEventIds, ...ids])];
      } else {
        this.selectedEventIds = this.selectedEventIds.filter((id) => !ids.includes(id));
      }
    },

    clearSelection() {
      this.selectedEventIds = [];
    },

    bulkDeleteSelected() {
      if (!this.selectedEventIds.length) return;
      const ids = new Set(this.selectedEventIds);
      this.timeline.events = this.timeline.events.filter((e) => !ids.has(e.id));
      this.timeline.events.forEach((e) => {
        e.linkedEventIds = (e.linkedEventIds || []).filter((lid) => !ids.has(lid));
      });
      this.clearSelection();
      this.notifyTimelineChanged();
      this.statusMessage = `Deleted ${ids.size} event${ids.size === 1 ? '' : 's'}.`;
      setTimeout(() => { if (!this.busy) this.statusMessage = ''; }, 2000);
    },

    timelineDiff() {
      if (!this.compareTimeline?.events?.length) return null;
      return diffTimelines(this.compareTimeline.events, this.timeline.events);
    },

    diffSummaryText() {
      const diff = this.timelineDiff();
      return diff ? formatDiffSummary(diff) : '';
    },

    diffChangeKey(change, index) {
      return change?.after?.id || change?.before?.id || `changed-${index}`;
    },

    diffChangeLabel(change) {
      const id = change?.after?.id || change?.before?.id || 'event';
      const fields = (change?.diffs || []).map((d) => d.field).join(', ');
      return `${id}: ${fields}`;
    },

    saveCurrentAsBaseline() {
      this.compareTimeline = JSON.parse(JSON.stringify(this.timeline));
      this.ensureEventIds(this.compareTimeline.events);
      this.compareLabel = `${this.timeline.meta.title || 'Current'} (baseline)`;
      if (!this.timeline.meta) this.timeline.meta = {};
      this.timeline.meta.showCompareOverlay = true;
      this.scheduleSave();
      this.statusMessage = 'Saved current timeline as comparison baseline.';
      setTimeout(() => { if (!this.busy) this.statusMessage = ''; }, 2500);
    },

    timelineStats() {
      return computeTimelineStats(this.timeline.events);
    },

    formatStatDate(iso) {
      if (!iso) return '—';
      return formatDate(iso, { timezone: this.displayTimezone(), seconds: false });
    },

    bulkApplyCategory(value) {
      if (!value) return;
      const ids = new Set(this.filteredEditEvents().map((e) => e.id));
      bulkUpdateEvents(this.timeline.events, ids, 'category', value);
      this.notifyTimelineChanged();
      this.statusMessage = `Set category on ${ids.size} event${ids.size === 1 ? '' : 's'}`;
      setTimeout(() => { if (!this.busy) this.statusMessage = ''; }, 2000);
    },

    bulkApplyPhase(value) {
      const phase = Number(value);
      if (!phase) return;
      const ids = new Set(this.filteredEditEvents().map((e) => e.id));
      bulkUpdateEvents(this.timeline.events, ids, 'phase', phase);
      this.notifyTimelineChanged();
      this.statusMessage = `Set phase on ${ids.size} event${ids.size === 1 ? '' : 's'}`;
      setTimeout(() => { if (!this.busy) this.statusMessage = ''; }, 2000);
    },

    exportTimeline() {
      if (this.timeline.meta.applyEditFiltersToExport && this.filterIsActive()) {
        return { ...this.timeline, events: this.filteredEditEvents() };
      }
      return this.timeline;
    },

    async exportDiffAs(format) {
      const diff = this.timelineDiff();
      if (!diff || (!diff.added.length && !diff.removed.length && !diff.changed.length)) {
        this.statusMessage = 'No baseline or no differences to export.';
        setTimeout(() => { this.statusMessage = ''; }, 2500);
        return;
      }
      const meta = {
        title: this.timeline.meta.title,
        currentTitle: this.timeline.meta.title || 'Current',
        baseTitle: this.compareTimeline?.meta?.title || this.compareLabel || 'Baseline',
      };
      const { exportDiffMarkdown, exportDiffCSV } = await import('./output/diff-export.js');
      if (format === 'markdown') exportDiffMarkdown(diff, meta);
      else exportDiffCSV(diff, meta);
      this.statusMessage = 'Diff exported.';
      setTimeout(() => { this.statusMessage = ''; }, 2000);
    },

    eventIndex(evt) {
      if (!evt?.id) return '';
      return this.timeline.events.findIndex((e) => e.id === evt.id) + 1;
    },

    duplicateEvent(id) {
      const evt = this.timeline.events.find((e) => e.id === id);
      if (!evt) return;
      const copy = {
        ...evt,
        id: `evt-${Date.now()}`,
        linkedEventIds: [],
        tags: [...(evt.tags || [])],
      };
      const idx = this.timeline.events.findIndex((e) => e.id === id);
      this.timeline.events.splice(idx + 1, 0, copy);
      this.notifyTimelineChanged();
    },

    reorderEvent(fromIndex, toIndex) {
      if (fromIndex === null || fromIndex === toIndex) return;
      const events = [...this.timeline.events];
      const [moved] = events.splice(fromIndex, 1);
      events.splice(toIndex, 0, moved);
      this.timeline.events = events;
      this.timeline.meta.manualOrder = true;
      this.notifyTimelineChanged();
    },

    sortEventsByDate() {
      this.timeline.events = sortEvents(this.timeline.events);
      this.timeline.meta.manualOrder = false;
      this.notifyTimelineChanged();
    },

    onDragStart(event, evt) {
      if (this.filterIsActive()) {
        event.preventDefault();
        return;
      }
      const index = this.timeline.events.findIndex((e) => e.id === evt.id);
      this.dragIndex = index;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(index));
    },

    onDragOver(event, evt) {
      if (this.filterIsActive()) return;
      event.preventDefault();
      this.dragOverIndex = this.timeline.events.findIndex((e) => e.id === evt.id);
    },

    onDragLeave() {
      this.dragOverIndex = null;
    },

    onDrop(evt) {
      if (this.filterIsActive()) return;
      const index = this.timeline.events.findIndex((e) => e.id === evt.id);
      this.reorderEvent(this.dragIndex, index);
      this.dragIndex = null;
      this.dragOverIndex = null;
    },

    onDragEnd() {
      this.dragIndex = null;
      this.dragOverIndex = null;
    },

    isDragOver(evt) {
      const i = this.timeline.events.findIndex((e) => e.id === evt.id);
      return this.dragOverIndex === i;
    },

    isDragging(evt) {
      const i = this.timeline.events.findIndex((e) => e.id === evt.id);
      return this.dragIndex === i;
    },

    linkToPrevious(id) {
      const idx = this.timeline.events.findIndex((e) => e.id === id);
      if (idx <= 0) return;
      const prev = this.timeline.events[idx - 1];
      const evt = this.timeline.events[idx];
      evt.linkedEventIds = [...new Set([...(evt.linkedEventIds || []), prev.id])];
      this.notifyTimelineChanged();
    },

    async renderPreview() {
      const el = document.getElementById('viz-preview');
      if (!el) return;
      const renderVisualization = await getRenderVisualization();
      renderVisualization(el, {
        events: this.timeline.events,
        meta: this.timeline.meta,
        vizType: this.vizType,
        vizStyle: this.vizStyle,
        theme: this.timeline.meta.theme,
        compareTimeline: this.compareTimeline,
      });
      await this.$nextTick();
      this.runLayoutAudit();
    },

    runLayoutAudit() {
      const el = document.getElementById('viz-preview');
      if (!el || this.tab !== 'design') return;
      const layout = auditPreviewLayout(el);
      this.previewLayoutScore = layout.score;
      this.previewLayoutOverflow = layout.overflowCount;
    },

    previewLayoutClass() {
      if (this.previewLayoutScore == null) return '';
      if (this.previewLayoutScore >= 88) return 'preview-quality-good';
      if (this.previewLayoutScore >= 70) return 'preview-quality-warn';
      return 'preview-quality-bad';
    },

    async exportPreviewAs(type) {
      await this.exportAs(type);
    },

    async prepareVisualExport(type) {
      if (this.tab !== 'design') {
        this.tab = 'design';
        await this.$nextTick();
      }
      this.renderPreview();
      await delay(350);
      const previewEl = document.getElementById('viz-preview');
      const exportTimeline = this.exportTimeline();
      const result = validateExport(exportTimeline, this.analysis, previewEl);
      if (previewEl && this.tab === 'design') {
        this.previewLayoutScore = result.layoutScore;
        this.previewLayoutOverflow = result.layoutOverflow ?? 0;
      }
      if (['png', 'pdf', 'html'].includes(type)) {
        this.exportPreviewThumb = await createExportThumbnail(previewEl);
      } else {
        this.exportPreviewThumb = null;
      }
      return result;
    },

    async exportAs(type) {
      const appendixTypes = ['appendix-pdf', 'appendix-png', 'report-pack', 'appendix-pptx', 'executive-pdf'];
      if (appendixTypes.includes(type)) {
        const exportTimeline = this.exportTimeline();
        const result = validateExport(exportTimeline, this.analysis);
        if (!result.ok) {
          this.exportPreflight = result;
          this.pendingExportType = type;
          this.showExportPreflight = true;
          return;
        }
        await this.runExport(type);
        return;
      }
      const visualTypes = ['png', 'pdf', 'pptx', 'svg', 'html'];
      if (visualTypes.includes(type)) {
        const result = await this.prepareVisualExport(type);
        if (canSkipVisualExportPreflight(type, result)) {
          await this.runExport(type);
          return;
        }
        this.exportPreflight = result;
        this.pendingExportType = type;
        this.showExportPreflight = true;
        return;
      }
      const exportTimeline = this.exportTimeline();
      const result = validateExport(exportTimeline, this.analysis);
      if (!result.ok) {
        this.exportPreflight = result;
        this.pendingExportType = type;
        this.showExportPreflight = true;
        return;
      }
      await this.runExport(type);
    },

    async loadCompareTimeline(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        this.compareTimeline = JSON.parse(text);
        this.compareLabel = file.name;
        this.vizType = 'compare';
        this.scheduleSave();
        this.$nextTick(() => this.renderPreview());
      } catch (e) {
        this.statusMessage = `Could not load comparison file: ${e.message}`;
      }
    },

    clearCompareTimeline() {
      this.compareTimeline = null;
      this.compareLabel = '';
      this.renderPreview();
    },

    async confirmExport() {
      const type = this.pendingExportType;
      this.showExportPreflight = false;
      this.exportPreflight = null;
      this.pendingExportType = null;
      if (type) await this.runExport(type);
    },

    cancelExport() {
      this.showExportPreflight = false;
      this.exportPreflight = null;
      this.exportPreviewThumb = null;
      this.pendingExportType = null;
    },

    exportPreflightModalTitle() {
      return exportConfirmLabel(this.pendingExportType);
    },

    exportPreflightSummaryText() {
      if (!this.pendingExportType || !this.exportPreflight) return '';
      return exportPreflightSummary(this.pendingExportType, this.exportPreflight);
    },

    exportPreflightStatusKind() {
      if (!this.exportPreflight) return 'ready';
      return exportPreflightStatus(this.exportPreflight);
    },

    exportPreflightConfirmLabel() {
      return exportConfirmLabel(this.pendingExportType);
    },

    exportPreflightIsVisual() {
      return ['png', 'pdf', 'svg', 'pptx', 'html'].includes(this.pendingExportType);
    },

    async runExport(type) {
      const visualTypes = ['png', 'pdf', 'pptx', 'svg', 'html', 'print'];
      if (visualTypes.includes(type) && this.tab !== 'design') {
        this.tab = 'design';
        await this.$nextTick();
        this.renderPreview();
        await delay(350);
      } else if (visualTypes.includes(type)) {
        await delay(150);
      }
      const el = document.getElementById('viz-preview');
      const exportTimeline = this.exportTimeline();
      const name = exportBasename(exportTimeline.meta);
      const title = exportTitle(exportTimeline.meta);
      if (type === 'json') await exportJSON(exportTimeline);
      else if (type === 'markdown') {
        const { exportMarkdown } = await import('./output/table-export.js');
        exportMarkdown(exportTimeline);
      }
      else if (type === 'csv') {
        const { exportCSV } = await import('./output/table-export.js');
        exportCSV(exportTimeline);
      }
      else if (type === 'stix') {
        const { exportSTIX } = await import('./output/export-stix.js');
        exportSTIX(exportTimeline);
      }
      else if (type === 'docx') {
        const { exportDocx } = await import('./output/export-docx.js');
        await exportDocx(exportTimeline);
      }
      else if (type === 'ical') {
        const { exportICal } = await import('./output/export-ical.js');
        exportICal(exportTimeline);
      }
      else if (type === 'png') {
        const verify = await exportPNG(el, name);
        this.reportExportVerify(verify);
      }
      else if (type === 'pdf') {
        const verify = await exportPDF(el, name, title);
        this.reportExportVerify(verify);
      }
      else if (type === 'appendix-pdf') {
        const { exportAppendixPDF } = await import('./output/export-appendix.js');
        const verify = await exportAppendixPDF(exportTimeline);
        this.reportExportVerify(verify);
      }
      else if (type === 'executive-pdf') {
        const { exportExecutivePDF } = await import('./output/export-executive.js');
        const verify = await exportExecutivePDF(exportTimeline);
        this.reportExportVerify(verify);
      }
      else if (type === 'appendix-png') {
        const { exportAppendixPNG } = await import('./output/export-appendix.js');
        const verify = await exportAppendixPNG(exportTimeline);
        this.reportExportVerify(verify);
      }
      else if (type === 'report-pack') {
        const { exportReportPack } = await import('./output/export-report-pack.js');
        await exportReportPack(exportTimeline);
      }
      else if (type === 'appendix-pptx') {
        const { exportAppendixPPTX } = await import('./output/export-pptx.js');
        await exportAppendixPPTX(exportTimeline);
      }
      else if (type === 'pptx') {
        const { exportPPTX } = await import('./output/export-pptx.js');
        await exportPPTX(exportTimeline, el);
      }
      else if (type === 'svg') {
        const { exportSVG } = await import('./output/export-svg.js');
        exportSVG(el, name);
      }
      else if (type === 'print') {
        const { exportPrint } = await import('./output/export-svg.js');
        exportPrint();
      }
      else if (type === 'html') exportStandaloneHTML(exportTimeline, el?.innerHTML || '');
      else if (type === 'link') {
        await this.openShareLink();
        return;
      }
      this.exportPreviewThumb = null;
    },

    reportExportVerify(verify) {
      if (!verify?.items?.length) {
        this.statusMessage = 'Export completed — layout verified.';
      } else if (verify.ok) {
        this.statusMessage = `Export completed — ${verify.items[0]?.message || 'review recommended.'}`;
      } else {
        this.statusMessage = verify.items[0]?.message || 'Export may have quality issues.';
      }
      setTimeout(() => { this.statusMessage = ''; }, 4000);
    },

    clearSavedDraft() {
      clearDraft();
      this.draftSavedAt = null;
      this.statusMessage = 'Draft cleared from browser storage.';
      setTimeout(() => { this.statusMessage = ''; }, 2000);
    },

    async runPdfOcr() {
      if (!this.pdfUploadBuffer) {
        this.statusMessage = 'Re-upload the PDF to run OCR.';
        return;
      }
      const { ocrPdf } = await import('./input/pdf-ocr.js');
      await this.runWithStatus(async () => {
        const { text, numPages } = await ocrPdf(this.pdfUploadBuffer, ({ page, total }) => {
          this.statusMessage = `OCR page ${page}/${total}… (first run downloads language data)`;
          this.progress = Math.round((page / total) * 95);
        }, this.ocrLanguage);
        this.inputText = text;
        this.pdfMeta = { ...this.pdfMeta, pages: numPages, chars: text.length, ocr: true };
        this.pdfNeedsOcr = false;
        this.statusMessage = `OCR extracted ${text.length.toLocaleString()} characters. Parsing…`;
      });
    },

    async onFileUpload(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      const name = file.name.toLowerCase();
      this.pdfMeta = null;
      this.pdfUploadBuffer = null;
      this.pdfNeedsOcr = false;

      if (name.endsWith('.pdf')) {
        this.inputMode = 'report';
        const { extractPdfFile } = await import('./input/pdf-extract.js');
        const { pdfLikelyNeedsOcr } = await import('./input/pdf-ocr.js');
        this.pdfUploadBuffer = await file.arrayBuffer();
        await this.runWithStatus(async () => {
          const { text, numPages } = await extractPdfFile(
            new File([this.pdfUploadBuffer], file.name, { type: file.type }),
            (page, total) => {
              this.statusMessage = `Reading PDF page ${page}/${total}…`;
              this.progress = Math.round((page / total) * 90);
            },
          );
          this.inputText = text;
          this.pdfMeta = { name: file.name, pages: numPages, chars: text.length };
          this.pdfNeedsOcr = pdfLikelyNeedsOcr(text, numPages);
          this.statusMessage = this.pdfNeedsOcr
            ? `Only ${text.length.toLocaleString()} characters found — try OCR for scanned PDFs.`
            : `Extracted ${text.length.toLocaleString()} characters from ${file.name}. Parsing…`;
        });
        return;
      }

      if (name.endsWith('.docx')) {
        this.inputMode = 'report';
        const { extractDocxFile } = await import('./input/docx-extract.js');
        await this.runWithStatus(async () => {
          const { text } = await extractDocxFile(file);
          this.inputText = text;
          this.pdfMeta = { name: file.name, pages: null, chars: text.length };
          this.statusMessage = `Extracted ${text.length.toLocaleString()} characters from Word doc. Parsing…`;
        });
        return;
      }

      if (name.endsWith('.json')) {
        await this.handleOpenTimelineFile({ target: { files: [file], value: '' } });
        return;
      }

      if (this.inputMode === 'import' || name.endsWith('.csv') || name.endsWith('.tsv')) {
        this.inputMode = 'import';
        if (name.endsWith('.csv')) this.importTool = 'generic-csv';
        const reader = new FileReader();
        reader.onload = () => { this.inputText = reader.result; };
        reader.readAsText(file);
        return;
      }

      this.inputMode = 'report';
      const reader = new FileReader();
      reader.onload = () => { this.inputText = reader.result; };
      reader.readAsText(file);
    },

    async onFileDrop(event) {
      event.preventDefault();
      event.currentTarget.classList.remove('drop-active');
      const file = event.dataTransfer?.files?.[0];
      if (!file) return;
      this.onFileUpload({ target: { files: [file] } });
    },

    onDropZoneDragOver(event) {
      event.preventDefault();
      event.currentTarget.classList.add('drop-active');
    },

    onDropZoneDragLeave(event) {
      event.currentTarget.classList.remove('drop-active');
    },
  };
}
