# TimelineForge — CHAIN OF EVENTS

**TimelineForge** is a browser-based Incident Response timeline editor and visualizer. It turns messy IR notes, report appendices, and tool exports into polished executive and SOC-ready visuals — inspired by [MetroViz](https://github.com/rstockm/Metroviz) but built for security incidents.

![TimelineForge logo](assets/timelineforge-logo.svg)

## Quick start

```bash
cd timelineforge
npm install && npm run vendor   # first time only — bundles offline deps into vendor/
python3 -m http.server 8080
# Open http://localhost:8080
```

No compile step for day-to-day use. Static files + ES modules + **vendored libraries** in `vendor/`.

After the first visit, the PWA service worker caches the app shell and vendor bundles for **offline use** (including PDF text extraction and English OCR).

## Build & release

```bash
npm run build       # writes deployable static site to dist/
npm run test:all    # unit + smoke + Playwright e2e
npm run release     # build + full test suite
```

`dist/` contains only what you need to host: HTML, CSS, JS, assets, data, and vendor bundles.

### Portable archive (macOS + Linux)

Build a zip/tar.gz your colleague can run **without Node.js**:

```bash
npm run package
# → release/timelineforge-1.0.0.zip
# → release/timelineforge-1.0.0.tar.gz
```

**On their machine** (Mac or Ubuntu):

```bash
tar -xzf timelineforge-1.0.0.tar.gz   # or unzip the .zip
cd timelineforge-1.0.0
chmod +x run.sh                       # first time only
./run.sh
# Open http://127.0.0.1:8080/
```

Share on a LAN (e.g. Ubuntu server):

```bash
BIND=0.0.0.0 PORT=8080 ./run.sh
# Colleagues open http://<server-ip>:8080/
```

Only **Python 3** is required on the target machine — no npm, no build step.

### Deploy to GitHub Pages (online URL)

See **[DEPLOY.md](DEPLOY.md)** for the full checklist: create repo, push to `main`, enable Pages → GitHub Actions. The live URL will be:

`https://<your-github-user>.github.io/timelineforge/`

Workflows in `.github/workflows/` build `dist/` and deploy automatically on push.

## Tabs

| Tab | Purpose |
|-----|---------|
| **INPUT** | Manual snippets, markdown tables, IR tool CSV/JSON, Word/PDF reports |
| **EDIT** | Event table, filters, bulk edit, undo/redo, diff vs baseline, quality analysis |
| **DESIGN** | Visualization type + style, export preview (PNG/PDF/SVG), phases, live preview |
| **OUTPUT** | All export formats — report pack, executive PDF, STIX, share link, and more |

## File menu

| Item | Action |
|------|--------|
| **New timeline…** | Clear workspace (⌘N) |
| **Open…** | Load timeline JSON (⌘O) |
| **Samples ›** | APT breach, ransomware, BEC, insider, supply chain, cloud breach |
| **Save JSON…** | Export timeline file (⌘⇧S) |
| **Save draft** | Browser draft (⌘S) |
| **About TimelineForge…** | Version, description, contact |

## Sample timelines

Load **File → Samples** to explore starter incidents. Each sample maps to a DESIGN visualization style:

| Sample | DESIGN visualization | Best for |
|--------|------------------------|----------|
| **APT breach** | Executive summary | Full 35-event investigation walkthrough |
| **Ransomware / BEC / etc.** | Varies | Focused scenario starters |
| **Activity overview** | Density chart | At-a-glance before deep dives |
| **SOC event cards** | Card timeline | Analyst deep-dive with host, user, MITRE |
| **Executive summary** | Phase chevrons | Leadership briefing |
| **Phase swimlanes / columns** | Kill-chain views | Program or narrative overview |
| **Appendix timeline** | Chart + table | Report appendix export |

## Input sources

- Manual snippets, markdown tables, IR tool exports
- **PDF / DOCX** — client-side extraction; **OCR** for scanned PDFs (Tesseract.js)
- **IR tool import** — 22 supported formats (see table below)
- Clipboard paste on INPUT tab (when not in a text field)

## IR tool import

| Tool | Format |
|------|--------|
| Generic CSV / JSON | Custom columns |
| TheHive | Case JSON |
| MISP | Event export |
| Elastic Security / OpenSearch | Timeline / alerts JSON |
| Splunk | Notable events CSV |
| Microsoft Sentinel | Incident / alert JSON |
| Google SecOps Chronicle | UDM JSON |
| Velociraptor | Collection JSON |
| Autopsy / Plaso | Super timeline TSV/CSV |
| KAPE | Timeline CSV |
| Hayabusa | CSV export |
| Timesketch | Sketch export JSON |
| Magnet AXIOM / X-Ways | CSV (Plaso-style) |
| CyberChef | JSON array / table / CSV |
| CrowdStrike Falcon | Detection JSON |
| Microsoft Defender XDR | Alert JSON |
| IBM QRadar | Offense / event JSON |
| Wazuh | Alert JSON |
| LogRhythm | Case JSON |

## Exports

| Format | Description |
|--------|-------------|
| **Executive one-pager (PDF)** | Portrait single-page executive summary |
| **Report pack (ZIP)** | Executive PDF, appendix PDF, Word, Markdown, JSON, STIX |
| PPTX | PowerPoint with title, phases, events, viz snapshot |
| Appendix PDF / PNG / PPTX | Doc-width chart + event table |
| PDF / PNG / SVG | Visual snapshot of current DESIGN preview |
| Word (.doc) | Appendix snapshot + full event table |
| HTML | Standalone offline page |
| Markdown / CSV | Table data (respects filter option) |
| iCalendar (.ics) | Calendar import |
| JSON / Share link | Full or filtered timeline |
| STIX 2.1 | Bundle with report + observed-data per event |
| Diff Markdown / CSV | Changelog vs baseline |

Use **Export filtered events only** on OUTPUT to apply active EDIT filters.

## Features

- **Timeline panel** — title, activity window, scope, attack mix
- **Timezone** — UTC or common regional zones (panel, EDIT, exports)
- **Auto-enrich** — MITRE techniques and phases inferred on parse
- **EDIT filters** — host, user, category, tag, search; bulk edit; undo/redo
- **Timeline diff** — baseline compare, diff export
- **Quality panel** — issues and recommendations with jump-to-event
- **Anonymization** — scrub hosts, users, IPs, emails, domains
- **Dark mode** — app chrome and form fields
- **Offline PWA** — installable; caches after first visit
- **Plugin API** — custom visualization renderers in `data/plugins/`

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘/Ctrl + 1–4 | Switch tabs |
| ⌘/Ctrl + N | New timeline |
| ⌘/Ctrl + O | Open timeline JSON |
| ⌘/Ctrl + S | Save draft |
| ⌘/Ctrl + ⇧S | Save timeline to file |
| `j` / `k` or ↑ / ↓ | EDIT focus events |
| ⌘/Ctrl + Z / ⇧Z | Undo / redo |
| ⌘/Ctrl + P | Print (DESIGN tab) |
| ? | Help |

## Tests

```bash
npm test          # unit + smoke
npm run test:e2e  # Playwright — tabs, EDIT, DESIGN preview, exports UI
npm run test:all
```

## Data schema

```json
{
  "meta": {
    "title": "",
    "timezone": "UTC",
    "theme": "light",
    "accentColor": "#EE3124",
    "applyEditFiltersToExport": false,
    "version": 1
  },
  "events": [{
    "id": "evt-001",
    "timestampStart": "2024-10-03T10:19:53Z",
    "timestampEnd": null,
    "hostname": "HOST-001",
    "username": "DOMAIN\\USER-001",
    "details": "...",
    "source": "EDR alert",
    "evidence": "Ticket INC-4421",
    "category": "initial-access",
    "phase": 1,
    "technique": "T1566",
    "linkedEventIds": ["evt-002"],
    "tags": []
  }]
}
```

## Contact

David Malcher — [dmalcher@fortinet.com](mailto:dmalcher@fortinet.com)

## License

MIT — see [LICENSE](LICENSE).

Release history: [CHANGELOG.md](CHANGELOG.md)
