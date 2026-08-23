/**
 * Haunted Raven Portrait — central configuration.
 * Every tunable value lives here. Nothing behaviourally significant
 * should be hard-coded elsewhere in the app.
 */
const CONFIG = {
  // ---------------------------------------------------------------------
  // Location & weather — safe to leave null, the app simply never calls
  // the weather API until these are set.
  // ---------------------------------------------------------------------
  latitude: -37.70001,
  longitude: 145.00238,
  weatherUpdateMinutes: 5,

  // ---------------------------------------------------------------------
  // Raven behaviour scheduling — how OFTEN each gesture fires. The
  // gesture itself (what it looks like, how long it takes) comes from a
  // pre-rendered video clip. Durations below are for scheduling only.
  // ---------------------------------------------------------------------
  blinkMinSeconds: 20,
  blinkMaxSeconds: 120,

  // Double-blink — on its own independent scheduler; slightly rarer than
  // a single blink so the two don't overlap in feel.
  doubleBlinkMinSeconds: 45,
  doubleBlinkMaxSeconds: 180,

  ruffleMinMinutes: 4,
  ruffleMaxMinutes: 20,

  headMoveMinMinutes: 10,
  headMoveMaxMinutes: 40,

  // Tiny feather settle — the subtlest, most frequent gesture.
  featherSettleMinMinutes: 3,
  featherSettleMaxMinutes: 12,

  // Wing stretch — extends a wing briefly, then resets.
  wingStretchMinMinutes: 5,
  wingStretchMaxMinutes: 18,

  // Preening — beak to feathers. Slightly rarer than feather settle.
  preenMinMinutes: 8,
  preenMaxMinutes: 25,

  // "Look at viewer" — psychological-ambiguity event. Deliberately the
  // rarest routine gesture, on its own scheduler with an extra skip chance.
  lookViewerMinMinutes: 60,
  lookViewerMaxMinutes: 180,
  lookViewerSkipChance: 0.3,

  // Flight away / return — the raven leaves the scene entirely and is
  // gone for several minutes. After flightAway plays, the screen shows
  // the empty cemetery. flightReturn is then scheduled automatically;
  // it is NEVER triggered independently — the two clips are always paired.
  flightAwayMinMinutes: 180,
  flightAwayMaxMinutes: 480,
  flightAwaySkipChance: 0.4,
  // How long the raven is absent between the two clips:
  flightReturnMinMinutes: 1,
  flightReturnMaxMinutes: 5,

  // Occasionally skip a scheduled event and roll a much longer wait,
  // so the viewer can never learn the rhythm.
  longQuietPeriodChance: 0.12,
  longQuietPeriodMultiplier: 3,

  // Crossfade between the resting image and the video overlay when a
  // gesture starts/ends. Kept short — just smooths the seam.
  ravenVideoCrossfadeMs: 120,

  // ---------------------------------------------------------------------
  // Audio (inert until CONFIG.audioEnabled + real samples in assets/audio/)
  // ---------------------------------------------------------------------
  audioEnabled: false,
  audioVolume: 0.2,
  audioMinMinutes: 3,
  audioMaxMinutes: 25,
  longSilenceChance: 0.15,

  // ---------------------------------------------------------------------
  // Weather visuals — layers exist and are drivable from the debug panel
  // and from weather.js once latitude/longitude are set.
  // ---------------------------------------------------------------------
  lightningEnabled: true,

  // ---------------------------------------------------------------------
  // Display safety
  // ---------------------------------------------------------------------
  burnInProtection: true,
  burnInCycleMinutes: 14,     // full drift loop duration
  burnInDriftPixels: 2,       // max drift in any direction — keep tiny

  // ---------------------------------------------------------------------
  // Debug
  // ---------------------------------------------------------------------
  debug: true,

  // ---------------------------------------------------------------------
  // Assets
  // ---------------------------------------------------------------------
  // Main scene — the cemetery WITH the raven as a painted element.
  // Shown whenever no gesture video is playing.
  heroImage: 'assets/backgrounds/hero.png',

  // The empty cemetery — raven absent. Shown automatically while the
  // raven is between a Flight Away and Flight Return clip. Never shown
  // at any other time.
  heroImageEmpty: 'assets/backgrounds/cemetery-background.png',

  // Static raven cutout (raven-normal.png). No longer used — the raven
  // is now part of heroImage. Set to null so the app skips the preload
  // step and still allows gestures to fire. If you later need a separate
  // raven layer, set this to the PNG path.
  ravenImage: null,

  // Painted fog overlays (real artwork, not CSS gradients). Missing files
  // are detected gracefully — that layer just stays inactive.
  fogFarImage: 'assets/weather/fog-far.png',
  fogNearImage: 'assets/weather/fog-near.png',

  // ---------------------------------------------------------------------
  // Raven gesture videos
  // ---------------------------------------------------------------------
  // All clips are shot against a flat black background (no alpha channel).
  // The WebGL compositor keys that background out in real time. See
  // README "How the raven animates" for the keying approach and its
  // one known limitation (very dark shadow feathers can pick up faint
  // transparency against the true-black key).
  //
  // flightAway and flightReturn are always paired — the app schedules
  // flightReturn automatically after flightAway completes. Never trigger
  // flightReturn independently.
  ravenVideos: {
    blink:         { src: 'assets/raven/video/Raven%20Animation%20%E2%80%93%20Blink.mp4',               key: 'black' },
    doubleBlink:   { src: 'assets/raven/video/Raven%20Animation%20%E2%80%93%20Double%20Blink.mp4',      key: 'black' },
    ruffle:        { src: 'assets/raven/video/Raven%20Animation%20%E2%80%93%20Ruffle.mp4',              key: 'black' },
    headLeft:      { src: 'assets/raven/video/Raven%20Animation%20%E2%80%93%20Look%20Left.mp4',         key: 'black' },
    lookViewer:    { src: 'assets/raven/video/Raven%20Animation%20%E2%80%93%20Look%20Viewer.mp4',       key: 'black' },
    featherSettle: { src: 'assets/raven/video/Raven%20Animation%20%E2%80%93%20Small%20Feather%20Settle.mp4', key: 'black' },
    preen:         { src: 'assets/raven/video/Raven%20Animation%20%E2%80%93%20Preen.mp4',              key: 'black' },
    wingStretch:   { src: 'assets/raven/video/Raven%20Animation%20%E2%80%93%20Wing%20Stretch.mp4',     key: 'black' },
    flightAway:    { src: 'assets/raven/video/Raven%20Animation%20%E2%80%93%20Flight%20Away.mp4',      key: 'black' },
    flightReturn:  { src: 'assets/raven/video/Raven%20Animation%20%E2%80%93%20Flight%20Return.mp4',    key: 'black' },
  },

  // Any clips with a burned-in watermark in the bottom-right corner
  // (an area the raven never occupies): this normalized (0–1) rectangle
  // is forced fully transparent regardless of colour. Check each new
  // clip and adjust if a watermark appears outside this area.
  ravenVideoWatermarkCrop: { x: 0.83, y: 0.80 },

  // Key softness: pixels within this normalized distance of the key colour
  // fade to transparent (smoothstep). All current clips are black-keyed.
  // Max-channel RGB distance (not luminance) keeps blue-black feather
  // pixels such as RGB(0,1,3) opaque against the true-black background.
  // The white entry is preserved for any future white-keyed clips.
  ravenVideoKeyThreshold: {
    black: { low: 0.001, high: 0.008 },
    white: { low: 0.12, high: 0.30 }
  },

  // Erosion radius (in texels) — shrinks the opaque silhouette inward to
  // remove compression-fringe halo at silhouette edges.
  //  - black: 0 (off). The raven's shadow feathers are near-black; erosion
  //    would spread those fragile transparent spots. The flat background
  //    has no compression noise so the threshold alone is sufficient.
  //  - white: strong erosion for white-keyed clips (not currently used).
  ravenVideoErodeRadius: {
    black: 0,
    white: 2.5
  },

  // ---------------------------------------------------------------------
  // Portrait state (external-integration hook — v1 only ever uses ACTIVE,
  // but the state machine and event listener are live now so future
  // integrations have something to talk to).
  // ---------------------------------------------------------------------
  portraitState: 'ACTIVE'
};
