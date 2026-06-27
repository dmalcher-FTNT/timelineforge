# TimelineForge

**Browser-based IR timeline editor** — turn notes, SIEM exports, and report appendices into executive and SOC-ready visuals.

<p align="center">
  <a href="https://dmalcher-ftnt.github.io/timelineforge/"><strong>Live demo →</strong></a>
</p>

<p align="center">
  <img src="docs/screenshots/design-preview.png" alt="PUBLISH tab — layout gallery, live preview, and unified export list" width="920">
</p>

<p align="center">
  <img src="docs/screenshots/edit-workspace.png" alt="EDIT tab — filters, observables, data quality, and baseline compare" width="448">
  &nbsp;
  <img src="docs/screenshots/output-exports.png" alt="PUBLISH deliver panel — export list with preview-before-download" width="448">
</p>

<p align="center">
  <sub>PUBLISH · EDIT — APT breach sample timeline (v1.3.4)</sub>
</p>

## What it does

**INPUT → EDIT → PUBLISH** in the browser. No backend, no account — incident data stays local.

### INPUT — get data in

- **Manual snippets**, markdown tables, JSON, and **23 IR tool parsers** (Splunk, Sentinel, KAPE, Hayabusa, EvtxECmd, CrowdStrike, Defender, Elastic, MISP, …)
- **PDF / DOCX** upload with optional OCR for scanned reports
- **Explicit Import timeline** button with post-import CTAs to EDIT and PUBLISH
- **Clear-source confirmation** so wiping INPUT does not silently delete events

### EDIT — refine and analyze

- Host, user, category, tag, and **MITRE technique** filter chips
- **Observables sidebar** (IPs, domains, hashes, URLs) — click to filter events
- Simple and expert table views, undo/redo, merge duplicates, link sequential events
- **Data quality** recommendations and **baseline compare** (load snapshot, diff in table and preview)
- Anonymize, custom attack phases, bulk updates

### PUBLISH — brief any audience

- **17 IR-oriented layouts** with audience filters: swimlanes, MITRE coverage heatmap, containment lanes, leadership board, report appendix, investigator log, host lanes, evidence table, milestone storyboard, case-file variants, and more
- Live preview with smart layout suggestion from event count
- **Unified export list** — every format shows a **preview before download** (thumbnail for visuals, summary for data/report exports)
- **Fit-to-page exports** — PDF/PNG/PPTX scale to the canvas (landscape/portrait, no horizontal clip on wide swimlanes)
- **Deliver:** PNG, PDF, PowerPoint, SVG, print · **Header Export menu:** executive PDF, appendix pages, report pack (ZIP), Word, CSV, JSON, STIX 2.1, iCal, shareable link, offline HTML

### Platform

- **First-run welcome** — start blank or load APT breach sample
- **Dismissible demo banner** on sample timelines
- **Persistent status toasts** (dismissible, 8s minimum)
- **PWA / offline** after first visit; drafts in browser storage
- Theme, timezone, and accent persist via cookie when loading samples or files

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
npm test              # unit + smoke (185 tests)
npm run test:e2e      # Playwright UI + export verification (46 tests)
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
