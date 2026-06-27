# Changelog

## 1.3.5 — 2026-06-27

- **Collect · Refine · Deliver** — workspace renamed from INPUT / EDIT / PUBLISH; segmented step switcher with subtitles above timeline preview
- **Unified layout frame** — header and workspace panels share one 1400px content column (`app-shell`); fixes width mismatch between overview and panels
- **Collapsible incident overview** — Hide / Show overview toggle; preference saved locally
- **Tools menu refresh** — grouped Refine timeline, Baseline compare, and Privacy sections with action hints; removed duplicate share/print entries (Share button + Deliver exports remain)
- **Export menu refresh** — rich items with hints, Current layout quick exports when events loaded, accent styling on Export trigger, footer link to Deliver workspace

## 1.3.4 — 2026-06-27

- **Export reliability** — fixed blank PDF/PNG on small templates (Supply chain, case-file layouts); capture no longer forces preview height during html2canvas clone; PDF export fails fast when content verify fails
- **Fit-to-page exports** — PDF/PPTX scale to canvas with landscape/portrait pick; full-width capture for scrollable swimlanes
- **Unified PUBLISH exports** — consistent export list with preview-before-download for every format (thumbnail or text summary)
- **Export regression tests** — e2e verifies PNG/PDF/Word from Supply chain, Insider threat, and Cloud breach samples (structure + non-blank chart content)
- **Undo fix** — edit changes register for undo/redo immediately; toolbar buttons update when history is available
- **Share modal Copy link** — explicit copy button when the timeline fits in a shareable URL
- **Incident title placeholder** — header title field placeholder renamed from “Export title”
- **PUBLISH empty state** — when no events are loaded, shows Load sample and Go to INPUT CTAs
- **README** — expanded feature list and refreshed screenshots

## 1.3.2 — 2026-06-26

- **First-run welcome** — choose blank timeline or APT breach sample on first visit (no auto-load surprise)
- **Demo banner** — dismissible notice when a sample timeline is loaded
- **Import timeline button** — explicit parse control with post-import CTAs to EDIT and PUBLISH
- **Clear source confirmation** — emptying INPUT no longer silently deletes imported events
- **Data vs layout quality labels** — distinct naming for timeline data quality and layout preview quality
- **APT sample IOCs** — example timeline includes IPs, domains, URLs, and hashes for observables demo
- **Swimlane preview scroll** — long timelines use a wider chart with horizontal scroll instead of squeezing event cards
- **Removed layout quality bar** — dropped the non-working preview score / Check layout strip from PUBLISH (export preflight still checks layout when needed)
- **Slimmer PUBLISH deliver panel** — preview exports only; report templates, data formats, and share moved to header Export menu
- **Removed export filter toggle** — exports always include the full timeline (EDIT filters remain for review only)
- **Persistent status toasts** — global dismissible notifications (8s minimum) replace vanishing tab-local messages
- **MITRE technique filter** — filter chips in EDIT sidebar; parent IDs include sub-techniques
- **Quality badge behavior** — header badge opens the report modal without switching tabs
- **Keyboard shortcuts** — removed duplicate ⌘/Ctrl+4 entry
- **MITRE coverage layout** — technique × phase heatmap in PUBLISH gallery
- **Containment lanes layout** — attacker vs defender response swimlanes
- **Baseline compare in EDIT** — consolidated sidebar section with hint, Load file / Snapshot current, and inline diff when active (also in Tools menu)

## 1.3.0 — 2026-06-26

- **PUBLISH tab** — merges DESIGN preview and OUTPUT exports: layout gallery, live preview, layout quality check, and tiered deliver panel in one place
- **Audience-first layout gallery** — 15 IR-oriented layouts with filters, case-file variants, and new Host lanes, Evidence table, and Milestone storyboard views
- **User settings cookie** — theme, timezone, and accent persist when loading samples or opening files
- **Activity window** — dwell time uses full words (e.g. `23 hours` instead of `23 hrs`)
- **Smart layout on load** — samples and new timelines without a saved layout pick a suggested gallery layout from event count
- **Observables → filter** — click an IP, domain, hash, or URL in EDIT to filter matching events

## 1.2.0 — 2026-06-26

- **DESIGN picker** — Format (Timeline / Cards / Executive), Direction (horizontal / vertical), and Layout variant chips replace the old visualization/style dropdowns
- **Event stack** — new vertical single-column timeline layout for long event lists
- **Observable extraction** — hosts, users, IPs, and domains surfaced in EDIT sidebar
- **Auto-detect on paste** — INPUT recognizes common IR formats when pasting source data
- **Timeline preview** — activity window with full-height lane markers; preview label and layout tweaks
- **Layout audit** — no longer flags intentional line-clamp/ellipsis in executive summary
- **Baseline compare** — removed from DESIGN tab; load baseline from EDIT sidebar; overlay badges on previews unchanged

## 1.1.0 — 2026-06-26

- **EvtxECmd CSV parser** — Eric Zimmerman EZ Tools export
- **Tools → Merge duplicate events** — collapse duplicate rows in EDIT (timestamp, host, user, details)
- **Vendor cleanup** — `vendor/` removed from git; generated by `npm run vendor` (CI builds on deploy)
- **README** — shorter GitHub landing page with cropped screenshots

## 1.0.0 — 2026-06-26

First stable release.

- **INPUT → EDIT → DESIGN → OUTPUT** workflow for IR timelines
- **File → Samples** — APT breach, ransomware, BEC, insider, supply chain, cloud breach
- **File → About** — app info and contact
- **Exports** — PDF, PNG, SVG, PPTX, Word, HTML, Markdown, CSV, iCal, JSON, STIX 2.1
- **Executive one-pager (PDF)** — portrait single-page leadership summary
- **Report pack (ZIP)** — executive PDF, appendix PDF, Word, Markdown, JSON, STIX
- **22 IR import formats** — Splunk, Sentinel, Velociraptor, KAPE, Hayabusa, CrowdStrike, Defender, and more
- **Offline PWA** — installable; caches app shell after first visit
- **Dark mode**, anonymization, timeline diff, quality analysis, plugin API

## 0.53.0 — 2026-06-26

- Executive one-pager PDF export
- Report pack extended with JSON and STIX
- KAPE and Hayabusa CSV parsers
- STIX in header Export menu

## 0.52.0 — 2026-06-26

- Report pack ZIP (appendix PDF, Word, Markdown)
- Appendix slide (PPTX)

## Earlier versions

See git history for releases 0.51.0 and below (appendix exports, INPUT redesign, SIEM parsers, share links, PWA, and visualization types).
