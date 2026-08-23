# A Light Haunting — Raven Portrait

A full-screen "living" Gothic artwork designed to look like a static cemetery painting almost all the time. The central subject is a black raven. The goal is that movement should be so restrained that someone might genuinely wonder whether they imagined it.

---

## How the raven animates

The raven is painted directly into the hero background image (`assets/backgrounds/hero.png`) and is always visible at rest. `CONFIG.ravenImage` is `null` — there is no separate raven PNG cutout.

Ten short pre-rendered video clips (`assets/raven/video/`) sit on their own independent random schedulers (see `config.js`). When one fires, `app.js`:

1. plays that clip on a hidden `<video>` element,
2. real-time keys out its background with a small WebGL shader (see below), drawing the result to a canvas positioned exactly where the static raven sits,
3. crossfades the static background out / canvas in (and back again once the clip ends) over `CONFIG.ravenVideoCrossfadeMs` (120 ms) — short enough to just smooth the seam, not to read as an effect itself.

Only one gesture plays at a time (a busy-guard blocks overlaps), and each clip runs its full unmodified length — so a gesture reads as a brief cutaway of the raven doing something, rather than a near-instant flicker.

### Gesture inventory

| Key in config | Debug key | Description |
|---|---|---|
| `blink` | `b` | Single blink |
| `doubleBlink` | `e` | Double blink |
| `ruffle` | `r` | Feather ruffle |
| `headLeft` | `h` | Head turn left |
| `featherSettle` | `u` | Tiny feather settle (subtlest, most frequent) |
| `preen` | `p` | Beak to feathers |
| `wingStretch` | `g` | Wing extends briefly |
| `lookViewer` | `v` | Looks toward viewer (rarest; own scheduler + skip chance) |
| `flightAway` | `f` | Raven leaves scene — **always paired with flightReturn** |
| `flightReturn` | `n` (read-only) | Raven returns — **triggered automatically only** |

### Flight behaviour (non-negotiable pairing rule)

`flightAway` and `flightReturn` are always paired and always in that order. `doFlightAway` is the only public entry point:

1. Plays the Flight Away clip.
2. Swaps the background to `assets/backgrounds/cemetery-background.png` (the empty cemetery — raven absent).
3. Waits `CONFIG.flightReturnMinMinutes`–`Config.flightReturnMaxMinutes` (default 1–5 min).
4. Plays the Flight Return clip.
5. Restores `hero.png`.

`flightReturn` has **no independent scheduler** and is **never triggered standalone**. Pressing `n` in debug mode only logs a reminder of this.

### Why a shader, and its known limitations

The clips are plain MP4s — no alpha channel — shot against a flat black background (`key: 'black'` for all current clips in `CONFIG.ravenVideos`). A WebGL fragment shader (`initRavenVideoGL()` in `app.js`) samples each video frame, measures how close each pixel is to black using the brightest RGB channel (not luminance — see below), and fades it to transparent within a band. This runs on the GPU so it's cheap enough to do every frame.

It also does an 8-tap "erode" pass (min alpha over neighbouring pixels, `CONFIG.ravenVideoErodeRadius`), which shrinks the opaque silhouette inward, trading a thinner raven edge for removing a semi-transparent fringe at the boundary. For black-keyed clips, `ravenVideoErodeRadius.black` is **0, deliberately** — erosion would spread any truly-black transparent pixels into opaque neighbours, growing holes rather than shrinking them.

**Known limitation — dark shadow feathers:** pixels that are exactly black remain indistinguishable from the keyed background. The compositor uses the brightest RGB channel rather than luminance, so tinted near-black feather detail (including blue-black pixels such as `RGB(0,1,3)`) stays opaque instead of becoming semi-transparent and washing out. `ravenVideoKeyThreshold.black` is consequently tuned to only remove the clean, noise-free black background. If this matters enough to fix properly, the real fix is regenerating clips against a higher-contrast background (e.g. saturated green/blue), not a code change.

### Watermark crop

`CONFIG.ravenVideoWatermarkCrop` forces the bottom-right corner of every clip fully transparent regardless of pixel colour, removing any burned-in AI-tool watermarks. Check each new clip and adjust `x`/`y` (normalized 0–1) if a watermark appears outside that area.

---

## Schedulers

Each gesture has its own independent `scheduleLoop` — a recursive `setTimeout` that picks a fresh random delay every time it fires. No two gestures share a scheduler phase, so the viewer can never learn a rhythm.

A `longQuietPeriodChance` (12%) causes any given scheduler tick to multiply its delay by 3, introducing unpredictable long silences.

`lookViewer` and `flightAway` both have an additional `skipChance` so attempts are sometimes abandoned outright, making real gaps of many hours common in production.

---

## Weather layers

The compositing stack (back to front):

1. **Hero background** — cemetery with raven baked in (`hero.png`) or empty cemetery (`cemetery-background.png`) during flight
2. **Far fog** — painted overlay behind the raven
3. **Raven layer** — canvas (WebGL) over a static div; mutually exclusive
4. **Near fog** — painted overlay in front of the raven
5. **Day/night** — darkens the whole scene for night mode
6. **Overcast** — semi-transparent cloud darkness
7. **Rain** — canvas particle simulation
8. **Lightning** — CSS flash animation
9. **Vignette** — foreground framing

`weather.js` drives `setRain`, `setFog`, `setNight`, `setOvercast`, and `triggerLightning` via `window.RavenPortrait` once `CONFIG.latitude`/`CONFIG.longitude` are set. The debug panel can drive them manually.

---

## Debug mode

Set `CONFIG.debug = true` (default). Press `d` to toggle the panel overlay.

```
b = blink
e = double-blink
r = ruffle
h = head-turn left
u = feather settle
v = look at viewer
p = preen
g = wing stretch
f = flight away (auto-triggers return — NEVER trigger return manually)
n = reminder that flight-return is automatic only
l = lightning
1 = toggle rain
2 = fog
3 = toggle night
4 = toggle storm
0 = reset all visual state
a/i/s/w = portrait states ACTIVE / IDLE / SLEEP / AWAY
d = hide panel
```

---

## Display target

Amazon Fire TV Stick → Silk browser → old monitor. Video elements use `muted`, `playsinline`, and `preload="auto"` for autoplay compatibility. All video filenames in `config.js` are percent-encoded (space → `%20`, en-dash → `%E2%80%93`).

Burn-in protection (`CONFIG.burnInProtection`) applies a slow ≤2 px CSS drift to the scene over a 14-minute loop.

---

## Audio

`audio.js` is wired up but inert until `CONFIG.audioEnabled = true` and real audio samples are placed in `assets/audio/`.
