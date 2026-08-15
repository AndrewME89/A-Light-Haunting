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
raven (assets/raven/raven-normal.png — one image, animated procedurally)
        ↓
assets/weather/fog-near.png                  (painted, in front of the raven)
        ↓
day/night → cloud/overcast → rain → lightning → vignette
```

There is **no pose-swap art**. The raven is a single isolated, transparent
cutout, pixel-aligned to the same canvas as the background. Every behaviour
— blink, feather ruffle, head-turn, look-at-viewer — is produced
procedurally in CSS/SVG on top of that one image. See "How the raven
animates" below.

Fog is real painted artwork, not a CSS gradient — see "Fog".

## How the raven animates

At boot, `app.js` preloads `raven-normal.png`. If it fails to load, the
scene just shows the cemetery with no raven (logged as a warning) rather
than breaking. If it loads, three independent techniques animate it —
nothing ever swaps to a different image:

**Blink** — a small dark eyelid-shaped overlay (`#raven-blink`) fades in
over the eye, holds, fades out. Positioned via `CONFIG.eyePosition`/
`eyeSize`.

**Feather ruffle** — an SVG filter (`feTurbulence` + `feDisplacementMap`,
defined in `index.html`) is applied to a *second copy* of the raven image
that's clipped to just the body/wing/tail region (`CONFIG.ruffleClipPath`)
— the head/beak/eye are outside that clip, so they never distort. The
filter's displacement is tweened up and back down by `app.js` over one
continuous gesture (`ruffleDurationMinMs`/`MaxMs`), not discrete frames, and
a fresh turbulence seed is picked each time so no two ruffles look
identical. The filter is only attached to the DOM while active
(`.ruffle-active`), so it costs nothing the rest of the time.

**Head-turn / look-at-viewer** — a subtle CSS `transform` (translate +
rotate + scale, a couple px/degrees at most) on the whole raven rig,
pivoting around `CONFIG.headAnchor`. Because there's only one flat image,
this can't show a genuinely different angle — it reads as a small,
plausible settling motion, not a real turn. That's an intentional
trade-off for a smoother, cleaner-feeling animation over more dramatic but
harder-swapped poses.

Durations are randomized within a range each time, matching the "never
learnable" timing philosophy:

| Event | Transition | Hold |
|---|---|---|
| Blink | 50–90ms in, 60–110ms out | 90–180ms closed |
| Feather ruffle | one 500–750ms gesture (ramp up, ramp down) | — |
| Head left/right | 180–250ms in, 220–320ms out | 1.4–3.2s |
| Look at viewer | 220–300ms in, 260–360ms out | 1.5–3s |

## "Look at viewer" — a deliberately rare event

Wired to its **own independent scheduler**, not folded into ordinary
head-turns, so it stays rare enough to be unsettling rather than
recognizable:

- fires roughly every 60–180 minutes (`lookViewerMinMinutes`/`MaxMinutes`)
- has a 30% chance (`lookViewerSkipChance`) of skipping a scheduled attempt
  outright and just rescheduling, so real gaps of many hours are common
- plays: `normal → look-viewer transform → hold ~1.5–3s → normal`

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
   with exactly one raven.
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
   | `c` | toggle calibration click-mode (see below) |
   | `d` | hide/show the debug panel |

   The debug log also prints whether the raven image loaded, missing
   fog/background assets, and weather state as it updates.

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

## Calibrating the raven

`CONFIG.ruffleClipPath`, `headAnchor`, `eyePosition`, and `eyeSize` are all
pre-calibrated against the current `raven-normal.png`. You'd only need to
redo this if you swap in a different raven image or the composition
changes:

1. Set `debug: true`, reload, press `c` to enter calibration mode.
2. Click around the body/wing/tail outline (excluding the head), roughly
   8–10 points. Each click logs a `'NN.N% NN.N%',` line to the debug
   panel/console.
3. Copy those lines into `CONFIG.ruffleClipPath` in `config.js` (in order,
   forming a closed polygon around just the feathered body).
4. Click once on the neck/shoulder junction (where the head should pivot)
   and copy that into `CONFIG.headAnchor` as `{ x, y }` (divide the logged
   percentages by 100).
5. Click the center of the raven's visible eye for `CONFIG.eyePosition`, and
   adjust `CONFIG.eyeSize` (width/height, 0–1 fractions of the scene) until
   the blink patch sits neatly over it.
6. Press `b`/`r`/`h`/`v` to preview blink/ruffle/head-turn/look-viewer and
   refine.

## Replacing assets

### Background (required)
`assets/backgrounds/cemetery-background.png` — the raven-free cemetery
scene. Update `CONFIG.heroImage` if you rename or relocate it.

### Raven (required)
`assets/raven/raven-normal.png` — the one raven image, transparent PNG at
the same 1672×941 canvas as the background, pixel-aligned. Update
`CONFIG.ravenImage` if you rename or relocate it, and re-run the
calibration steps above if the pose/composition changed.

`assets/backgrounds/hero.png` (the original painting with the raven baked
in) and the other pose PNGs previously used for sprite-swap rendering
(`raven-blink.png`, `raven-ruffle-01/02.png`, `raven-head-left/right.png`,
`raven-look-viewer.png`) are **not used by the current renderer** — nothing
in the code references them. They're left in the repo rather than deleted
in case you want to reference them later; safe to ignore.

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
  `headMoveFadeIn/OutMin/MaxMs`, `lookViewerFadeIn/OutMin/MaxMs` — how long
  each fade/transform transition takes.
- **Ruffle filter** — `ruffleDurationMin/MaxMs` (length of the one
  turbulence gesture), `ruffleDisplacementScale` (peak px displacement —
  keep small, this should read as a shiver not a warp),
  `ruffleTurbulenceFrequency` (SVG `feTurbulence` baseFrequency — higher is
  finer/tighter ripples).
- **Calibration** — `ruffleClipPath`, `headAnchor`, `eyePosition`,
  `eyeSize` — see "Calibrating the raven" above.
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
   - **SVG filters** (the ruffle effect) are more GPU-dependent than plain
     opacity/transform — it's only attached to the DOM for the ~0.5–0.75s
     the ruffle is active, but if Silk on your specific Fire TV generation
     struggles with it, lowering `ruffleDisplacementScale` reduces the
     rendering cost proportionally.
7. If Silk proves unreliable for continuous multi-day operation, the same
   HTML/CSS/JS can be packaged as a lightweight Fire TV HTML5 app instead —
   no rewrite needed, just a packaging step.
8. **Not yet soak-tested on a physical Fire TV Stick** — verified in a
   desktop browser only so far. Recommended before relying on it: a
   multi-hour run on the actual device, paying particular attention to the
   SVG ruffle filter and the fog drift animation.

## Known limitations

- Head-turn and look-at-viewer are subtle transforms, not a real change of
  angle — this is an inherent limit of animating one flat image rather than
  a trade-off you can tune away. If a true angle change matters later,
  that needs new art (a second photographed/painted angle), not more code.
- Old `.svg` placeholder files and the unused sprite-pose PNGs remain under
  `assets/` from earlier iterations. Nothing in the code references them;
  they're inert and safe to ignore (or delete later if you want to tidy
  the repo).
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
├── index.html       ← includes the SVG feTurbulence/feDisplacementMap filter defs
├── styles.css
├── config.js         ← all tunable values
├── app.js             ← core scene/behaviour engine + procedural raven animation
├── weather.js          ← Open-Meteo integration, inert until lat/long set
├── audio.js              ← raven sample playback, inert until audioEnabled + samples
├── assets/
│   ├── backgrounds/
│   │   ├── cemetery-background.png   ← production background (raven-free)
│   │   └── hero.png                   ← unused by current renderer, kept as reference
│   ├── raven/
│   │   ├── raven-normal.png            ← the only raven asset actually used
│   │   └── (other raven-*.png/.svg)    ← unused, kept from earlier iterations
│   ├── weather/
│   │   ├── fog-far.png
│   │   └── fog-near.png
│   └── audio/         ← optional mp3 samples
└── README.md
```
