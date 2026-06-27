import { dedupeEventDetails } from './event-details.js';
import { linkSequentialEvents, enrichEvents } from './edit/enrich.js';
import { collapseDuplicateEvents } from './edit/merge-events.js';
import { analyzeTimeline, applySuggestion, analysisIssues, analysisRecommendations } from './edit/analyzer.js';
import { buildActivityPreview } from './edit/activity-preview.js';
import { anonymizeTimeline, scanTimeline } from './edit/anonymize.js';
import { extractObservables, observablesToCsv, observablesToText } from './edit/observables.js';
import {
  countByField,
  countByTag,
  filterEvents,
  filtersActive,
  observableFilterState,
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
  DESIGN_AUDIENCES,
  DESIGN_LAYOUTS,
  audienceLabel,
  caseFileLayouts,
  designToViz,
  isCaseFileLayout,
  layoutById,
  layoutExportHints,
  layoutsForAudience,
  suggestLayoutId,
  vizToDesign,
} from './design/design-picker.js';
import {
  listCustomRenderers,
  loadBuiltinPlugins,
} from './design/plugins.js';
import { MITRE_TECHNIQUES } from './data/mitre-techniques.js';
import { processInput, parseInputHint, processInputDetailed } from './input/parser.js';
import { detectInputFormat } from './input/detect-format.js';
import { serializeEventsToSource, sourceFormatForInputMode } from './input/serialize.js';
import { parseIrTool } from './input/ir-tools.js';
import { exportJSON, exportPDF, exportPNG, exportStandaloneHTML } from './output/export.js';
import { encodeShareLink, decodeShareLink } from './output/share-encode.js';
import { validateExport } from './output/export-validate.js';
import { createExportThumbnail } from './output/export-capture.js';
import { exportBasename, exportTitle } from './output/export-names.js';
import {
  buildExportPreviewText,
  exportConfirmLabel,
  exportPreflightStatus,
  exportPreflightSummary,
  VISUAL_PREVIEW_TYPES,
} from './output/export-preflight.js';
import { downloadSharePack, shareModeHint } from './output/share-pack.js';
import { findPreviewEventTarget, stepEventIndex } from './edit/event-focus.js';
import { hasWelcomeBeenSeen, markWelcomeSeen } from './onboarding.js';
import { clearDraft, draftAgeLabel, loadDraft, loadDraftAsync, migrateLegacyStorage, saveDraft } from './storage.js';
import { accentHoverColor, DEFAULT_ACCENT, normalizeAccentColor } from './theme.js';
import {
  applyUserSettingsToMeta,
  hasUserSettingsCookie,
  loadUserSettings,
  readUserSettingsFromMeta,
  saveUserSettings,
} from './user-settings.js';
import { COMMON_TIMEZONES, resolveTimezone, timezoneLabel, timezoneShortLabel, browserTimezone } from './timezones.js';
import { APP_CONTACT_EMAIL, APP_CONTACT_NAME, APP_DESCRIPTION, APP_FULL_TITLE, APP_NAME, APP_SUBTITLE, APP_VERSION } from './version.js';
import { createEmptyTimeline } from './workspace.js';
import { WORKSPACE_STEPS } from './workspace-tabs.js';
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
    workspaceSteps: WORKSPACE_STEPS,
    workspaceVisited: { input: true, edit: false, publish: false },
    incidentOverviewCollapsed: false,
    busy: false,
    statusMessage: '',
    _statusFlashTimer: null,
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
    editTechniqueFilter: '',
    showDiffPanel: true,
    selectedEventIds: [],

    pluginStyles: [],

    timezones: COMMON_TIMEZONES,
    showShareModal: false,
    shareLinkResult: null,
    shareFallbackTimeline: null,
    showNewTimelineModal: false,
    showWelcomeModal: false,
    showClearSourceModal: false,
    demoBannerVisible: false,
    inputImportSuccess: null,

    _lastInputText: '',
    _allowInputClear: false,

    analysis: null,
    dragIndex: null,
    dragOverIndex: null,
    showShortcutsHelp: false,
    showExportPreflight: false,
    exportPreflight: null,
    exportPreviewThumb: null,
    exportPreviewText: null,
    pendingExportType: null,
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
    /** Bumped when undo/redo stack changes so Alpine re-evaluates canUndo/canRedo. */
    historyTick: 0,

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
    detectedFormatHint: '',

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
        title: 'Reports & briefings',
        items: [
          { type: 'executive-pdf', label: 'Executive one-pager', hint: 'PDF summary for leadership' },
          { type: 'appendix-pdf', label: 'Appendix page (PDF)', hint: 'Print-ready appendix from preview' },
          { type: 'appendix-png', label: 'Appendix page (PNG)', hint: 'Raster appendix for slide decks' },
          { type: 'report-pack', label: 'Report pack (ZIP)', hint: 'PDF, PNG, and data in one download' },
          { type: 'docx', label: 'Word document', hint: 'Event table for IR reports' },
          { type: 'pptx', label: 'PowerPoint deck', hint: 'Slides from current layout' },
          { type: 'appendix-pptx', label: 'Appendix slide (PPTX)', hint: 'Single appendix slide' },
        ],
      },
      {
        title: 'Evidence & data',
        items: [
          { type: 'markdown', label: 'Markdown table', hint: 'Paste into reports or wikis' },
          { type: 'csv', label: 'CSV export', hint: 'Spreadsheet-friendly event rows' },
          { type: 'json', label: 'JSON timeline', hint: 'Full structured timeline data' },
          { type: 'stix', label: 'STIX 2.1 bundle', hint: 'Threat intel platform interchange' },
          { type: 'ical', label: 'iCalendar (.ics)', hint: 'Calendar entries per event' },
        ],
      },
      {
        title: 'Share & portable',
        items: [
          { type: 'link', label: 'Shareable link', hint: 'URL-encoded timeline for colleagues' },
          { type: 'share-file', label: 'Share file (.json)', hint: 'Portable timeline file' },
          { type: 'html', label: 'Interactive HTML', hint: 'Self-contained offline viewer' },
        ],
      },
    ],

    publishDeliverSections: [
      {
        id: 'this-view',
        title: 'This view',
        hint: 'Exports exactly what you see in the preview.',
        items: [
          { type: 'png', label: 'PNG image', icon: '🖼' },
          { type: 'pdf', label: 'PDF document', icon: '📄' },
          { type: 'pptx', label: 'PowerPoint', icon: '📊' },
          { type: 'svg', label: 'SVG vector', icon: '◇' },
          { type: 'print', label: 'Print…', icon: '🖨' },
        ],
      },
    ],

    headerToolsSections: [
      {
        title: 'Refine timeline',
        accent: true,
        items: [
          { action: 'quality', label: 'Data quality report', hint: 'Score, issues, and fix suggestions', featured: true },
          { action: 'merge-duplicates', label: 'Merge duplicate events', hint: 'Collapse matching time, host, and user' },
          { action: 'link-sequential', label: 'Link sequential events', hint: 'Chain events in chronological order' },
          { action: 'phases', label: 'Edit attack phases…', hint: 'Rename or reorder kill-chain phases' },
        ],
      },
      {
        title: 'Baseline compare',
        items: [
          { action: 'load-baseline', label: 'Load baseline file…', hint: 'Compare against an earlier export' },
          { action: 'baseline', label: 'Snapshot current as baseline', hint: 'In-memory diff anchor for changes' },
          { action: 'diff-markdown', label: 'Diff report (Markdown)', hint: 'Adds, removals, and edits', requiresBaseline: true },
          { action: 'diff-csv', label: 'Diff table (CSV)', hint: 'Spreadsheet-friendly diff export', requiresBaseline: true },
        ],
      },
      {
        title: 'Privacy',
        items: [
          { action: 'anonymize', label: 'Anonymize timeline…', hint: 'Replace hostnames and usernames' },
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
    designAudience: 'all',
    designLayout: 'horizon-strip',
    designAudiences: DESIGN_AUDIENCES,
    designLayouts: DESIGN_LAYOUTS,
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
      try {
        this.incidentOverviewCollapsed = localStorage.getItem('timelineforge-incident-collapsed') === '1';
        const visited = localStorage.getItem('timelineforge-workspace-visited');
        if (visited) this.workspaceVisited = { ...this.workspaceVisited, ...JSON.parse(visited) };
      } catch {
        /* ignore storage errors */
      }

      this.$watch('tab', (t) => {
        if (t === 'publish') this.$nextTick(() => this.renderPreview());
      });
      this.$watch('vizType', () => {
        this.normalizeVizSelection();
        this.syncDesignFromViz();
        this.$nextTick(() => this.renderPreview());
      });
      this.$watch('compareView', () => {
        if (!this.timeline.meta) this.timeline.meta = {};
        this.timeline.meta.compareView = this.compareView;
        this.scheduleSave();
        if (this.tab === 'publish' && this.vizType === 'compare') {
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
      this.syncDesignFromViz();
      this.bootstrapFromUrlOrDraft();
    },

    syncDesignFromViz() {
      let d = vizToDesign(this.vizType, this.vizStyle, this.compareView);
      const metaId = this.timeline.meta?.designLayout || this.timeline.meta?.designVariant;
      if (metaId) {
        const fromMeta = designToViz(metaId);
        if (fromMeta.vizType === this.vizType && (fromMeta.vizStyle || 'default') === (this.vizStyle || 'default')) {
          d = { layoutId: fromMeta.layoutId };
        }
      }
      this.designLayout = d.layoutId;
    },

    filteredDesignLayouts() {
      return layoutsForAudience(this.designAudience);
    },

    activeDesignLayout() {
      return layoutById(this.designLayout);
    },

    activeDesignLayoutDesc() {
      return this.activeDesignLayout()?.desc || '';
    },

    activeDesignLayoutTagline() {
      return this.activeDesignLayout()?.tagline || '';
    },

    setDesignAudience(audienceId) {
      this.designAudience = audienceId;
    },

    applyDesignLayout(layoutId) {
      const mapped = designToViz(layoutId);
      this.designLayout = mapped.layoutId;
      this.vizType = mapped.vizType;
      this.vizStyle = mapped.vizStyle || 'default';
      if (this.timeline.meta) {
        this.timeline.meta.designLayout = mapped.layoutId;
        delete this.timeline.meta.designFormat;
        delete this.timeline.meta.designOrientation;
        delete this.timeline.meta.designVariant;
      }
      this.normalizeVizSelection();
      this.scheduleSave();
      this.$nextTick(() => this.renderPreview());
    },

    isCaseFileFamilyActive() {
      return isCaseFileLayout(this.designLayout);
    },

    caseFileLayoutOptions() {
      return caseFileLayouts();
    },

    allPublishExportItems() {
      return [
        ...this.publishDeliverSections.flatMap((section) => section.items),
        ...this.headerExportSections.flatMap((section) => section.items),
      ];
    },

    publishExportActions() {
      const hints = new Set(layoutExportHints(this.designLayout));
      const seen = new Set();
      const items = [];
      for (const item of this.publishDeliverSections.flatMap((section) => section.items)) {
        if (seen.has(item.type)) continue;
        seen.add(item.type);
        items.push({ ...item, recommended: hints.has(item.type) });
      }
      return items;
    },

    primaryPublishActions() {
      return this.publishExportActions().filter((item) => item.recommended);
    },

    secondaryPublishActions() {
      return this.publishExportActions().filter((item) => !item.recommended);
    },

    headerExportMenuSections() {
      const sections = [];
      if (this.timeline.events?.length) {
        const quick = this.primaryPublishActions().map((item) => ({
          type: item.type,
          label: item.label.replace(/^(.+) image$/, '$1').replace(/^(.+) document$/, '$1'),
          hint: 'From current Deliver layout preview',
        }));
        if (quick.length) {
          sections.push({ title: 'Current layout', accent: true, items: quick });
        }
      }
      sections.push(...this.headerExportSections);
      return sections;
    },

    headerToolsMenuSections() {
      const hasBaseline = Boolean(this.compareTimeline?.events?.length);
      return this.headerToolsSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => !item.requiresBaseline || hasBaseline),
        }))
        .filter((section) => section.items.length > 0);
    },

    publishSectionsForLayout() {
      return this.publishDeliverSections;
    },

    isRecommendedExport(type) {
      return layoutExportHints(this.designLayout).includes(type);
    },

    runPublishExport(type) {
      if (type === 'share-file') return this.exportAs('share-file');
      return this.exportAs(type);
    },

    suggestDesignLayout() {
      this.applySuggestedDesignLayout({ force: true });
    },

    applySuggestedDesignLayout({ force = false } = {}) {
      const saved = this.timeline.meta?.designLayout;
      if (saved && !force) return;
      const id = suggestLayoutId(this.timeline.events?.length || 0);
      this.applyDesignLayout(id);
    },

    normalizeVizSelection() {
      const legacy = { icons: 'default', fahrplan: 'metro', mermaid: 'sequence', retro: 'default', scribing: 'default' };
      if (legacy[this.vizStyle]) this.vizStyle = legacy[this.vizStyle];
      if (this.vizType === 'compare') {
        this.vizType = 'activity-strip';
        this.vizStyle = 'default';
      }
      if (this.vizType === 'activity-strip' || this.vizType === 'appendix-timeline' || this.vizType === 'event-stack' || this.vizType === 'host-lanes' || this.vizType === 'evidence-table' || this.vizType === 'milestone-storyboard') {
        this.vizStyle = 'default';
        return;
      }
      if (this.vizType === 'soc-details' && this.vizStyle === 'case-full') return;
      const compareIds = new Set(this.compareViews.map((v) => v.id));
      // "gantt" is both a compare view and a soc-details layout style
      if (compareIds.has(this.vizStyle) && !(this.vizType === 'soc-details' && this.vizStyle === 'gantt')) {
        this.vizStyle = 'default';
      }
      const available = new Set(this.availableVizStyles().map((s) => s.id));
      if (!available.has(this.vizStyle)) this.vizStyle = 'default';
    },

    availableVizStyles() {
      if (this.vizType === 'compare') return this.compareViews;
      if (this.vizType === 'activity-strip' || this.vizType === 'appendix-timeline') return [];
      return [...this.vizStyles, ...(this.pluginStyles || [])];
    },

    showVizStylePicker() {
      return false;
    },

    selectedVizType() {
      return this.vizTypes.find((v) => v.id === this.vizType) || this.vizTypes[0];
    },

    designStyleLabel() {
      return this.vizType === 'compare' ? 'Compare view' : 'Style';
    },

    async bootstrapFromUrlOrDraft() {
      if (this._sharedFromHash) {
        this.ensureTimelineMeta();
        this.applyStoredUserSettings();
        this.afterTimelineLoad();
        if (this.refreshEventDetails()) this.scheduleSave();
        this.applyTheme();
        this.notifyTimelineChanged({ skipSourceSync: true });
        this.resetAppHistory();
        this.scheduleAutoAnalyze();
        this.$nextTick(() => this.renderPreview());
        return;
      }

      const hash = window.location.hash || '';
      try {
        const shared = await decodeShareLink(hash);
        if (shared?.events?.length) {
          markWelcomeSeen();
          this.timeline = shared;
          this.ensureTimelineMeta();
          this.applyStoredUserSettings();
          this.afterTimelineLoad();
          if (this.refreshEventDetails()) this.scheduleSave();
          this.applyTheme();
          this.notifyTimelineChanged({ skipSourceSync: true });
          this.tab = 'publish';
          this.resetAppHistory();
          this.scheduleAutoAnalyze();
          this.$nextTick(() => this.renderPreview());
          return;
        }
        if (hash.includes('data=')) {
          this.statusMessage = 'Could not load shared timeline — link may be truncated or corrupted.';
          this.scheduleStatusClear(8000);
        } else if (hash.includes('share=')) {
          this.statusMessage = 'This bookmark link only works in the browser that created it — ask for a shareable link or JSON file.';
          this.scheduleStatusClear(8000);
        }
      } catch {
        if (hash.includes('data=') || hash.includes('share=')) {
          this.statusMessage = 'Could not load shared timeline from this link.';
          this.scheduleStatusClear(8000);
        }
      }

      const draft = (await loadDraftAsync()) || loadDraft();
      if (draft?.timeline) {
        this.timeline = draft.timeline;
        this.compareTimeline = draft.compareTimeline || null;
        this.draftSavedAt = draft.savedAt;
        this.ensureTimelineMeta();
        this.applyStoredUserSettings();
        this.afterTimelineLoad();
        if (this.refreshEventDetails()) this.scheduleSave();
        this.applyTheme();
        if (this.timeline.events?.length) this.notifyTimelineChanged({ skipSourceSync: true });
      } else if (!hasWelcomeBeenSeen()) {
        this.showWelcomeModal = true;
      }
      this.resetAppHistory();
      if (this.timeline.events?.length) this.scheduleAutoAnalyze();
    },

    initAutomation() {
      let ready = false;
      setTimeout(() => { ready = true; }, 600);

      this.$watch('inputText', () => {
        if (!ready || this._syncingSource) return;
        this.persistInputToMeta();
        const trimmed = this.inputText.trim();
        if (!trimmed) {
          if (this.timeline.events.length && !this._allowInputClear && this._lastInputText?.trim()) {
            this.showClearSourceModal = true;
            this._syncingSource = true;
            this.inputText = this._lastInputText;
            this.$nextTick(() => { this._syncingSource = false; });
            return;
          }
          if (this._allowInputClear) {
            this.inputError = '';
            this.inputParseStats = null;
          }
          return;
        }
        this._lastInputText = this.inputText;
      });

      this.$watch('importTool', () => {
        if (!ready || this._syncingSource) return;
        this.persistInputToMeta();
      });

      this.$watch('inputMode', () => {
        if (!ready || this._syncingSource) return;
        this.timeline.meta.sourceMode = this.inputMode;
        if (this.timeline.events?.length) {
          this.syncSourceFromEvents();
        }
      });
    },

    welcomeStartBlank() {
      markWelcomeSeen();
      this.showWelcomeModal = false;
      this.demoBannerVisible = false;
      this.statusMessage = 'Blank timeline — paste or import your data in Collect.';
      this.scheduleStatusClear(3000);
    },

    async welcomeTrySample() {
      markWelcomeSeen();
      this.showWelcomeModal = false;
      await this.loadFileSample('example');
    },

    dismissDemoBanner() {
      this.demoBannerVisible = false;
    },

    goToInputFromDemoBanner() {
      this.setTab('input');
    },

    confirmClearSource() {
      this._allowInputClear = true;
      this.showClearSourceModal = false;
      this.inputText = '';
      this._lastInputText = '';
      this.timeline.events = [];
      this.inputParseStats = null;
      this.inputError = '';
      this.inputImportSuccess = null;
      this.demoBannerVisible = false;
      if (this.timeline.meta) this.timeline.meta.isDemoSample = false;
      this.notifyTimelineChanged({ fromInput: true });
      this._allowInputClear = false;
      this.statusMessage = 'Source cleared — timeline events removed.';
      this.scheduleStatusClear(2500);
    },

    cancelClearSource() {
      this.showClearSourceModal = false;
    },

    canImportTimeline() {
      return Boolean(this.inputText?.trim()) && !this.busy;
    },

    async importTimeline() {
      await this.processInputAuto();
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
      this.applyInputDetection(text);
      this.statusMessage = 'Pasted — click Import timeline when ready.';
      this.scheduleStatusClear(3000);
    },

    onSourcePaste(e) {
      const text = e.clipboardData?.getData('text/plain');
      if (!text?.trim()) return;
      this.applyInputDetection(text);
    },

    applyInputDetection(text) {
      const detected = detectInputFormat(text);
      if (!detected) {
        this.detectedFormatHint = '';
        return;
      }
      this.inputMode = detected.mode;
      if (detected.importTool) this.importTool = detected.importTool;
      const suffix = detected.confidence === 'high' ? '' : ' (best guess)';
      this.detectedFormatHint = `Detected: ${detected.label}${suffix}`;
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
      this._lastInputText = this.inputText;
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
      this.syncDesignFromViz();
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

    bumpHistoryUi() {
      this.historyTick += 1;
    },

    resetAppHistory() {
      appHistory = createHistory(this.timeline);
      this.bumpHistoryUi();
    },

    pushHistoryNow() {
      if (!appHistory) return;
      clearTimeout(historyTimer);
      historyTimer = null;
      const idx = appHistory.index;
      const len = appHistory.stack.length;
      pushHistoryState(appHistory, this.timeline);
      if (appHistory.index !== idx || appHistory.stack.length !== len) {
        this.bumpHistoryUi();
      }
    },

    scheduleHistoryPush() {
      if (!appHistory) return;
      clearTimeout(historyTimer);
      historyTimer = setTimeout(() => this.pushHistoryNow(), 400);
    },

    flushPendingTimelineUpdates() {
      clearTimeout(changeTimer);
      changeTimer = null;
      if (appHistory) this.pushHistoryNow();
    },

    canUndo() {
      void this.historyTick;
      return appHistory ? historyCanUndo(appHistory) : false;
    },

    canRedo() {
      void this.historyTick;
      return appHistory ? historyCanRedo(appHistory) : false;
    },

    undo() {
      this.flushPendingTimelineUpdates();
      if (!this.canUndo()) return;
      const restored = undoHistory(appHistory);
      if (restored) {
        this.timeline = restored;
        this.ensureTimelineMeta();
        this.hydrateInputFromTimeline();
        this.notifyTimelineChanged({ skipHistory: true, skipSourceSync: true });
        this.statusMessage = 'Undone.';
      }
      this.bumpHistoryUi();
      this.scheduleStatusClear(1500);
    },

    redo() {
      this.flushPendingTimelineUpdates();
      if (!this.canRedo()) return;
      const restored = redoHistory(appHistory);
      if (restored) {
        this.timeline = restored;
        this.ensureTimelineMeta();
        this.hydrateInputFromTimeline();
        this.notifyTimelineChanged({ skipHistory: true, skipSourceSync: true });
        this.statusMessage = 'Redone.';
      }
      this.bumpHistoryUi();
      this.scheduleStatusClear(1500);
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
        if (this.tab === 'publish') this.renderPreview();
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
      this.timeline.meta.isDemoSample = false;
      this.demoBannerVisible = false;
      this.inputImportSuccess = { count: events.length };
      this._lastInputText = this.inputText;
      this.notifyTimelineChanged({ fromInput: true });
      let msg = `${events.length} events imported`;
      if (this.inputParseStats?.skipped) {
        msg += ` (${this.inputParseStats.skipped} line(s) skipped)`;
      }
      this.statusMessage = msg;
      this.scheduleStatusClear(3500);
    },

    ensureTimelineMeta() {
      if (!this.timeline.meta) this.timeline.meta = {};
      if (!this.timeline.meta.theme) this.timeline.meta.theme = 'light';
      if (!this.timeline.meta.accentColor) this.timeline.meta.accentColor = DEFAULT_ACCENT;
      this.timeline.meta.accentColor = normalizeAccentColor(this.timeline.meta.accentColor);
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

    /** Cookie-backed UI prefs (theme, timezone, accent) survive sample/file loads. */
    applyStoredUserSettings() {
      if (hasUserSettingsCookie()) {
        applyUserSettingsToMeta(this.timeline.meta, loadUserSettings());
      } else {
        saveUserSettings(readUserSettingsFromMeta(this.timeline.meta));
      }
    },

    persistUserSettings() {
      saveUserSettings(readUserSettingsFromMeta(this.timeline.meta));
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
      this.persistUserSettings();
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

    timelineObservables() {
      const events = this.filterIsActive() ? this.filteredEditEvents() : (this.timeline.events || []);
      return extractObservables(events);
    },

    async copyObservables() {
      const text = observablesToText(this.timelineObservables());
      if (!text) {
        this.statusMessage = 'No observables found in timeline.';
        this.scheduleStatusClear(2500);
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        this.statusMessage = 'Observables copied to clipboard.';
      } catch {
        this.statusMessage = 'Could not copy observables.';
      }
      this.scheduleStatusClear(2500);
    },

    async downloadObservablesCsv() {
      const obs = this.timelineObservables();
      if (!obs.total) {
        this.statusMessage = 'No observables found in timeline.';
        this.scheduleStatusClear(2500);
        return;
      }
      const { downloadText } = await import('./output/table-export.js');
      const base = exportBasename(this.timeline.meta);
      downloadText(observablesToCsv(obs), `${base}-observables.csv`, 'text/csv');
      this.statusMessage = `Exported ${obs.total} observable(s).`;
      this.scheduleStatusClear(2500);
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
        this.scheduleStatusClear(2500);
        return;
      }
      this.updateEvent(id, field, parsed);
    },

    onIncidentMetaChange() {
      this.scheduleSave();
      if (this.tab === 'publish') this.$nextTick(() => this.renderPreview());
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
      if (this.tab === 'publish') this.$nextTick(() => this.renderPreview());
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
      this.persistUserSettings();
      this.applyTheme();
      this.scheduleSave();
      if (this.tab === 'publish') this.$nextTick(() => this.renderPreview());
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
        this.timeline.meta.isDemoSample = true;
        this.demoBannerVisible = true;
        this.inputImportSuccess = null;
        this.applyStoredUserSettings();
        this.applyTheme();
        this.resetAppHistory();
        this.afterTimelineLoad();
        this.applySuggestedDesignLayout({ force: true });
        this.notifyTimelineChanged({ skipHistory: true, skipSourceSync: true });
        this.scheduleAutoAnalyze();
        const label = this.fileSamples.find((s) => s.id === id)?.label || id;
        const layoutLabel = this.activeDesignLayout()?.label || 'layout';
        this.statusMessage = `Loaded ${label} (${this.timeline.events.length} events) — ${layoutLabel} layout.`;
        this.scheduleStatusClear(2500);
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
        this.scheduleStatusClear(2500);
        return;
      }
      this.timeline.events = linkSequentialEvents(events);
      this.notifyTimelineChanged();
      this.statusMessage = 'Sequential links applied — try Attack graph in Deliver.';
      this.scheduleStatusClear(3000);
    },

    applyMergeDuplicates() {
      const events = this.timeline.events || [];
      if (!events.length) {
        this.statusMessage = 'Add events before merging duplicates.';
        this.scheduleStatusClear(2500);
        return;
      }
      const { events: merged, removed } = collapseDuplicateEvents(events);
      if (!removed) {
        this.statusMessage = 'No duplicate events found.';
        this.scheduleStatusClear(2500);
        return;
      }
      this.timeline.events = merged;
      this.notifyTimelineChanged();
      this.statusMessage = `Merged ${removed} duplicate event${removed === 1 ? '' : 's'}.`;
      this.scheduleStatusClear(3000);
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

    scheduleStatusClear(ms = 8000) {
      if (this._statusFlashTimer) clearTimeout(this._statusFlashTimer);
      const duration = Math.max(ms, 8000);
      this._statusFlashTimer = setTimeout(() => {
        if (!this.busy) this.statusMessage = '';
        this._statusFlashTimer = null;
      }, duration);
    },

    flashStatus(message, ms = 8000) {
      this.statusMessage = message;
      this.scheduleStatusClear(ms);
    },

    clearStatusFlash() {
      if (this._statusFlashTimer) clearTimeout(this._statusFlashTimer);
      this._statusFlashTimer = null;
      this.statusMessage = '';
    },

    setTab(t) {
      if (t === 'design' || t === 'output' || t === 'output-tab') t = 'publish';
      this.tab = t;
      this.workspaceVisited[t] = true;
      try {
        localStorage.setItem('timelineforge-workspace-visited', JSON.stringify(this.workspaceVisited));
      } catch {
        /* ignore */
      }
      this.closeHeaderMenu();
      this.closeAllModals();
      if (t === 'input' && this.timeline.events?.length) {
        this.syncSourceFromEvents();
      }
      if (t === 'publish') this.$nextTick(() => this.renderPreview());
    },

    toggleIncidentOverview() {
      this.incidentOverviewCollapsed = !this.incidentOverviewCollapsed;
      try {
        localStorage.setItem('timelineforge-incident-collapsed', this.incidentOverviewCollapsed ? '1' : '0');
      } catch {
        /* ignore */
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
      const map = { '1': 'input', '2': 'edit', '3': 'publish' };
      if (map[e.key]) {
        e.preventDefault();
        this.setTab(map[e.key]);
      }
      if (e.key === 's') {
        e.preventDefault();
        saveDraft(this.timeline, this.compareTimeline);
        this.draftSavedAt = Date.now();
        this.statusMessage = 'Draft saved.';
        this.scheduleStatusClear(1500);
      }
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      }
      if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        this.redo();
      }
      if (e.key === 'p' && this.tab === 'publish') {
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
      if (this.tab !== 'publish') return;
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
        this.statusMessage = 'Event is hidden by active Refine filters — clear filters to edit it.';
        this.scheduleStatusClear(3500);
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

    openHeaderExportMenu() {
      this.headerMenuOpen = 'export';
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
        this.scheduleStatusClear(1500);
      }
      else if (action === 'new') this.openNewTimelineModal();
      else if (action === 'sample') this.loadFileSample(arg);
      else if (action === 'about') this.openAboutModal();
    },

    async headerExport(type) {
      this.closeHeaderMenu();
      if (type === 'output-tab' || type === 'publish-tab') {
        this.setTab('publish');
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
      if (action === 'merge-duplicates') {
        this.applyMergeDuplicates();
        return;
      }
      if (action === 'baseline') {
        this.saveCurrentAsBaseline();
        return;
      }
      if (action === 'load-baseline') {
        this.triggerLoadBaseline();
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
      if (action === 'output-tab' || action === 'publish-tab') {
        this.setTab('publish');
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

    openPublishTab() {
      this.setTab('publish');
    },

    openOutputTab() {
      this.openPublishTab();
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
      const settings = loadUserSettings();

      clearDraft();
      clearTimeout(saveTimer);
      clearTimeout(historyTimer);
      clearTimeout(analyzeTimer);
      clearTimeout(previewTimer);

      this.timeline = createEmptyTimeline(settings);
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
      this.editTechniqueFilter = '';
      this.selectedEventIds = [];
      this.focusedEventId = null;
      this.analysis = null;
      this.currentFileName = null;
      this.inputParseStats = null;
      this.inputImportSuccess = null;
      this.demoBannerVisible = false;

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

      this.resetAppHistory();

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

    shareLinkHint(mode) {
      return shareModeHint(mode, this.shareLinkResult?.host || '');
    },

    currentShareHost() {
      return typeof window !== 'undefined' ? window.location.host : '';
    },

    closeShareModal() {
      this.showShareModal = false;
      this.shareLinkResult = null;
      this.shareFallbackTimeline = null;
    },

    async copyShareLink() {
      const url = this.shareLinkResult?.url;
      if (!url) return;
      try {
        await navigator.clipboard.writeText(url);
        this.statusMessage = 'Link copied to clipboard.';
      } catch {
        this.statusMessage = 'Could not copy — select the link and copy manually.';
      }
      this.scheduleStatusClear(2500);
    },

    async downloadShareFallback() {
      if (this.shareFallbackTimeline) {
        const result = await downloadSharePack(this.shareFallbackTimeline);
        if (result.copied) {
          this.statusMessage = 'Timeline file downloaded — sharing instructions copied to clipboard.';
        } else {
          this.statusMessage = 'Timeline file downloaded — send the JSON to open in TimelineForge (Header → Open).';
        }
        this.scheduleStatusClear(4000);
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
      this.scheduleStatusClear(4000);
    },

    applyAnonymize() {
      const { timeline } = anonymizeTimeline(this.timeline);
      this.timeline = timeline;
      this.closeAnonymizeModal();
      this.notifyTimelineChanged();
      this.statusMessage = 'Timeline anonymized. Review placeholders in Refine.';
      this.scheduleStatusClear(3000);
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
        technique: this.editTechniqueFilter,
      });
    },

    editFilterState() {
      return {
        search: this.editSearch,
        host: this.editHostFilter,
        user: this.editUserFilter,
        category: this.editCategoryFilter,
        tag: this.editTagFilter,
        technique: this.editTechniqueFilter,
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
        this.timeline.meta.isDemoSample = false;
        this.demoBannerVisible = false;
        this.inputImportSuccess = null;
        this.applyStoredUserSettings();
        if (this.refreshEventDetails()) this.scheduleSave();
        this.applyTheme();
        this.resetAppHistory();
        this.afterTimelineLoad();
        this.applySuggestedDesignLayout();
        this.notifyTimelineChanged({ skipHistory: true, skipSourceSync: true });
        this.tab = 'input';
        this.statusMessage = `Opened ${file.name} (${this.timeline.events.length} events)`;
        this.scheduleStatusClear(2500);
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
      this.scheduleStatusClear(2000);
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

    uniqueTechniques() {
      return uniqueFieldValues(this.timeline.events, 'technique');
    },

    techniqueEventCount(technique) {
      const t = technique.toUpperCase();
      return this.timeline.events.filter((e) => {
        const et = (e.technique || '').trim().toUpperCase();
        return et === t || et.startsWith(`${t}.`);
      }).length;
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

    filterByObservable(item) {
      if (!item?.value) return;
      const next = observableFilterState(item.value, this.uniqueHostnames(), {
        search: this.editSearch,
        host: this.editHostFilter,
      });
      this.editSearch = next.search;
      this.editHostFilter = next.host;
      this.editUserFilter = next.user;
      this.editCategoryFilter = next.category;
      this.editTagFilter = next.tag;
      this.editTechniqueFilter = next.technique;
      if (!filtersActive(next)) {
        this.statusMessage = 'Cleared observable filter.';
      } else if (next.host) {
        this.statusMessage = `Filtering by host ${next.host}.`;
      } else {
        const label = item.value.length > 36 ? `${item.value.slice(0, 34)}…` : item.value;
        this.statusMessage = `Filtering events containing ${label}.`;
      }
      this.scheduleStatusClear(2200);
    },

    observableFilterActive(value) {
      if (!value) return false;
      if (this.editHostFilter === value) return true;
      return this.editSearch.trim() === value;
    },

    selectUserFilter(user) {
      this.editUserFilter = toggleSingleFilter(this.editUserFilter, user);
    },

    selectCategoryFilter(cat) {
      this.editCategoryFilter = toggleSingleFilter(this.editCategoryFilter, cat);
    },

    selectTechniqueFilter(technique) {
      this.editTechniqueFilter = toggleSingleFilter(this.editTechniqueFilter, technique);
    },

    clearEditFilters() {
      this.editSearch = '';
      this.editHostFilter = '';
      this.editUserFilter = '';
      this.editCategoryFilter = '';
      this.editTagFilter = '';
      this.editTechniqueFilter = '';
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
      this.scheduleStatusClear(2000);
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
      this.compareLabel = `${this.timeline.meta.title || 'Current'} (snapshot)`;
      if (!this.timeline.meta) this.timeline.meta = {};
      this.timeline.meta.showCompareOverlay = true;
      this.scheduleSave();
      this.flashStatus('Baseline snapshot saved — diff summary is in Refine sidebar.');
      this.$nextTick(() => this.renderPreview());
    },

    triggerLoadBaseline() {
      this.$refs.loadBaselineInput?.click();
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
      this.scheduleStatusClear(2000);
    },

    bulkApplyPhase(value) {
      const phase = Number(value);
      if (!phase) return;
      const ids = new Set(this.filteredEditEvents().map((e) => e.id));
      bulkUpdateEvents(this.timeline.events, ids, 'phase', phase);
      this.notifyTimelineChanged();
      this.statusMessage = `Set phase on ${ids.size} event${ids.size === 1 ? '' : 's'}`;
      this.scheduleStatusClear(2000);
    },

    exportTimeline() {
      return this.timeline;
    },

    async exportDiffAs(format) {
      const diff = this.timelineDiff();
      if (!diff || (!diff.added.length && !diff.removed.length && !diff.changed.length)) {
        this.statusMessage = 'No baseline or no differences to export.';
        this.scheduleStatusClear(2500);
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
      this.scheduleStatusClear(2000);
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
    },

    async exportPreviewAs(type) {
      await this.exportAs(type);
    },

    async prepareExportPreflight(type) {
      const exportTimeline = this.exportTimeline();
      const wantsVisual = VISUAL_PREVIEW_TYPES.has(type);

      if (wantsVisual) {
        if (this.tab !== 'publish') {
          this.tab = 'publish';
          await this.$nextTick();
        }
        this.renderPreview();
        await delay(350);
      }

      const previewEl = wantsVisual ? document.getElementById('viz-preview') : null;
      const result = validateExport(exportTimeline, this.analysis, previewEl);

      if (wantsVisual && previewEl) {
        this.exportPreviewThumb = await createExportThumbnail(previewEl);
        this.exportPreviewText = null;
      } else {
        this.exportPreviewThumb = null;
        this.exportPreviewText = buildExportPreviewText(type, exportTimeline);
      }

      return result;
    },

    async exportAs(type) {
      if (type === 'link') {
        await this.openShareLink();
        return;
      }

      const result = await this.prepareExportPreflight(type);
      this.exportPreflight = result;
      this.pendingExportType = type;
      this.showExportPreflight = true;
    },

    async loadCompareTimeline(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        this.compareTimeline = JSON.parse(text);
        this.compareLabel = file.name;
        this.ensureEventIds(this.compareTimeline.events);
        if (!this.timeline.meta) this.timeline.meta = {};
        this.timeline.meta.showCompareOverlay = true;
        this.scheduleSave();
        this.flashStatus(`Baseline loaded from ${file.name} — ${this.diffSummaryText() || 'no differences yet'}.`);
        this.$nextTick(() => this.renderPreview());
      } catch (e) {
        this.flashStatus(`Could not load baseline file: ${e.message}`, 10000);
      }
      event.target.value = '';
    },

    clearCompareTimeline() {
      this.compareTimeline = null;
      this.compareLabel = '';
      this.scheduleSave();
      this.flashStatus('Baseline cleared.');
      this.renderPreview();
    },

    async confirmExport() {
      const type = this.pendingExportType;
      this.showExportPreflight = false;
      this.exportPreflight = null;
      this.pendingExportType = null;
      if (!type) return;
      try {
        await this.runExport(type);
      } catch (e) {
        this.statusMessage = e?.message || 'Export failed.';
        this.scheduleStatusClear(5000);
      }
    },

    cancelExport() {
      this.showExportPreflight = false;
      this.exportPreflight = null;
      this.exportPreviewThumb = null;
      this.exportPreviewText = null;
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
      return VISUAL_PREVIEW_TYPES.has(this.pendingExportType);
    },

    exportPreflightHasPreview() {
      return Boolean(this.exportPreviewThumb || this.exportPreviewText);
    },

    async runExport(type) {
      const visualTypes = ['png', 'pdf', 'pptx', 'svg', 'html', 'print'];
      if (visualTypes.includes(type) && this.tab !== 'publish') {
        this.tab = 'publish';
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
      else if (type === 'share-file') {
        await this.downloadShareFile();
      }
      else if (type === 'html') exportStandaloneHTML(exportTimeline, el?.innerHTML || '');
      else if (type === 'link') {
        await this.openShareLink();
        return;
      }
      this.exportPreviewThumb = null;
      this.exportPreviewText = null;
    },

    reportExportVerify(verify) {
      if (!verify?.items?.length) {
        this.statusMessage = 'Export completed — layout verified.';
      } else if (verify.ok) {
        this.statusMessage = `Export completed — ${verify.items[0]?.message || 'review recommended.'}`;
      } else {
        this.statusMessage = verify.items[0]?.message || 'Export may have quality issues.';
      }
      this.scheduleStatusClear(4000);
    },

    clearSavedDraft() {
      clearDraft();
      this.draftSavedAt = null;
      this.statusMessage = 'Draft cleared from browser storage.';
      this.scheduleStatusClear(2000);
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
        const reader = new FileReader();
        reader.onload = () => {
          this.inputText = reader.result;
          this.applyInputDetection(reader.result);
        };
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
