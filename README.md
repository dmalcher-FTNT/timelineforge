# TimelineForge

**Browser-based IR timeline editor** — turn notes, SIEM exports, and report appendices into executive and SOC-ready visuals.

<p align="center">
  <a href="https://dmalcher-ftnt.github.io/timelineforge/"><strong>Live demo →</strong></a>
</p>

<p align="center">
  <img src="docs/screenshots/design-preview.png" alt="Collect · Refine · Deliver workspace switcher with Deliver preview — Leadership board layout and export list" width="920">
</p>

<p align="center">
  <img src="docs/screenshots/edit-workspace.png" alt="Refine workspace — event table, filters, observables, and data quality sidebar" width="448">
  &nbsp;
  <img src="docs/screenshots/output-exports.png" alt="Deliver export list with preview-before-download for every format" width="448">
</p>

<p align="center">
  <sub>Collect · Refine · Deliver — APT breach sample (v1.3.5)</sub>
</p>

## What it does

Three workspaces in the browser — **Collect → Refine → Deliver**. No backend, no account; incident data stays local.

The **step switcher** under the header keeps mode obvious: import evidence, clean the timeline, then pick a layout and export. Header **Tools** and **Export** menus group IR actions and deliverables with inline hints.

### Collect — get data in

- **Manual snippets**, markdown tables, JSON, and **23 IR tool parsers** (Splunk, Sentinel, KAPE, Hayabusa, EvtxECmd, CrowdStrike, Defender, Elastic, MISP, …)
- **PDF / DOCX** upload with optional OCR for scanned reports
- **Import timeline** button with post-import CTAs to Refine and Deliver
- **Clear-source confirmation** so wiping Collect does not silently delete events

### Refine — refine and analyze

- Host, user, category, tag, and **MITRE technique** filter chips
- **Observables sidebar** (IPs, domains, hashes, URLs) — click to filter events
- Simple and expert table views, undo/redo, merge duplicates, link sequential events
- **Data quality** recommendations and **baseline compare** (load snapshot, diff in table and preview)
- **Tools menu:** data quality report, merge/link helpers, baseline snapshot, anonymize

### Deliver — brief any audience

- **17 IR-oriented layouts** with audience filters: swimlanes, MITRE coverage heatmap, containment lanes, leadership board, report appendix, investigator log, host lanes, evidence table, milestone storyboard, case-file variants, and more
- Live preview with smart layout suggestion from event count
- **Unified export list** — every format shows a **preview before download** (thumbnail for visuals, summary for data/report exports)
- **Fit-to-page exports** — PDF/PNG/PPTX scale to the canvas (landscape/portrait, no horizontal clip on wide swimlanes)
- **Deliver panel:** PNG, PDF, PowerPoint, SVG, print
- **Export menu:** quick exports from current layout, executive PDF, appendix pages, report pack (ZIP), Word, CSV, JSON, STIX 2.1, iCal, shareable link, offline HTML

### Platform

- **Unified layout frame** — header chrome full width; workspace nav, timeline overview, and panels share one aligned column
- **Collapsible timeline overview** — hide activity window / scope stats when you need vertical space
- **First-run welcome** — start blank or load APT breach sample
- **Dismissible demo banner** on sample timelines
- **Persistent status toasts** (dismissible, 8s minimum)
- **PWA / offline** after first visit; drafts in browser storage
- **Keyboard:** ⌘/Ctrl+1 Collect · ⌘/Ctrl+2 Refine · ⌘/Ctrl+3 Deliver

Inspired by [MetroViz](https://github.com/rstockm/Metroviz), built for security incidents.

## Quick start

```bash
git clone https://github.com/dmalcher-FTNT/timelineforge.git
cd timelineforge
npm install && npm run vendor   # first time — builds vendor/ (~30 MB, not in git)
python3 -m http.server 8080
```

Open **http://localhost:8080**, then try **File → Samples** (APT breach, ransomware, BEC, insider threat, and more).

```bash
npm test              # unit + smoke (187 tests)
npm run test:e2e      # Playwright UI + export verification (48 tests)
npm run test:all      # both suites
npm run build         # deployable site → dist/
npm run release       # build + full test suite
npm run screenshots   # refresh docs/screenshots/ for README
```

Export regression tests load **Supply chain**, **Insider threat**, and **Cloud breach** samples, export PNG/PDF/Word, and verify file structure plus non-blank chart content (`tests/e2e/export-formats.spec.js`).

Deploy: **[DEPLOY.md](DEPLOY.md)** · Releases: **[CHANGELOG.md](CHANGELOG.md)**

## Contact

David Malcher — [dmalcher@fortinet.com](mailto:dmalcher@fortinet.com)

MIT — [LICENSE](LICENSE)
