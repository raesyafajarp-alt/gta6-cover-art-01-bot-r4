# Vice Coast — GTA-style Cover Maker

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/raesyafajarp-alt/gta6-cover-art-01-bot-r4/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/raesyafajarp-alt/gta6-cover-art-01-bot-r4/reward.svg)](https://make.fun/c/gta6-cover-art-01)

Turn your photo and a caption into GTA-style multi-panel cover art — the
poster look with bold lettering and a Vice City sunset or neon colour grade —
and export it as a PNG to share. Fully offline, free, no account, no upload:
photos never leave your machine.

## What it does

- **Any photo** — upload one or several photos, or try the two bundled
  samples. Click a panel on the cover to select it, then drag it or use the
  crop sliders to zoom and pan it. One photo can fill every panel, or each
  panel can hold a different photo.
- **4 layouts** — Poster (one hero panel + three side panels), Grid 9,
  Hero (one photo, full bleed), Snapshots (tilted photo cards over a
  painted sunset).
- **6 colour grades** — Vice Sunset, Neon Nights, Golden Hour, Teal Noir,
  Cotton Candy, Midnight Drive. Each one repaints the sky, the striped
  retro sun, the title shadow and the badge ribbon, and washes a matching
  tint over the photo panels.
- **Bold lettering** — Anton title with a thick outline and offset accent
  shadow, Pacifico script subtitle, and a badge ribbon, all drawn on the
  canvas. An optional poster frame rounds the cover off.
- **Original painted backdrop** — the sunset sky, striped sun, two-layer
  skyline and palm silhouettes are vector art drawn in code, plus film
  grain and a vignette.
- **3 export sizes** — real PNGs at exactly 1080×1080, 1080×1350 and
  1920×1080, one click.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

Pick a sample photo (or upload your own), choose a layout and a grade,
type your title, hit **Export PNG**. That is the whole flow — photo to
poster in under a minute.

## How it is built

- `app/index.html` — the editor page.
- `app/style.css` — the dark neon editor chrome.
- `app/src/cover.js` — the rendering engine: grades, layouts, painted
  sky/sun/skyline/palms, panels, grain, vignette, title, badge and frame.
- `app/src/main.js` — state, controls, uploads, drag-to-pan, live preview,
  PNG export.
- `app/src/shots.js` — fixed scenes for screenshots (`?shot=`).
- `app/fonts/` — Anton and Pacifico under the SIL Open Font License.
- `app/samples/` — two sample photos made with an image model.
- `main.ts` — the make.fun program/v1 entrypoint: copies `app/` and
  `screenshots/` to `/output` and writes `dossier.json`.
- `vendor/makefun-app.ts` — the kit's dossier library, unchanged.

Everything is static files under `app/` with no build step and no network
request at runtime. No Rockstar Games logo, wordmark, artwork, character
or font is used anywhere.

## License

MIT — see [LICENSE](LICENSE).
