# TV Radar

Personal TV tracking app: what's coming up, what to watch tonight, and four lists (Must See, Interested, Maybe, Pass). This is the v10 app from Claude, moved to GitHub Pages.

## How it works

- **The app** is the v10 source in `src/`, unchanged. `src/store-github.js` stands in for the Claude artifact database, so the app saves to this repo instead.
- **Your data** lives in two files:
  - `data/tv-radar.json` holds all shows, in TV Radar's own export format. You can also restore it from Data & backup.
  - `data/inbox.json` holds settings (moods, baseline, last check) and the Changes inbox.
- **Saving.** Every edit becomes a commit, batched for 1.5 seconds. Git history is your version history.
- **Publishing.** Every push to `main` rebuilds and republishes the site. It takes about a minute.
- **Phone and laptop.** Each device saves to the same repo. When you come back to the app, it picks up edits made on the other device. If both save at once, it reloads and reapplies your edit, so neither is lost.

## Setup

1. **Create the repo.** On GitHub, create a repository named `tv-radar`. Upload this folder's contents, or run:
   ```sh
   cd "path/to/tv-radar"
   git init && git add . && git commit -m "TV Radar v10 on GitHub Pages"
   git branch -M main
   git remote add origin https://github.com/YOUR-ACCOUNT/tv-radar.git
   git push -u origin main
   ```
2. **Turn on Pages.** Go to **Settings > Pages > Build and deployment** and set Source to **GitHub Actions**. The first deploy runs on its own after the push. Watch it under the **Actions** tab.
3. **Create a token.** Go to **GitHub > Settings > Developer settings > Fine-grained tokens > Generate new token**.
   - Repository access: **Only select repositories**, then pick `tv-radar`.
   - Permissions: **Contents: Read and write**. Leave everything else off.
   - Expiration: your call. When it expires, the app shows "GitHub rejected the token" and stops saving until you paste a new one.
4. **Connect each device.** Open `https://YOUR-ACCOUNT.github.io/tv-radar/?setup`. Account and repository fill in on their own, so paste the token and tap **Test and save**. Do this once on your laptop and once on your phone.
5. **Test it.** Add a clearly labeled test show on one device. Open the app on the other device, check that the show is there, then delete it.

Without a token, the app still opens and shows everything. It just can't save, and a banner offers **Connect GitHub**.

## Privacy

A GitHub Pages site is public, even when the repository is private (private repos need GitHub Pro). Anyone with the address can read your lists and notes. Search engines are asked not to index the site, but treat it as public. Your token is stored only in each browser. It is never in the repo, and it isn't included in backups.

## Working on the code

- `sh build.sh` builds `_site/index.html` and copies the data files. The page loads the storage script first, then the app in the v10 order: core, views, detail, actions, main.
- `sh test/run.sh` builds the site, then runs 22 checks against a fake GitHub API. You need Python 3 and Playwright (`pip install playwright && playwright install chromium`). The checks cover:
  - loading every show
  - no writes when the app opens
  - one commit per edit, with only that show changed
  - Undo
  - a second device
  - a save conflict
  - a failed save
  - read-only mode
  - the daily check
  - Download backup
- `src/store-github.js` is the only file that knows about GitHub. To change storage later, change it and nothing else.

## Known limits

- **The daily check makes a few small commits** to `inbox.json` on the first open each day. That's normal.
- **Every commit republishes the site.** The app reads from the GitHub API directly when connected, so you won't see stale data during the minute it takes.
- **The Data & backup screen still describes the old storage.** It says "Saved to this TV Radar page's own database". That copy lives in the unchanged v10 source. The behavior is right: saved, and the same on every device.
- **Carried over from v10, still open:**
  - the 184 proposed descriptions, not yet reviewed
  - the possible Youth duplicate (SHOW_227 and SHOW_288)
  - rotating the old TMDB key, which is not in this repo

## Data provenance

- **`data/tv-radar.json`** was exported on October 22, 2026, by the app's own Download backup function, from the live database. It has 476 shows, SHOW_001 to SHOW_476. Every show was still at version 1, so it matches the October 3 checkpoint, which was restore-tested with 0 differences. It also carries a copy of the inbox. The app reads the inbox from `inbox.json` instead.
- **`data/inbox.json`** was exported from the live database on October 22, 2026: the config plus 18 inbox items. This is the copy the app uses.
- **List counts at migration:** Must See 41, Interested 70, Maybe 98, Pass 267.
