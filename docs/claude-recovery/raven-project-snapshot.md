# Raven Portrait — preserved project snapshot

- Project UUID: `01a01011-64e1-7446-8e50-2bff1319f728`
- Name: Raven Portrait
- Created: `2026-08-17T14:12:50.531241+00:00`
- Last updated in export: `2026-08-23T21:48:48.428172+00:00`
- Preserved project documents: 1

## Project description

The Raven Portrait is a full-screen “living” Gothic artwork designed to look like a static cemetery painting most of the time, with a black raven as the central subject.

The raven is isolated from the background so it can be animated independently in short, subtle 5-second clips—blinks, tiny head turns, slight feather ruffles, and the occasional unsettling glance toward the viewer. The key goal is that the movement should be so restrained that someone might genuinely wonder whether they imagined it.

The backdrop is a moody, painterly cemetery with moonlight, gravestones, trees, fog, and Gothic architecture. Weather effects such as rain, fog, darkness, and lightning can be layered over the scene, ideally reacting to real-world weather.

Overall, the project aims for elegant, atmospheric, lightly haunted realism rather than obvious animation or Halloween kitsch. The portrait should feel inhabited, intelligent, and a little uncanny—something that quietly belongs in the house rather than looking like a screen playing a video.

## Preserved documents

### `claude/future-improvements.md`

UUID: `9cd9d458-d4be-4d78-be9c-44cbe577cb01`

```markdown
---
name: future-improvements
description: Tabled improvements to revisit when bandwidth allows
sources: [cowork]
---

# Tabled future improvements

## Lightning — make it feel natural

Current lightning is a CSS flash on the `#layer-lightning` div. It works but looks flat.

**Goal:** Proper forked lightning, paired with rolling thunder audio, so it feels as natural as the fog currently does.

**Open question:** Can this be achieved with the existing CSS flash + an audio clip, or does it need a dedicated full-scene video clip (like the mausoleum candlelight approach)?

- A video clip would give realistic branching bolt geometry and a painted look consistent with the rest of the scene, but requires a new AI-generated asset.
- CSS + audio may be sufficient if the flash timing is improved and thunder delay is realistic (flash → thunder gap based on "distance").
- Thunder audio files would plug into the existing `audio.js` infrastructure once `CONFIG.audioEnabled = true`.

---

## Night sky — glowing moon

Current night mode is a simple darkening overlay (`#layer-daynight`). The moon isn't distinguished from the rest of the sky.

**Goal:** During nighttime hours, the moon should visibly glow — especially on a full moon night (bright, luminous disc against the dark sky). Fog diffusing around it would be a bonus.

**Open question:** Can this be done with what's already in the scene (CSS glow effects, a radial gradient on the daynight layer?) or does it need:
- A separate painted moon overlay asset (a static PNG positioned over the moon's location in `hero.png`)
- Or a variant `hero.png` with the moon glow baked in for night mode?

The fog layers already feel right — these two elements (lightning and moon) are the ones that let the scene down by comparison.
```

