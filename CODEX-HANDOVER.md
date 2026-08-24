# A Light Haunting — Claude + ChatGPT → Codex Handover

**Project:** A Light Haunting / Raven Portrait  
**Status:** Very late-stage / almost finished  
**Primary instruction:** **Do not rewrite this project from scratch. Finish the existing implementation with the smallest coherent set of changes.**  
**Current finish line:** integrate the two newly-added full-scene environmental videos, then make the nighttime moonlight look natural, then stop unless a regression is discovered.

---

## 1. Read this first

This repo is a deliberately restrained “living portrait”: a Gothic cemetery painting with a raven that appears static almost all the time, then performs small, infrequent movements that make the viewer wonder whether they imagined them.

The project has already gone through a large amount of asset-generation, compositing, timing, colour-matching, animation and implementation work. The owner is **not** looking for a redesign, framework migration, generic refactor, new feature roadmap, or a more “animated” result. The correct outcome is to preserve the current portrait and finish the final two visual systems cleanly.

### Non-negotiable artistic rules

- The portrait must read as a **still Gothic painting first**, animation second.
- Camera is locked. No zoom, pan, parallax camera, crop changes, reframing, wobble or scene drift beyond the existing tiny burn-in protection.
- Raven must remain **black**, with restrained cool highlights. Do not recolour it blue, brighten it dramatically, or alter its overall scale/position.
- Environment must remain painterly, moody and plausible — elegant haunting, not Halloween effects.
- Motion must be subtle, sparse and non-learnable. Avoid obvious loops and regular rhythms.
- Existing fog is the visual quality benchmark. New effects should feel at least as naturally integrated as the fog.
- Preserve all working raven gestures, flight pairing, weather behaviour, debug tools and Fire TV/Silk compatibility.
- Do not introduce a build chain, framework or dependency unless there is a compelling technical reason. Current app is plain HTML/CSS/JS and intentionally lightweight.
- Do not enable audio globally unless explicitly requested. Autoplay compatibility matters.
- **No scope creep.** Once the two new environmental videos and natural moonlight are integrated without regressions, this project is intended to be done.

---

## 2. Why this handover exists

A Claude Cowork session containing the final stretch of this project disappeared from Claude history. The deleted transcript itself was not present in the account metadata export, but the associated Claude project record survived and preserved a late-stage file called `future-improvements.md`.

That recovered document is copied verbatim into:

`docs/claude-recovery/future-improvements.md`

Additional recovery evidence is in:

- `docs/claude-recovery/RECOVERY-REPORT.md`
- `docs/claude-recovery/raven-project-snapshot.md`
- `docs/claude-recovery/surviving-raven-conversations.md`
- `docs/claude-recovery/01a01011-64e1-7446-8e50-2bff1319f728.json`

The recovered late-stage Claude note establishes that, before the session vanished:

1. `#layer-lightning` existed and lightning was a CSS flash, functional but visually flat.
2. `#layer-daynight` existed and night mode was a basic darkening overlay.
3. Painted fog was already working well and was considered the quality benchmark.
4. `audio.js` infrastructure existed and was gated behind `CONFIG.audioEnabled`.
5. A **dedicated full-scene video** was already the intended/known architectural approach for a mausoleum candlelight effect.
6. The two remaining visual weaknesses were **lightning** and **moon glow/night sky**.

Since that Claude note was written, two final source assets have been added to `assets/raven/video/`:

- `Raven Animation – Lightning.mp4`
- `Raven Animation – Mausoleum.mp4`

The owner’s current statement is that these were **the last two videos needed before making the moonlight more natural, after which the portrait was going to be DONE**.

This resolves the old “should lightning use CSS or a video?” question: **the video now exists.**

---

## 3. Current repo architecture

There is no framework and no build step. Main files:

| File | Purpose |
|---|---|
| `index.html` | Layer stack, hidden gesture `<video>` sources, debug UI |
| `styles.css` | Scene sizing, compositing, fog, night, clouds, rain visibility, CSS lightning, vignette, burn-in drift |
| `config.js` | Central source of behavioural timings, asset paths, keying thresholds and feature flags |
| `app.js` | Boot, raven WebGL compositor, gesture playback, schedulers, flight pairing, visual setters, rain, storm/debug logic |
| `weather.js` | Open-Meteo polling and mapping to rain/fog/overcast/night/thunderstorm |
| `audio.js` | Optional random soundscape infrastructure; currently inert |
| `assets/backgrounds/hero.png` | 864×480 base cemetery with raven painted in |
| `assets/backgrounds/cemetery-background.png` | 864×480 empty cemetery used while raven is away |
| `assets/weather/fog-far.png` / `fog-near.png` | Painted fog overlays |
| `assets/raven/video/*.mp4` | Raven gesture clips plus the two new full-scene environmental clips |

The core JavaScript files currently pass `node --check`.

### Current visible layer order, back → front

From `index.html` / `styles.css`:

1. Hero background (`#layer-hero`)
2. Far fog
3. Raven layer / WebGL gesture canvas
4. Near fog
5. Day/night treatment
6. Clouds / overcast
7. Rain
8. Lightning (currently CSS flash)
9. Vignette

The raven is **baked into `hero.png` at rest**. `CONFIG.ravenImage` is `null`; the old `raven-base` element remains in the DOM but currently has no separate static raven image.

---

## 4. Existing raven animation system — preserve this

The existing routine gesture videos are black-background MP4s, keyed in real time through a WebGL fragment shader in `app.js`.

The shader:

- keys true/near black using the **brightest RGB channel**, deliberately not luminance, so blue-black feather detail does not become washed-out/translucent;
- uses per-key thresholds from `CONFIG.ravenVideoKeyThreshold`;
- supports erosion, but black clips intentionally use radius `0`;
- masks known burned-in watermark zones at the top-left and bottom-right;
- uses cover-style UV cropping so clips fill the scene without stretching.

The routine gesture clips are 864×480 H.264, 24 fps:

| Gesture | Approx duration | Scheduler / behaviour |
|---|---:|---|
| Blink | 2.04 s | every 20–120 s |
| Double Blink | 3.04 s | every 45–180 s |
| Ruffle | 5.04 s | every 4–20 min |
| Look Left | 3.04 s | every 10–40 min |
| Small Feather Settle | 3.04 s | every 3–12 min |
| Preen | 3.04 s | every 8–25 min |
| Wing Stretch | 3.04 s | every 5–18 min |
| Look Viewer | 3.04 s | every 60–180 min + 30% skip chance |
| Flight Away | 5.04 s | every 180–480 min + 40% skip chance |
| Flight Return | 5.04 s | **never independently scheduled** |

A global 12% `longQuietPeriodChance` multiplies a scheduler delay by 3. State multipliers further reduce activity while IDLE/AWAY and suspend normal gestures while SLEEP.

### Flight pairing is non-negotiable

`flightAway` and `flightReturn` are a single logical event:

`flightAway → empty cemetery → absence of 1–5 min → flightReturn → hero restored`

`flightReturn` must never gain its own independent scheduler.

### Busy guard

Normal raven gestures share a `busy` guard so only one gesture can run at once. Environmental full-scene clips must be coordinated with this system; do **not** allow a raven gesture to fire over a full-scene Lightning/Mausoleum video that already contains a raven.

---

## 5. Existing weather / environmental system

`weather.js` polls Open-Meteo every 5 minutes when coordinates are configured. It maps weather to:

- rain intensity;
- fog;
- overcast darkness;
- day/night state;
- thunderstorm lightning loop;
- wind-driven temporary increase in ruffle frequency.

Current storm logic calls `window.RavenPortrait.triggerLightning()` at randomized gaps. Debug mode also triggers lightning with `l` and storm mode with `4`.

Painted fog uses two large PNGs with extremely slow opposing drift. **Do not replace it with CSS fog or a procedural substitute.** It is already considered successful.

Rain is a canvas particle system and should remain intact unless a concrete bug is found.

---

## 6. Existing audio system — important caveat

`audio.js` is wired but `CONFIG.audioEnabled` is currently `false`.

The manifest in `audio.js` expects filenames such as `caw-distant-01.mp3`, `croak-01.mp3`, etc. Those files are **not** currently present. The repo instead contains:

- `assets/audio/Crow Sound.mp3`
- `assets/audio/cry-of-the-raven.mp3`

Therefore simply flipping `CONFIG.audioEnabled = true` will **not** make the current repository audio work; the manifest and actual files do not match.

Do not silently “fix” this or turn sound on while completing the visual finish line unless specifically asked. The target display is an Amazon Fire TV Stick using Silk, so autoplay restrictions are relevant.

---

## 7. The two NEW videos — treat them differently from raven gesture clips

These are the newest assets and are **not yet referenced anywhere in the current source code**.

### `Raven Animation – Lightning.mp4`

Inspected media properties:

- 864×496 — note this is **not** the base scene’s 864×480
- H.264 video
- 24 fps
- ~5.088 s
- contains an AAC stereo audio track (32 kHz)
- full-scene footage, not a black-key raven cutout
- visually contains an actual branching lightning bolt and scene illumination
- the raven/background are part of the generated video
- an `AI` watermark is visible in the top-left source frames

### `Raven Animation – Mausoleum.mp4`

Inspected media properties:

- 864×496
- H.264 video
- 24 fps
- ~5.088 s
- contains an AAC stereo audio track (32 kHz)
- full-scene footage, not a black-key raven cutout
- visually introduces warm candle/light activity around the mausoleum while retaining the overall Gothic scene
- the raven/background are part of the generated video
- an `AI` watermark is visible in the top-left source frames

### Consequences for integration

**Do not add these to `CONFIG.ravenVideos` and do not pass them through the black-key WebGL raven compositor.** They are opaque full-scene environmental clips.

They should use a dedicated full-scene environmental playback path that temporarily takes over the painted scene while preserving outer treatments as appropriate.

Because these clips contain the raven as part of the full frame, the environmental playback path must prevent the ordinary raven scheduler from overlaying another gesture during playback.

Because the new clips are 864×496 while the base is 864×480, use a **cover/crop strategy, never stretching**. Verify the crop visually; the mismatch is small but real.

The embedded audio should be muted by default unless an explicit sound decision is made. Do not let generated clip audio unexpectedly violate autoplay-safe behaviour.

The top-left watermark must be dealt with deliberately. The current raven shader’s watermark crop does not apply to a normal full-scene video element. Avoid a crude fix that visibly damages the moon/trees or causes a static patch to pop during lighting changes.

---

## 8. Recommended implementation shape for the environmental videos

This is guidance, not a mandate to over-engineer. Reuse existing patterns and keep the change compact.

### A. Add a dedicated environment-video layer

A sensible architecture is one visible environment `<video>` (or canvas only if truly needed) controlled by a small playback function, rather than duplicating logic for Lightning and Mausoleum.

Suggested responsibilities:

- source registry in `config.js` (e.g. `environmentVideos.lightning`, `environmentVideos.mausoleum`);
- preload both clips;
- an environmental busy/lock state integrated with the raven `busy` guard;
- short, subtle crossfade into/out of the environmental clip;
- `object-fit: cover` / equivalent cropping;
- deterministic cleanup on `ended`, `error`, reset and interrupted state;
- fallback if an environmental clip is unavailable;
- debug entry points for both effects.

Because the video is a full opaque scene including raven/background, it will probably need to visually replace the base scene/raven/fog stack during those ~5 seconds, while keeping global treatments such as day/night, cloud darkness, rain and vignette above it if they still look correct. **Test the exact z-index rather than assuming.**

Do not permit overlapping full-scene environmental events.

### B. Lightning

The recovered Claude note called the old CSS lightning flat. The dedicated Lightning video now exists and is intended to resolve that problem.

Most likely desired behaviour:

- `triggerLightning()` uses the full-scene Lightning clip when it is ready;
- current CSS weak/strong flash can remain as a graceful fallback if the video is unavailable;
- weather-driven thunderstorm loop and debug `l` should route through the same public trigger;
- prevent storm timers from starting a second lightning clip while the first is active;
- do not compound the old CSS flash on top of the new lightning video unless visual testing specifically shows that it helps.

The source clip has audio, but **do not assume the embedded audio should play**. The recovered note originally contemplated separate rolling-thunder audio with realistic flash→thunder delay; that audio work was tabled, not part of the current mandatory finish line.

### C. Mausoleum

Recovered Claude wording refers to a “mausoleum candlelight approach” using a dedicated full-scene video. The new Mausoleum clip clearly matches that architecture.

What is **not recoverable from the deleted Cowork transcript** is the exact intended trigger cadence/conditions for the mausoleum event.

Do not bury an invented behaviour in hard-coded JS. If the exact intended scheduler cannot be inferred from current repo history, either:

1. expose clean config values and a debug trigger first, or
2. choose a conservative, clearly documented default only if the owner approves it.

A night-only rare environmental event is a plausible design, but it is an inference, not recovered fact.

---

## 9. FINAL visual task: natural moonlight / moon glow

After the two new videos are integrated, the only intended visual polish remaining is the moon/night treatment.

### Current problem

Current night mode is only:

`#layer-daynight` + `.is-night`

using a blue-black multiply gradient. It darkens the whole image, but the moon is not visually distinguished and the result can feel like a generic tinted overlay rather than moonlit night.

The recovered Claude note explicitly says:

- the moon should visibly glow at night;
- a full moon should feel bright/luminous against the sky;
- fog diffusion around it would be a bonus;
- CSS glow/radial gradient was considered preferable if it can look natural;
- a separate painted moon overlay or alternate hero image were fallback options.

### Desired result

- Moon reads as a luminous source, not simply a pale object under a dark filter.
- Soft local halo through the surrounding clouds/fog.
- Scene remains dark and painterly.
- **Raven remains black. Do not turn the bird bright blue.**
- Avoid obvious digital bloom, neon rings or a sharp CSS “spotlight.”
- Day state remains unchanged.
- Transition into/out of night should remain slow and unobtrusive.

The moon in `hero.png` is in the upper-left quadrant, approximately around **27% from the left and 13% from the top**. Treat that as a starting estimate only; tune visually against the artwork.

### Likely low-risk approach

Try a dedicated moonlight/moon-glow layer above the multiply night-darkening layer using one or more very soft radial gradients with `screen`/normal blending at low opacity. Keep the glow localized to the moon and nearby cloud bank, possibly with a second broader faint halo.

A separate layer is generally safer than forcing the multiply `#layer-daynight` to both darken the whole scene and create light; multiply can remove light but cannot convincingly generate it.

Do **not** reach for a new AI-generated moon asset unless CSS cannot achieve a painterly result. This is meant to be the last polish pass, not a new asset-production cycle.

Do not add astronomical/lunar-phase APIs unless explicitly requested. “Especially on a full moon” came from the recovered ideas file, but the current finish line is visual naturalness, not a new moon-phase feature.

---

## 10. Important code audit flags before changing behaviour

These are things ChatGPT noticed while inspecting the current repo. They are **verification flags**, not permission for an unrelated cleanup spree.

### 10.1 Baked raven vs gesture transition logic

`CONFIG.ravenImage = null`, so the resting raven lives in `hero.png`.

However, `playGestureVideo()` currently toggles `.raven-base-hidden`, while `raven-base` has no image in this mode. It does **not** hide the raven baked into `#layer-hero`.

That means the keyed animated raven is composited over the baked-in static raven. This may be intentionally masking transparency holes for most small gestures, but it creates a specific risk for motion that leaves the original silhouette.

### 10.2 Flight Away deserves an explicit visual test

In `_doFlightAway()`, the code plays `flightAway` **before** switching the hero to `cemetery-background.png`.

Therefore, as the video raven departs, the baked-in raven in `hero.png` may become visible underneath. The empty cemetery is only selected after the departure clip completes.

Do not blindly “fix” it without looking, because alignment/keying choices may have been deliberate — but **test this path explicitly**. If a duplicate/static raven is visible during takeoff, the departure needs a safe background strategy.

Return is different: the empty cemetery remains behind `flightReturn`, then hero is restored after landing.

### 10.3 README/comments contain stale wording

Some comments still describe a separate `raven-normal.png`/`raven-base` resting asset even though current `CONFIG.ravenImage` is null and the raven is baked into `hero.png`.

Treat live code/config as authoritative. Once the finish work is complete, update README/comments to match actual behaviour.

### 10.4 SLEEP state may not restore the previous day/night value cleanly

`Portrait.setState('SLEEP')` calls `setNight(true)`, which mutates `nightFlag`. When leaving SLEEP, it calls `setNight(nightFlag)`, which may now simply be `true` rather than the pre-SLEEP value.

Only fix this if you touch the state code or reproduce the issue; do not let it derail the final visual tasks.

### 10.5 Flight-return delayed retry is only partially defensive

If the initial return fires while busy/SLEEP, it schedules one retry after 15 seconds. That retry does not re-check SLEEP before forcing playback. Again: verify if relevant; do not scope-creep.

---

## 11. Debug / development expectations

Current debug controls:

```text
b = blink
e = double blink
r = ruffle
h = head-left
u = feather settle
v = look at viewer
p = preen
g = wing stretch
f = flight away (return automatic)
n = reminder only; never manually fire return
l = lightning
1 = rain
2 = fog
3 = night
4 = storm
0 = reset visual state
a/i/s/w = ACTIVE / IDLE / SLEEP / AWAY
d = toggle debug panel
```

When adding Mausoleum, add an obvious debug trigger (for example `m`, currently unused) and update the panel hint/documentation. If `l` moves from CSS to video-backed lightning, preserve `l` as the public debug trigger.

Reset (`0`) should leave no environmental video half-active and should restore a sane base state.

---

## 12. Target runtime / compatibility

Primary display target:

**Amazon Fire TV Stick → Silk browser → older monitor**

Implications:

- autoplay-safe video: muted / playsinline / preloaded;
- avoid heavyweight libraries;
- WebGL exists but should fail gracefully;
- preserve 16:9 letterbox behaviour;
- avoid requiring user interaction for normal visual playback;
- keep CPU/GPU usage sane for long-running display;
- burn-in protection remains a tiny ≤2 px drift over a long cycle.

Do development testing from a local HTTP server rather than relying on `file://`, especially because of media and weather fetches.

---

## 13. Definition of done

The repo is finished when all of the following are true:

1. `Raven Animation – Lightning.mp4` is integrated as the natural lightning path, with safe fallback/no overlap.
2. `Raven Animation – Mausoleum.mp4` is integrated into a clean full-scene environmental-video system and can be triggered/tested; its production trigger is explicit/configurable rather than an undocumented guess.
3. The new full-scene videos do not stretch, visibly jump framing, expose watermarks, double the raven, collide with raven gestures, or leave a stuck layer after playback.
4. Embedded video audio does not unexpectedly play.
5. Night mode has a natural luminous moon/halo rather than a flat global blue-black tint.
6. Raven remains black and visually consistent.
7. Existing fog, rain, overcast, raven gesture timing, look-viewer rarity, flight pairing, weather integration, debug controls and burn-in protection still work.
8. Flight Away/Return has been visually checked for the baked-raven ghost issue.
9. `node --check` (or equivalent syntax validation) passes for all JS files.
10. README/config comments are updated enough that the next reader is not misled about the final architecture.
11. No unrelated redesign/refactor was introduced.
12. The owner can run the portrait and reasonably say: **done**.

---

## 14. Suggested Codex working order

1. Read `AGENTS.md`, this handover, then `README.md`, `config.js`, `index.html`, `styles.css`, `app.js`, `weather.js`, `audio.js`.
2. Run a baseline syntax check and launch the repo locally.
3. Manually exercise debug keys for raven gestures, fog, night, storm and flight before editing.
4. Inspect the two new full-scene videos and confirm their crop/start/end behaviour in-browser.
5. Implement a small reusable environmental-video playback path.
6. Wire Lightning through it, keeping CSS flash only as fallback if useful.
7. Wire Mausoleum through the same path; add debug/config plumbing without inventing hidden behaviour.
8. Test environmental videos against fog/night/rain/storm and raven busy state.
9. Fix only any regression/blocker exposed by those tests (especially Flight Away ghosting).
10. Implement natural moon glow/night treatment.
11. Test the whole debug matrix again, including reset.
12. Update docs/comments and provide a concise final change summary.

---

## 15. Final instruction to Codex

Treat this as restoration/finishing work, not greenfield development.

The difficult part — the artwork, raven assets, gesture behaviour, compositing model, fog, scheduler design and overall aesthetic — already exists. The best implementation will be the one that **changes the least while making the final two environmental assets and moonlight feel as if they had always belonged in the painting.**
