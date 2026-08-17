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
  // gesture itself (what it looks like, how long it takes) now comes from
  // a pre-rendered video clip, not procedural timing — see "How the raven
  // animates" in README. Durations below are for scheduling only.
  // ---------------------------------------------------------------------
  blinkMinSeconds: 20,
  blinkMaxSeconds: 120,

  ruffleMinMinutes: 4,
  ruffleMaxMinutes: 20,

  headMoveMinMinutes: 10,
  headMoveMaxMinutes: 40,

  // A small independent "settle/shift" gesture (assets/raven/video/subtle.mp4)
  // — its own rare scheduler, same philosophy as the others.
  subtleMinMinutes: 6,
  subtleMaxMinutes: 25,

  // "Look at viewer" — deliberately the rarest, on its own independent
  // scheduler so it never gets mixed in with ordinary head-turn odds.
  lookViewerMinMinutes: 60,
  lookViewerMaxMinutes: 180,
  // Chance a scheduled attempt is skipped outright (just reschedules),
  // so real-world gaps of many hours are common.
  lookViewerSkipChance: 0.3,

  // Occasionally skip a scheduled event entirely and roll a much longer
  // wait instead, so the viewer can never learn the rhythm.
  longQuietPeriodChance: 0.12,
  longQuietPeriodMultiplier: 3,

  // Crossfade between the static resting image and the video overlay
  // when a gesture starts/ends (and vice versa). Kept short — this just
  // smooths the seam, it's not meant to be noticeable itself.
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
  // Background-only cemetery scene (raven cleanly removed).
  heroImage: 'assets/backgrounds/cemetery-background.png',

  // The raven at rest: a single isolated cutout, pixel-aligned to the
  // same canvas as heroImage. Shown whenever no gesture video is playing.
  ravenImage: 'assets/raven/raven-normal.png',

  // Painted fog overlays (real artwork, not CSS gradients). Missing files
  // are detected gracefully — that layer just stays inactive.
  fogFarImage: 'assets/weather/fog-far.png',
  fogNearImage: 'assets/weather/fog-near.png',

  // ---------------------------------------------------------------------
  // Raven gesture videos
  // ---------------------------------------------------------------------
  // Each is a short clip against a *flat* black or white background (no
  // alpha channel — these are plain MP4s). At playback, a WebGL shader
  // keys out that flat background in real time so only the raven shows,
  // composited over heroImage exactly where raven-normal.png normally
  // sits. `key` says which flat colour to remove. See README "How the
  // raven animates" for the keying/watermark-crop approach and its one
  // known limitation (very dark shadow feathers on the black-keyed clips
  // can pick up faint transparency, since they're nearly the same colour
  // as the background in that footage).
  ravenVideos: {
    blink:      { src: 'assets/raven/video/blink.mp4',       key: 'black' },
    ruffle:     { src: 'assets/raven/video/ruffle.mp4',      key: 'black' },
    headLeft:   { src: 'assets/raven/video/head-left.mp4',   key: 'white' },
    lookViewer: { src: 'assets/raven/video/look-viewer.mp4', key: 'black' },
    subtle:     { src: 'assets/raven/video/subtle.mp4',      key: 'white' }
  },

  // Two of the clips have a small AI-tool watermark burned into the
  // bottom-right corner, outside where the raven ever sits. This
  // normalized (0–1) rectangle is forced fully transparent regardless of
  // colour, cropping the watermark out of the visible composite.
  ravenVideoWatermarkCrop: { x: 0.83, y: 0.80 },

  // Key softness: pixels within this normalized distance of the key colour
  // fade to transparent (smoothstep between the two values). Black distance
  // uses the brightest RGB channel; white distance uses inverse luminance.
  // Split per key colour because the safe margin is very
  // different for each:
  //  - black: the background measures as literal (0,0,0) with no
  //    compression noise, so `low` can sit right near zero — this
  //    while still fully clearing the flat background. Max-channel
  //    distance also keeps blue-black feather pixels such as
  //    RGB(0,1,3) opaque instead of turning them semi-transparent and
  //    washing them out against the brighter cemetery.
  //    footage against a higher-contrast background can.
  //  - white: a dark bird against a white background has huge natural
  //    contrast, so this can be much more generous — wide enough to
  //    reliably clear near-white (not just pure-white) background pixels
  //    and compression fringe, with no risk to the (dark) raven.
  ravenVideoKeyThreshold: {
    black: { low: 0.001, high: 0.008 },
    white: { low: 0.12, high: 0.30 }
  },

  // Erosion radius (in texels) for the edge-fringe cleanup pass — shrinks
  // the opaque silhouette inward by roughly this many pixels. Also split
  // per key colour, and for the opposite reason from the threshold split:
  //  - white: erosion is the fix for edge fringe (compression blending a
  //    few background pixels into the silhouette boundary), so this is
  //    deliberately strong.
  //  - black: erosion does NOT help the interior shadow-collision problem
  //    above — it would actively spread those already-fragile dark spots
  //    outward by eroding the alpha they'd otherwise inherit from
  //    neighbouring opaque pixels. Kept at 0 (off) for that reason.
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
