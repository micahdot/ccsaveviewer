# Cookies Save Viewer — offline copy

A read-only Cookie Clicker save viewer, built from the offline copy of the
Cookies Save Editor at <https://coderpatsy.bitbucket.io/cookies/editor.html>
(for game version 2.058), by **patsy**. Free to use per the project's license.

## What it does

- Import a Cookie Clicker save (paste the save string or pick a `.txt` file).
- Inspect everything in it: stats, buildings, upgrades, achievements, prestige,
  buffs, Santa/Krumblor, Pantheon, Grimoire, garden, stock market, mod data.
- **Nothing can be changed.** All save fields are read-only and every action
  that would modify the save is disabled.
- **No export.** The export box and export links are hidden.

## How to use

Double-click **`editor.html`** — no server or internet connection required.

## Contents

| Path | Description |
| --- | --- |
| `editor.html` | Main page (open this) |
| `editor.css` | Original stylesheet |
| `viewer.css` | Viewer-mode styling |
| `viewer.js` | Viewer-mode enforcement (read-only + click blocking) |
| `editor.js` | Original editor logic |
| `editor_start.js` | Game data / startup code |
| `editor_minigames.js` | Minigame rendering |
| `savelib.js` | Save encode/decode helpers |
| `fonts.css` | Local font declarations |
| `fonts/` | Merriweather 900 webfonts |
| `img/` | Sprites and UI images |
| `lib/` | jQuery 3.7.1, FileSaver 2.0.5, base64.js |
| `loc/EN.js` | English localization |

## Changes made

### Viewer mode (new)

1. Rebranded the page to **Cookies Save Viewer** (title, heading, description,
   and an on-page note).
2. `viewer.js` runs after the editor initializes and:
   - makes every save field read-only or disabled (except the import box),
   - blocks user clicks on controls that would modify the save
     (upgrade/achievement toggles, action links, garden plots, etc.),
   - re-applies the locks after an import or whenever the UI rebuilds.
3. `viewer.css` hides the entire export block and the now-irrelevant
   "Overwrite on export" checkbox, and dims inactive action links so they no
   longer look clickable.
4. Import is untouched: paste a save or load one from a file to view it.

### Offline fixes (from the original mirror)

1. Absolute script paths (`/lib/...`) were changed to relative paths (`lib/...`).
2. The Google Fonts stylesheet was replaced with a local `fonts.css` + bundled
   Merriweather woff2 files.
3. `img/you.png` and `img/youAddons.png` are embedded in `editor.html` as data
   URIs. Browsers refuse to read canvas pixels from local `file://` images
   ("tainted canvas"), which otherwise breaks the clone customizer when the page
   is opened directly from disk.

All other files are unmodified copies of the originals.

## Notes

- Import and viewing happen entirely in the browser; nothing is uploaded.
- The only remaining external links in the page are plain hyperlinks
  (Cookie Clicker, the author's site) and do not affect functionality.
- The entry file is still named `editor.html` so existing shortcuts keep
  working; rename it if you prefer.
