# AGENTS.md — A Light Haunting

Read `CODEX-HANDOVER.md` before making changes.

This is a nearly-finished living Gothic raven portrait, not a greenfield app. **Do not rewrite, redesign, migrate frameworks, or scope-creep.** Preserve the existing plain HTML/CSS/JS architecture and working behaviour.

## Primary finish line

1. Integrate `assets/raven/video/Raven Animation – Lightning.mp4` as the natural lightning path.
2. Integrate `assets/raven/video/Raven Animation – Mausoleum.mp4` using the same reusable full-scene environmental-video mechanism.
3. Make nighttime moonlight/moon glow look natural.
4. Regression-test existing raven/fog/weather/flight/debug behaviour.
5. Update stale docs/comments.
6. Stop. The owner intends the project to be DONE after this pass.

## Non-negotiables

- Portrait must look like a static painting most of the time.
- Locked camera; no reframing or obvious animation.
- Raven stays black — do not turn it blue or recolour it.
- Existing fog is good; preserve it.
- Flight Away and Flight Return are always paired; Return never gets an independent scheduler.
- Prevent ordinary raven gestures from overlapping a full-scene environmental clip.
- New Lightning/Mausoleum clips are **opaque full-scene 864×496 videos with AAC audio**, not black-key raven clips. Do not add them to the WebGL raven keyer. Base artwork is 864×480; crop/cover, never stretch.
- Keep embedded environmental-video audio muted unless explicitly approved.
- Handle the visible top-left AI watermark deliberately; current raven-shader watermark masking will not apply to a full-scene video element.
- Preserve Amazon Fire TV Stick / Silk compatibility and autoplay-safe media.
- No new dependencies/build chain unless strictly necessary.

## Verify before/while editing

- `CONFIG.ravenImage` is null; resting raven is baked into `hero.png`.
- `playGestureVideo()` currently hides an empty `raven-base`, not the baked hero raven. Test for ghosting.
- `_doFlightAway()` swaps to the empty cemetery only **after** the departure clip. Explicitly test for a static raven appearing underneath the departing raven.
- `audio.js` manifest does not match the two MP3 files currently present; do not enable audio as a side task.

Use existing debug controls. Preserve `l` for lightning; adding `m` for Mausoleum is sensible. Ensure reset cleans up any full-scene environmental playback.

When done, report exactly what changed, what was tested, and any remaining ambiguity. Do not quietly invent a complicated Mausoleum production schedule if the repo does not reveal one; expose it via config/debug or ask one focused question.
