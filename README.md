# Haunted Raven Portrait

A full-screen "living portrait" web app: a Gothic cemetery scene with a raven
that mostly just sits there — and, rarely, blinks, ruffles, turns its head,
or seems to notice you. Built as plain HTML/CSS/JS for continuous operation
on a Fire TV Stick (or any browser), no build step, no framework.

The guiding rule: **stillness is the default.** If the raven's movement is
ever obvious enough to look like "the animation is playing again," it's
tuned too aggressively — see `config.js`.

## Production renderer

The live scene is composed from real painted layers, back to front:

```
assets/backgrounds/cemetery-background.png   (raven-free base)
        ↓
assets/weather/fog-far.png                   (painted, behind the raven)
        ↓
raven sprite renderer (assets/raven/raven-*.png, two-layer crossfade)
        ↓
assets/weather/fog-near.png                  (painted, in front of the raven)
        ↓
day/night → cloud/overcast → rain → lightning → vignette
```

The raven is **not** a clipped fragment of a bigger painting — it's a set of
aligned, transparent-PNG animation states (`assets/raven/raven-normal.png`,
`raven-blink.png`, `raven-ruffle-01.png`, `raven-ruffle-02.png`,
`raven-head-left.png`, `raven-head-right.png`, `raven-look-viewer.png`), all
preloaded at boot and crossfaded between on a two-layer `<img>` stack so pose
changes never hard-swap. See "How the raven renders" below.

Fog is real painted artwork, not a CSS gradient — see "Fog".

A **clip-path fallback** still exists for resilience (isolates the raven
region from `assets/backgrounds/hero.png`, the original painting with the
raven baked in, via CSS clip-path). It only engages automatically if
`raven-normal.png` fails to load, and is not what renders in production.

## How the raven renders

At boot, `app.js` preloads `raven-normal.png`. If it loads:

1. All other states (`blink`, `ruffle1`, `ruffle2`, `headLeft`, `headRight`,
   `lookViewer`) are preloaded too. Any individual missing file falls back
   to `normal` and logs a debug warning — it never breaks the page.
2. The renderer switches to **sprite mode** — confirm this in the debug log
   (`renderer: SPRITE`).
3. The clip-path fallback layers are hidden entirely. There is only ever one
   raven on screen.

Pose changes use a **two-layer crossfade** (`#raven-layer-a` /
`#raven-layer-b`): the incoming pose fades in on the hidden layer while the
current one fades out, both over the same duration, so the raven's body
(identical, pixel-aligned pixels in every state) stays visually still —
only the changed feature transitions. Durations are state-specific and
randomized within a range each time, matching the "never learnable" timing
philosophy:

| Event | Transition | Hold |
|---|---|---|
| Blink | 50–90ms in, 60–110ms out | 90–180ms closed |
| Feather ruffle | 120–180ms per frame (normal→r1→r2→r1→normal) | — |
| Head left/right | 180–250ms in, 220–320ms out | 1.4–3.2s |
| Look at viewer | 220–300ms in, 260–360ms out | 1.5–3s |

If `raven-normal.png` is missing, the app falls back to the clip-path
approach against `assets/backgrounds/hero.png` instead — see "Calibrating
the clip-path fallback" below. This path is a safety net, not something you
need to touch with the finished artwork in place.

## "Look at viewer" — a deliberately rare event

`raven-look-viewer.png` is wired to its **own independent scheduler**, not
folded into ordinary head-turns, so it stays rare enough to be unsettling
rather than recognizable:

- fires roughly every 60–180 minutes (`lookViewerMinMinutes`/`MaxMinutes`)
- has a 30% chance (`lookViewerSkipChance`) of skipping a scheduled attempt
  outright and just rescheduling, so real gaps of many hours are common
- plays: `normal → lookViewer → hold ~1.5–3s → normal`

Debug key `v` triggers it immediately for testing — this does not affect
production rarity, since it calls the same function the scheduler calls
rather than touching the scheduler's timer.

## Quick start (local testing)

No build step, no server framework required.

1. Open `config.js` and confirm `debug: true` while you're testing.
2. Serve the folder over HTTP (opening `index.html` directly via `file://`
   works in most browsers, but a local server avoids CORS/autoplay quirks):
   ```
   npx serve .
   # or: python -m http.server 8080
   ```
3. Open it in a browser. You should see the cemetery scene fill the screen,
   with exactly one raven, no baked-in duplicate.
4. With `debug: true`, a small panel appears bottom-left. Keyboard shortcuts:

   | Key | Effect |
   |---|---|
   | `b` | trigger a blink |
   | `r` | trigger a feather ruffle |
   | `h` | trigger a head turn (left/right) |
   | `v` | trigger "look at viewer" (does not affect production rarity) |
   | `l` | trigger one lightning flash |
   | `1` | toggle rain |
   | `2` | toggle fog |
   | `3` | toggle night tint |
   | `4` | toggle full storm mode (rain + overcast + night + recurring lightning) |
   | `0` | reset all weather visuals |
   | `a` / `i` / `s` / `w` | set portrait state to ACTIVE / IDLE / SLEEP / AWAY |
   | `c` | toggle calibration click-mode (clip-path fallback only, see below) |
   | `d` | hide/show the debug panel |

   The debug log also prints the active renderer, the current raven pose,
   any missing sprite/fog assets, and weather state as it updates.

5. When you're happy, set `debug: false` in `config.js` before deploying —
   the panel and all keyboard shortcuts disappear entirely.

## Fog

`assets/weather/fog-far.png` and `assets/weather/fog-near.png` are painted
transparent overlays aligned to the same canvas as the rest of the scene —
not CSS radial gradients, and not a tiled/scrolling texture. Far fog sits
behind the raven; near fog sits in front of it. Movement is a small, slow
CSS `transform: translate(...)` drift (roughly 10–13px, alternating
direction smoothly over 3–4.5 minutes per leg) — enough to read as
atmosphere, never as an animation layer. If `fog-near.png` is ever removed,
that layer just stays inactive gracefully; the far layer still works alone.

## Calibrating the clip-path fallback

This only matters if `raven-normal.png` ever fails to load and the app
drops into the fallback renderer. With the finished sprite art in place,
you shouldn't need this section.

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

### Background (required)
`assets/backgrounds/cemetery-background.png` — the raven-free cemetery
scene. Update `CONFIG.heroImage` if you rename or relocate it.

### Raven sprite states (required for production rendering)
Already in place in `assets/raven/`:

```
raven-normal.png
raven-blink.png
raven-ruffle-01.png
raven-ruffle-02.png
raven-head-left.png
raven-head-right.png
raven-look-viewer.png   ← rare "look at viewer" event, see above
```

Each is a transparent PNG at the same 1672×941 canvas as the background, so
it overlays pixel-aligned. The app **auto-detects** `raven-normal.png` at
boot; since it loads successfully, sprite crossfade rendering is active. To
replace any individual state, overwrite that file — same filename, same
canvas size, transparent background.

`assets/backgrounds/hero.png` (raven baked into the full painting) is kept
only as the source for the clip-path fallback — it is deliberately **not**
used as the production background, since that would leave a static duplicate
raven visible underneath the animated sprite.

### Fog (optional, graceful if missing)
`assets/weather/fog-far.png` / `assets/weather/fog-near.png` — see "Fog"
above. Update `CONFIG.fogFarImage`/`fogNearImage` if relocated.

### Audio (optional)
Drop mp3s into `assets/audio/` matching the filenames in the
`SAMPLE_MANIFEST` at the top of `audio.js` (or edit that manifest to match
your files), then set `CONFIG.audioEnabled = true`. Distant/soft sounds
should keep higher `weight` values than close/intense ones so they play far
more often.

### Weather (optional)
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
  `headMoveMin/MaxMinutes`, `lookViewerMin/MaxMinutes`, plus
  `longQuietPeriodChance` (occasional much longer pause so the rhythm stays
  unlearnable) and `lookViewerSkipChance` (same idea, specific to the rare
  look-at-viewer event).
- **Transition speeds** — `blinkFadeIn/OutMin/MaxMs`,
  `ruffleFrameFadeMin/MaxMs`, `headMoveFadeIn/OutMin/MaxMs`,
  `lookViewerFadeIn/OutMin/MaxMs` — how long each crossfade takes.
- **Audio** — off by default; see above.
- **Display safety** — `burnInProtection`, `burnInCycleMinutes`,
  `burnInDriftPixels` (keep this tiny — 1–3px — it must stay imperceptible).
- **Debug** — `debug: true/false`.

## Fire TV / Amazon Silk deployment

1. Host this folder somewhere reachable from the Fire TV Stick — GitHub
   Pages works well since this is a static site with no build step and no
   backend. A small always-on LAN machine (`python -m http.server 8080`) or
   any other static host works too.
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
8. **Not yet soak-tested on a physical Fire TV Stick** — the renderer
   changes in this pass (two-layer crossfade, painted fog, independent
   look-viewer scheduler) were verified in a desktop browser. Recommended
   before relying on it: a multi-hour run on the actual device to confirm
   Silk doesn't throttle/suspend the crossfade transitions or the fog drift
   animation.

## Known limitations

- The clip-path fallback (`assets/backgrounds/hero.png` + CSS clip-path)
  only exists as a safety net for a broken/missing sprite deploy. With the
  finished art in place it should never engage — if your debug log ever
  shows `renderer: CLIP` instead of `renderer: SPRITE`, something is wrong
  with the `assets/raven/raven-*.png` files, not the app logic.
- Old `.svg` placeholder raven/background files remain under `assets/` from
  an earlier prototype pass. Nothing in the code references them; they're
  inert and safe to ignore (or delete later if you want to tidy the repo).
- Weather and audio are wired but inert until you supply coordinates/samples
  — this is intentional, not a bug.
- Day/night, cloud-darkening, wind-driven ruffle frequency, and lightning
  are only *reachable* right now via debug keys or live weather; there's no
  standalone clock-based day/night independent of weather data.
- House/presence integration is not implemented — only the
  `window.dispatchEvent(new CustomEvent('portrait:setState', { detail: { state: 'AWAY' } }))`
  hook exists for a future integration to call into.
- No packaged Fire TV HTML5 app yet — Silk-only for now.

## File structure

```
A-Light-Haunting/
├── index.html
├── styles.css
├── config.js       ← all tunable values
├── app.js           ← core scene/behaviour engine + sprite renderer
├── weather.js        ← Open-Meteo integration, inert until lat/long set
├── audio.js           ← raven sample playback, inert until audioEnabled + samples
├── assets/
│   ├── backgrounds/
│   │   ├── cemetery-background.png   ← production background (raven-free)
│   │   └── hero.png                   ← clip-path fallback only (raven baked in)
│   ├── raven/
│   │   ├── raven-normal.png
│   │   ├── raven-blink.png
│   │   ├── raven-ruffle-01.png
│   │   ├── raven-ruffle-02.png
│   │   ├── raven-head-left.png
│   │   ├── raven-head-right.png
│   │   └── raven-look-viewer.png
│   ├── weather/
│   │   ├── fog-far.png
│   │   └── fog-near.png
│   └── audio/         ← optional mp3 samples
└── README.md
```
