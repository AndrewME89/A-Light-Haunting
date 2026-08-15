# Haunted Raven Portrait

A full-screen "living portrait" web app: a Gothic cemetery scene with a raven
that mostly just sits there — and, rarely, blinks, ruffles, or turns its
head. Built as plain HTML/CSS/JS for continuous operation on a Fire TV Stick
(or any browser).

The guiding rule: **stillness is the default.** If the raven's movement is
ever obvious enough to look like "the animation is playing again," it's
tuned too aggressively — see `config.js`.

## Status: Version 1 (Living Portrait)

Implemented now:
- Full-screen 16:9 layered scene, no visible browser chrome/cursor/UI
- Raven blink / feather-ruffle / head-turn with independently randomized
  timing (never a fixed interval — see `blinkMinSeconds`/`blinkMaxSeconds` etc.)
- Weather **visual layers** (rain, fog, clouds, night, lightning) — present
  and drivable, but only forced manually via debug keys in v1
- Portrait state machine (`ACTIVE`/`IDLE`/`SLEEP`/`AWAY`) with an event hook
  for future external control
- Burn-in protection (imperceptible slow scene drift)
- Debug/calibration mode

Architected but dormant until configured (see below): `weather.js` (Open-Meteo,
Version 2) and `audio.js` (raven sample playback, Version 3). Both no-op
safely when unconfigured, so turning them on later needs no code changes.

## Quick start (local testing)

No build step, no server framework required.

1. Open `config.js` and confirm `debug: true` while you're testing.
2. Serve the folder over HTTP (opening `index.html` directly via `file://`
   works in most browsers, but a local server avoids CORS/autoplay quirks):
   ```
   npx serve .
   # or: python -m http.server 8080
   ```
3. Open it in a browser. You should see the cemetery scene fill the screen.
4. With `debug: true`, a small panel appears bottom-left. Keyboard shortcuts:

   | Key | Effect |
   |---|---|
   | `b` | trigger a blink |
   | `r` | trigger a feather ruffle |
   | `h` | trigger a head turn |
   | `l` | trigger one lightning flash |
   | `1` | toggle rain |
   | `2` | toggle fog |
   | `3` | toggle night tint |
   | `4` | toggle full storm mode (rain + overcast + night + recurring lightning) |
   | `0` | reset all weather visuals |
   | `a` / `i` / `s` / `w` | set portrait state to ACTIVE / IDLE / SLEEP / AWAY |
   | `c` | toggle calibration click-mode (see below) |
   | `d` | hide/show the debug panel |

5. When you're happy, set `debug: false` in `config.js` before deploying —
   the panel and all keyboard shortcuts disappear entirely.

## Calibrating the raven region

Version 1 ships with **one painted hero image** (`assets/backgrounds/hero.jpg`,
cemetery + raven combined) rather than pre-cut raven sprites. The app fakes
independent raven movement by clipping a polygon around the raven out of
that same image and nudging just that clipped region — since it's pixel-
identical to the background beneath it at rest, there's no visible seam.

To fit this to your actual artwork:

1. Set `debug: true`, reload, press `c` to enter calibration mode.
2. Click around the raven's outline in the scene, roughly a dozen points.
   Each click logs a `'NN.N% NN.N%',` line to the debug panel/console.
3. Copy those lines into `CONFIG.ravenClipPath` in `config.js` (in order,
   forming a closed polygon).
4. Click once on the neck/shoulder junction (where the head should pivot)
   and copy that into `CONFIG.headAnchor` as `{ x, y }` (divide the logged
   percentages by 100).
5. Click the center of the raven's visible eye for `CONFIG.eyePosition`, and
   adjust `CONFIG.eyeSize` (width/height, 0–1 fractions of the scene) until
   the blink patch sits neatly over it.
6. Press `b`/`r`/`h` to preview blink/ruffle/head-turn and refine.

## Replacing assets

### Hero background (required)
Drop your painting at `assets/backgrounds/hero.jpg` (or update
`CONFIG.heroImage` to point elsewhere — `.png`/`.webp` also work). Recommended
minimum 1920×1080, landscape, raven placed off-centre per the art-direction
brief.

### True raven sprites (optional, better quality)
If you later get proper cutout artwork, drop these into `assets/raven/`:

```
normal.png
blink.png
ruffle-01.png
ruffle-02.png
head-left.png
head-right.png
```

The app **auto-detects** `assets/raven/normal.png` at boot. If it loads
successfully, the app switches from clip-path mode to true sprite-swap mode
automatically — no config or code change needed. Clip-path calibration
becomes irrelevant in that mode.

### Audio (optional, Version 3)
Drop mp3s into `assets/audio/` matching the filenames in the
`SAMPLE_MANIFEST` at the top of `audio.js` (or edit that manifest to match
your files), then set `CONFIG.audioEnabled = true`. Distant/soft sounds
should keep higher `weight` values than close/intense ones so they play far
more often.

### Weather (optional, Version 2)
Set `CONFIG.latitude` / `CONFIG.longitude` to a real location (do **not**
commit your home address if this repo is ever shared — use a nearby town
centre or postcode centroid if that matters to you). `weather.js` will then
poll [Open-Meteo](https://open-meteo.com) (free, no API key) every
`weatherUpdateMinutes` and drive the same rain/fog/night/lightning layers the
debug keys use. A failed fetch keeps the last known-good state; if there's
never been a successful fetch, the scene just stays in its neutral default
look. Wind above ~30 km/h subtly increases feather-ruffle frequency.

## Configuration

Everything tunable lives in `config.js`. Key groups:

- **Timing** — `blinkMin/MaxSeconds`, `ruffleMin/MaxMinutes`,
  `headMoveMin/MaxMinutes`, plus `longQuietPeriodChance` (occasional much
  longer pause so the rhythm stays unlearnable).
- **Audio** — off by default; see above.
- **Display safety** — `burnInProtection`, `burnInCycleMinutes`,
  `burnInDriftPixels` (keep this tiny — 1–3px — it must stay imperceptible).
- **Debug** — `debug: true/false`.

## Fire TV / Amazon Silk deployment

1. Host this folder somewhere reachable from the Fire TV Stick — simplest
   options: a small always-on machine on your LAN running
   `python -m http.server 8080`, or any static host (GitHub Pages, Netlify,
   a Raspberry Pi you already have, etc.). No backend/server logic is
   required — it's static files.
2. On the Fire TV Stick, open **Silk Browser** and navigate to that URL.
3. Tap the screen once — the app requests fullscreen on load and again on
   the first tap/keypress as a fallback, since some Silk builds block the
   fullscreen API until a user gesture.
4. In Fire TV **Settings → Display & Sounds → Screensaver**, set the
   screensaver timeout as long as possible (or disable it) — otherwise Fire
   TV's own screensaver will cover the portrait after a few minutes.
5. In **Settings → Applications**, consider disabling "auto-sleep"/idle
   power-saving for Silk if your Fire TV OS version exposes that option.
6. Leave Silk running continuously. Known Silk quirks to watch for during a
   multi-hour soak test:
   - some Silk versions suspend background tabs/JS timers — keep the tab
     foregrounded and avoid switching inputs on the TV during testing;
   - audio autoplay may be blocked until the first user gesture — this is
     handled gracefully (playback attempts fail silently), but expect no
     sound until the first tap;
   - memory creep over very long uptimes — restart the Silk tab
     periodically (e.g. nightly) if you observe slowdown; this is a
     reasonable cron/automation task for a future version.
7. If Silk proves unreliable for continuous multi-day operation, the same
   HTML/CSS/JS can be packaged as a lightweight Fire TV HTML5 app instead —
   no rewrite needed, just a packaging step.

## Known limitations (Version 1)

- Raven movement uses a clip-path trick on the single hero painting rather
  than true separately-painted state art. It looks right once calibrated,
  but is inherently limited to *subtle* transforms — dramatic pose changes
  would reveal the trick. This is by design (see art-direction brief) and
  is superseded automatically the moment real cutout sprites are added.
  This trick is not needed if using sprite images (see the sprite section above).
- Weather and audio are wired but inert until you supply coordinates/samples
  — this is intentional scoping for Version 1, not a bug.
- Day/night, cloud-darkening, wind-driven ruffle frequency, and lightning
  are only *reachable* right now via debug keys or live weather (Version 2);
  there's no standalone clock-based day/night in v1.
- House/presence integration (Version 4) is not implemented — only the
  `window.dispatchEvent(new CustomEvent('portrait:setState', { detail: { state: 'AWAY' } }))`
  hook exists for a future integration to call into.
- No packaged Fire TV HTML5 app yet — Silk-only for now, per the brief's
  phased approach.

## File structure

```
haunted-portrait/
├── index.html
├── styles.css
├── config.js       ← all tunable values
├── app.js           ← core scene/behaviour engine
├── weather.js        ← Version 2, inert until lat/long set
├── audio.js           ← Version 3, inert until audioEnabled + samples
├── assets/
│   ├── backgrounds/hero.jpg   ← required, single painted scene
│   ├── raven/                  ← optional cutout sprites (auto-detected)
│   ├── weather/                ← reserved for future texture assets
│   └── audio/                  ← optional mp3 samples
└── README.md
```
