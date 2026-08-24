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
