# TimelineForge

**Browser-based IR timeline editor** — turn notes, SIEM exports, and report appendices into executive and SOC-ready visuals.

<p align="center">
  <a href="https://dmalcher-ftnt.github.io/timelineforge/"><strong>Live demo →</strong></a>
</p>

<p align="center">
  <img src="docs/screenshots/design-preview.png" alt="Executive summary visualization with activity window and attack mix" width="920">
</p>

<p align="center">
  <img src="docs/screenshots/edit-workspace.png" alt="Edit timeline with filters and quality recommendations" width="448">
  &nbsp;
  <img src="docs/screenshots/output-exports.png" alt="Export and publish options" width="448">
</p>

<p align="center">
  <sub>DESIGN · EDIT · OUTPUT — APT breach sample timeline</sub>
</p>

## What it does

**INPUT → EDIT → DESIGN → OUTPUT** in the browser. No backend, no account — incident data stays local.

- **Import** manual snippets, markdown tables, PDF/DOCX, and **23 IR tools** (Splunk, Sentinel, KAPE, Hayabusa, EvtxECmd, CrowdStrike, Defender, Elastic, MISP, …)
- **Edit** with filters, bulk updates, merge duplicates, quality checks, and baseline diff
- **Design** executive summaries, SOC cards, phase swimlanes, appendix layouts, and more
- **Export** executive PDF, report pack (ZIP), PPTX, Word, STIX 2.1, share links, and offline HTML

Works **offline** after the first visit (installable PWA). Inspired by [MetroViz](https://github.com/rstockm/Metroviz), built for security incidents.

## Quick start

```bash
git clone https://github.com/dmalcher-FTNT/timelineforge.git
cd timelineforge
npm install && npm run vendor   # first time — builds vendor/ (~30 MB, not in git)
python3 -m http.server 8080
```

Open **http://localhost:8080**, then try **File → Samples** (APT breach, ransomware, BEC, and more).

```bash
npm test              # unit + smoke
npm run test:e2e      # Playwright UI tests
npm run build         # deployable site → dist/
npm run release       # build + full test suite
npm run screenshots   # refresh docs/screenshots/ for README
```

Deploy: **[DEPLOY.md](DEPLOY.md)** · Releases: **[CHANGELOG.md](CHANGELOG.md)**

## Contact

David Malcher — [dmalcher@fortinet.com](mailto:dmalcher@fortinet.com)

MIT — [LICENSE](LICENSE)
