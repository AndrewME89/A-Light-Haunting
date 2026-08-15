# Haunted Raven Portrait

A full-screen "living portrait" web app: a Gothic cemetery scene with a raven
that mostly just sits there — and, rarely, blinks, ruffles, turns its head,
shifts slightly, or seems to notice you. Built as plain HTML/CSS/JS for
continuous operation on a Fire TV Stick (or any browser), no build step, no
framework.

The guiding rule: **stillness is the default.** If the raven's movement is
ever obvious enough to look like "the animation is playing again," it's
tuned too aggressively — see `config.js`.

## Production renderer

The live scene is composed from real painted/video layers, back to front:

```
assets/backgrounds/cemetery-background.png   (raven-free base)
        ↓
assets/weather/fog-far.png                   (painted, behind the raven)
        ↓
raven: assets/raven/raven-normal.png at rest, replaced in real time by a
       gesture video (assets/raven/video/*.mp4) whenever one is playing
        ↓
assets/weather/fog-near.png                  (painted, in front of the raven)
        ↓
day/night → cloud/overcast → rain → lightning → vignette
```

Fog is real painted artwork, not a CSS gradient — see "Fog".

## How the raven animates

The raven rests as the static `raven-normal.png` almost all the time. Five
short pre-rendered video clips (`assets/raven/video/`) — `blink`, `ruffle`,
`head-left`, `subtle`, `look-viewer` — sit on their own independent random
schedulers (see `config.js`). When one fires, `app.js`:

1. plays that clip on a hidden `<video>` element,
2. real-time keys out its background with a small WebGL shader (see
   below), drawing the result to a canvas positioned exactly where the
   static raven sits,
3. crossfades the static image out / canvas in (and back again once the
   clip ends) over `CONFIG.ravenVideoCrossfadeMs` (120ms) — short enough
   to just smooth the seam, not to read as an effect itself.

Only one gesture plays at a time (a busy-guard blocks overlaps), and each
clip runs its own full, unmodified length (roughly 5–6 seconds each) — so a
gesture now reads as a brief cutaway shot of the raven doing something,
rather than the near-instant flicker earlier procedural versions used.
That's a real change in feel worth knowing about, not just a timing tweak.

### Why a shader, and its known limitations

The clips are plain MP4s — no alpha channel — shot against a flat black or
white background (`key: 'black' | 'white'` per clip in
`CONFIG.ravenVideos`). A WebGL fragment shader (`initRavenVideoGL()` in
`app.js`) samples each video frame, measures how close each pixel is to the
key colour, and fades it to transparent within a narrow band
(`CONFIG.ravenVideoKeyThreshold`, split per key colour) — this runs on the
GPU so it's cheap enough to do every frame, unlike an equivalent CPU canvas
pixel loop. The shader also does a small 4-tap "erode" pass (min alpha over
a few neighbouring pixels), which shrinks the opaque silhouette inward by a
couple of texels — this trades a very slightly thinner raven edge for
eliminating the faint semi-transparent fringe that a single-sample key
otherwise leaves at the silhouette boundary (visible as a light or dark
"outline" around the bird — see the second bullet below).

**Known limitation 1 — dark shadow feathers (`blink`, `ruffle`,
`look-viewer`):** the raven's own darkest shadow feathers are very close to
literal black (`RGB(0,1,3)` measured directly from footage) — essentially
the same colour as the black background being keyed out on those three
clips. This means those specific dark shadow areas can pick up faint, brief
transparency. It's not a code bug; the source footage has almost no
contrast between "raven in shadow" and "background" in those clips. The
threshold is kept tight specifically to minimize this, at the cost of
occasionally leaving a sliver of true-black background unkeyed at a body
edge. The white-keyed clips (`head-left`, `subtle`) don't have this
particular problem — a dark bird against white has natural contrast. If
this matters enough to fix properly, the real fix is regenerating the
black-background clips against a higher-contrast background (e.g. a
saturated green/blue), not a code change.

**Known limitation 2 — edge fringe / "outline" (all clips, most visible on
the white-keyed ones):** video compression blends a few pixels of
background into the raven's silhouette edge, which a naive single-sample
key can leave as a faint halo around the whole bird. The erode pass above
targets this directly, and the white threshold is deliberately generous
(there's a lot of safe margin — the raven is dark, the background is
white, so widening the "count as background" band doesn't risk eating into
the bird). If this is still visible after a hard refresh, the next lever to
pull is widening `CONFIG.ravenVideoKeyThreshold` further and/or increasing
the `1.5` texel multiplier in the erode pass in `app.js` (search
`uTexelSize * 1.5`) for a stronger erode radius.

### Watermark crop

`look-viewer.mp4` has a burned-in "KlingAI 3.0" watermark, and `head-left.mp4`
/ `subtle.mp4` have a second AI tool's watermark — both bottom-right, an
area the raven never occupies in any clip. `CONFIG.ravenVideoWatermarkCrop`
forces that corner fully transparent regardless of pixel colour, so it
never appears in the composite. `blink.mp4` and `ruffle.mp4` are clean.

### "Look at viewer" — a deliberately rare event

Wired to its own independent scheduler, not folded into ordinary
head-turns, so it stays rare enough to be unsettling rather than
recognizable:

- fires roughly every 60–180 minutes (`lookViewerMinMinutes`/`MaxMinutes`)
- has a 30% chance (`lookViewerSkipChance`) of skipping a scheduled attempt
  outright and just rescheduling, so real gaps of many hours are common

Debug key `v` triggers it immediately for testing — this does not affect
production rarity, since it calls the same function the scheduler calls
rather than touching the scheduler's timer.

### No head-right

There's only a `head-left` clip, no `head-right` — by design for now, head
turns always go left. If a right-turn clip is added later, wire it into
`CONFIG.ravenVideos` as `headRight` and add a second `makeGesture(...)` call
in `app.js` next to `doHeadMove`.

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
   | `h` | trigger a head turn (left only) |
   | `u` | trigger the subtle settle/shift gesture |
   | `v` | trigger "look at viewer" (does not affect production rarity) |
   | `l` | trigger one lightning flash |
   | `1` | toggle rain |
   | `2` | toggle fog |
   | `3` | toggle night tint |
   | `4` | toggle full storm mode (rain + overcast + night + recurring lightning) |
   | `0` | reset all weather visuals |
   | `a` / `i` / `s` / `w` | set portrait state to ACTIVE / IDLE / SLEEP / AWAY |
   | `d` | hide/show the debug panel |

   The debug log also prints whether WebGL initialized, how many gesture
   videos loaded successfully, missing fog/background assets, and weather
   state as it updates.

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

## Replacing assets

### Background (required)
`assets/backgrounds/cemetery-background.png` — the raven-free cemetery
scene. Update `CONFIG.heroImage` if you rename or relocate it.

### Raven at rest (required)
`assets/raven/raven-normal.png` — shown whenever no gesture is playing.
Update `CONFIG.ravenImage` if relocated.

### Raven gesture videos (required for animation; app degrades gracefully without them)
`assets/raven/video/blink.mp4`, `ruffle.mp4`, `head-left.mp4`, `subtle.mp4`,
`look-viewer.mp4` — see `CONFIG.ravenVideos` for paths and each clip's key
colour. To replace one, drop in a new MP4 with the same flat black-or-white
background convention and update the matching entry (`src`, `key`) in
`config.js`. A missing or failed clip just disables that one gesture
(logged as a warning) — it doesn't break the page or the other gestures.

If a new clip has its own watermark or artifact in a different corner,
adjust `CONFIG.ravenVideoWatermarkCrop`, or set it to `{ x: 1, y: 1 }` to
effectively disable the crop if it's not needed.

`assets/backgrounds/hero.png`, the individual pose PNGs
(`raven-blink.png`, `raven-ruffle-01/02.png`, `raven-head-left/right.png`,
`raven-look-viewer.png`) and the `.svg` placeholders under `assets/` are all
**unused by the current renderer** — left in the repo from earlier
iterations rather than deleted; safe to ignore.

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

- **Scheduling** — `blinkMin/MaxSeconds`, `ruffleMin/MaxMinutes`,
  `headMoveMin/MaxMinutes`, `subtleMin/MaxMinutes`,
  `lookViewerMin/MaxMinutes`, plus `longQuietPeriodChance` (occasional much
  longer pause so the rhythm stays unlearnable) and `lookViewerSkipChance`
  (same idea, specific to the rare look-at-viewer event). These control
  frequency only — how a gesture looks/how long it takes comes from its
  video clip now, not from timing config.
- **Raven video compositor** — `ravenVideos` (per-gesture clip path + key
  colour), `ravenVideoKeyThreshold.black`/`.white` (luma-key softness, split
  per key colour since the safe margin differs a lot — see "Why a shader"
  above), `ravenVideoWatermarkCrop` (corner forced transparent),
  `ravenVideoCrossfadeMs` (static ⇄ video crossfade duration).
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
   - audio autoplay may be blocked until the first user gesture — video
     gestures are muted so this doesn't affect them, but expect no ambient
     audio (if enabled) until the first tap;
   - memory creep over very long uptimes — restart the Silk tab
     periodically (e.g. nightly) if you observe slowdown; this is a
     reasonable cron/automation task for a future version.
   - **WebGL support is required** for gesture videos to render. If Silk on
     a given Fire TV generation lacks it, `app.js` logs a warning and the
     raven simply stays static (never breaks the page) — worth confirming
     WebGL works on your specific device during the soak test.
   - Five video files totalling a few MB are preloaded at boot
     (`preload="auto"`) — negligible over LAN/local hosting, but worth
     knowing if hosting somewhere with a slow connection to the device.
7. If Silk proves unreliable for continuous multi-day operation, the same
   HTML/CSS/JS can be packaged as a lightweight Fire TV HTML5 app instead —
   no rewrite needed, just a packaging step.
8. **Not yet soak-tested on a physical Fire TV Stick** — verified in a
   desktop browser only so far. Recommended before relying on it: a
   multi-hour run on the actual device, paying particular attention to
   WebGL availability and video decode/playback smoothness.

## Known limitations

- **Dark-feather keying artifact** on the black-keyed clips (`blink`,
  `ruffle`, `look-viewer`) — see "Why a shader, and its known limitations"
  above. Not fixable in code without regenerating that footage against a
  higher-contrast background.
- **Edge fringe/"outline" around the raven** — mitigated with an erode
  pass and a wider white-key threshold, but not necessarily eliminated on
  every clip/frame. See "Known limitation 2" above for what to try next if
  it's still visible after a hard refresh.
- **Gestures are now ~5–6 seconds each** (the clips' native length), not
  the near-instant flicker of earlier procedural versions. This is an
  intentional trade-off from switching to real video — reconsider if it
  no longer matches "stillness is the default" once you see it running.
- **No head-right clip** — head turns always go left. See "No head-right"
  above for how to add one later.
- Old `.svg` placeholder files and the unused sprite-pose PNGs remain under
  `assets/` from earlier iterations. Nothing in the code references them;
  safe to ignore or delete later.
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
├── index.html       ← raven-base + WebGL canvas + 5 hidden preloaded <video> sources
├── styles.css
├── config.js         ← all tunable values
├── app.js             ← core scene/behaviour engine + WebGL video compositor
├── weather.js          ← Open-Meteo integration, inert until lat/long set
├── audio.js              ← raven sample playback, inert until audioEnabled + samples
├── assets/
│   ├── backgrounds/
│   │   ├── cemetery-background.png   ← production background (raven-free)
│   │   └── hero.png                   ← unused by current renderer, kept as reference
│   ├── raven/
│   │   ├── raven-normal.png            ← the raven at rest
│   │   ├── video/
│   │   │   ├── blink.mp4
│   │   │   ├── ruffle.mp4
│   │   │   ├── head-left.mp4
│   │   │   ├── subtle.mp4
│   │   │   └── look-viewer.mp4
│   │   └── (other raven-*.png/.svg)    ← unused, kept from earlier iterations
│   ├── weather/
│   │   ├── fog-far.png
│   │   └── fog-near.png
│   └── audio/         ← optional mp3 samples
└── README.md
```
