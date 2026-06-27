# Deploy TimelineForge to GitHub Pages

This guide gets you from a local folder to a **live web URL** (e.g. `https://<user>.github.io/timelineforge/`).

TimelineForge is static — no server-side code. GitHub hosts the built `dist/` folder. Incident data stays in the browser; nothing is uploaded to GitHub except the app files.

---

## What you need

| Item | Notes |
|------|--------|
| **GitHub account** | Free tier is enough |
| **Git** | `git --version` on your Mac |
| **Node.js 20+** | Only on your machine for building; not needed by visitors |
| **Repo name** | e.g. `timelineforge` — affects the URL path |

---

## What's already in this project

- `.github/workflows/pages.yml` — builds and deploys on push to `main`
- `.github/workflows/test.yml` — runs tests on push / PR
- `npm run build` — output in `dist/` (what Pages serves)
- Relative asset paths — works at `https://user.github.io/<repo>/` (not only at domain root)

---

## Step 1 — Create the GitHub repository

1. Go to [github.com/new](https://github.com/new)
2. Repository name: **`timelineforge`** (or your choice)
3. **Public** — simplest for Pages (free, shareable URL)
   - Private repos also support Pages on free accounts, but the URL is still reachable by anyone who has the link unless you add auth separately
4. Do **not** add README, .gitignore, or license (you already have them locally)
5. Create repository

Copy the repo URL, e.g. `git@github.com:YOURUSER/timelineforge.git`

---

## Step 2 — Initialize git locally (first time only)

From the project folder on your Mac:

```bash
cd timelineforge

git init
git branch -M main
git add .
git status   # review — should NOT include node_modules/, dist/, release/
git commit -m "TimelineForge 1.0.0 — initial release"
```

### What gets committed

| Included | Excluded (.gitignore) |
|----------|------------------------|
| Source (`js/`, `index.html`, `css/`, …) | `node_modules/` |
| `data/`, `assets/`, tests | `vendor/` (run `npm run vendor`) |
| `package.json`, `package-lock.json` | `dist/`, `release/` |

**`vendor/` is not committed.** After clone, CI and local dev run `npm run vendor` to download/bundle browser libraries (Alpine, D3, PDF.js, Tesseract, etc.) into `vendor/`. The running app and offline PWA still need that folder — it is just a build artifact, like `dist/`.

---

## Step 3 — Push to GitHub

```bash
git remote add origin git@github.com:YOURUSER/timelineforge.git
git push -u origin main
```

Use HTTPS if you prefer: `https://github.com/YOURUSER/timelineforge.git`

---

## Step 4 — Enable GitHub Pages

1. Open the repo on GitHub → **Settings** → **Pages**
2. Under **Build and deployment** → **Source**, choose **GitHub Actions**
3. Save (no branch dropdown needed when using Actions)

---

## Step 5 — Wait for the deploy workflow

1. Go to **Actions** tab
2. Open **Deploy GitHub Pages** — should run after the push
3. When green, your site is live at:

   **`https://YOURUSER.github.io/timelineforge/`**

   (Replace `YOURUSER` and repo name if different.)

Future pushes to `main` automatically redeploy.

---

## Step 6 — Verify the live site

- [ ] Page loads without “failed to start”
- [ ] **File → Samples → APT breach** loads events
- [ ] **Deliver** preview renders (layout gallery + live preview)
- [ ] **Deliver → Report pack** triggers a download
- [ ] Hard refresh after deploy if you see an old version (service worker cache)

---

## Updating the live site later

```bash
# make changes locally, test:
npm run test:all

git add -A
git commit -m "Describe your change"
git push
```

Pages redeploys in ~1–2 minutes.

---

## Security & privacy notes

- **Timeline JSON you edit in the app is never sent to GitHub** — it stays in the browser / local storage
- Only **you** choose what to commit; never commit real incident exports unless intentional
- The **public URL** means anyone with the link can use the app (not your data)
- For air-gapped teams, keep using **`npm run package`** and the local archive instead

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Pages workflow fails on `npm run vendor` | Check Actions log; network or CDN blocked — re-run workflow |
| Blank page | Open browser devtools → Console; hard refresh; check URL ends with `/` |
| 404 on assets | Ensure deploy uses `dist/` (workflow already configured) |
| Old version after deploy | Clear site data or unregister service worker in devtools |
| Tests fail on push | Fix locally with `npm run test:all`; or fix on branch before merging to `main` |

---

## Optional: custom domain

1. **Settings → Pages → Custom domain** — e.g. `timelineforge.yourcompany.com`
2. Add DNS CNAME to `YOURUSER.github.io`
3. Enable HTTPS when GitHub provisions the certificate

---

## Optional: tag releases

```bash
git tag v1.0.0
git push origin v1.0.0
```

The Pages workflow also runs on `v*` tags.

---

## Local vs GitHub — when to use which

| | Local archive | GitHub Pages |
|--|---------------|--------------|
| Command | `npm run package` | push to `main` |
| Audience | Offline / LAN / USB | Anyone with URL |
| Node on user machine | No | No |
| You control updates | Send new zip | `git push` |

Both can run in parallel.
