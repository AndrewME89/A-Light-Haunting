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
  latitude: null,
  longitude: null,
  weatherUpdateMinutes: 5,

  // ---------------------------------------------------------------------
  // Raven behaviour timing
  // ---------------------------------------------------------------------
  blinkMinSeconds: 20,
  blinkMaxSeconds: 120,
  // Eyelid-closed hold duration (not counting the crossfade in/out below).
  blinkDurationMinMs: 90,
  blinkDurationMaxMs: 180,
  doubleBlinkChance: 0.1,          // chance a blink is followed by a second, quick blink
  doubleBlinkPauseMs: 220,
  // Blink must read as an eyelid, not a dissolve — keep these fast.
  blinkFadeInMinMs: 50,
  blinkFadeInMaxMs: 90,
  blinkFadeOutMinMs: 60,
  blinkFadeOutMaxMs: 110,

  ruffleMinMinutes: 4,
  ruffleMaxMinutes: 20,
  // Crossfade duration between each ruffle frame (normal→r1→r2→r1→normal).
  ruffleFrameFadeMinMs: 120,
  ruffleFrameFadeMaxMs: 180,

  headMoveMinMinutes: 10,
  headMoveMaxMinutes: 40,
  headMoveHoldMinMs: 1400,
  headMoveHoldMaxMs: 3200,
  headMoveFadeInMinMs: 180,
  headMoveFadeInMaxMs: 250,
  headMoveFadeOutMinMs: 220,
  headMoveFadeOutMaxMs: 320,

  // "Look at viewer" — deliberately rare, on its own independent
  // scheduler so it never gets mixed in with ordinary head-turn odds.
  lookViewerMinMinutes: 60,
  lookViewerMaxMinutes: 180,
  // Chance a scheduled attempt is skipped outright (just reschedules),
  // so real-world gaps of many hours are common.
  lookViewerSkipChance: 0.3,
  lookViewerHoldMinMs: 1500,
  lookViewerHoldMaxMs: 3000,
  lookViewerFadeInMinMs: 220,
  lookViewerFadeInMaxMs: 300,
  lookViewerFadeOutMinMs: 260,
  lookViewerFadeOutMaxMs: 360,

  // Occasionally skip a scheduled event entirely and roll a much longer
  // wait instead, so the viewer can never learn the rhythm.
  longQuietPeriodChance: 0.12,
  longQuietPeriodMultiplier: 3,

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
  // Assets — production renderer
  // ---------------------------------------------------------------------
  // Background-only cemetery scene (raven cleanly removed). This is the
  // base layer under the raven sprite in production.
  heroImage: 'assets/backgrounds/cemetery-background.png',

  // assets/raven/raven-normal.png (and friends) are the finished, aligned
  // transparent-PNG animation states. When raven-normal.png loads
  // successfully at boot, the app uses true sprite crossfade rendering.
  // See README "Asset replacement".
  ravenSpriteMode: {
    normal: 'assets/raven/raven-normal.png',
    blink: 'assets/raven/raven-blink.png',
    ruffle1: 'assets/raven/raven-ruffle-01.png',
    ruffle2: 'assets/raven/raven-ruffle-02.png',
    headLeft: 'assets/raven/raven-head-left.png',
    headRight: 'assets/raven/raven-head-right.png',
    lookViewer: 'assets/raven/raven-look-viewer.png'
  },

  // Painted fog overlays (real artwork, not CSS gradients). Missing files
  // are detected gracefully — that layer just stays inactive.
  fogFarImage: 'assets/weather/fog-far.png',
  fogNearImage: 'assets/weather/fog-near.png',

  // --- Clip-path fallback (only used if raven-normal.png fails to load) ---
  // This mode needs a background that still has the raven painted into it,
  // which cemetery-background.png (above) deliberately does not. hero.png
  // is kept specifically for this fallback — do not point heroImage at it.
  heroFallbackImage: 'assets/backgrounds/hero.png',

  // Normalized (0–1) polygon roughly outlining the raven within
  // heroFallbackImage, expressed as CSS clip-path percentages. Tune with
  // the calibration tool: enable debug mode, press "c", click around the
  // raven's silhouette, and read the logged percentages from the console.
  ravenClipPath: [
    '44% 8%', '58% 20%', '54% 24%', '52% 29%', '56% 40%',
    '54% 58%', '46% 74%', '35% 92%', '11% 89%', '14% 68%',
    '20% 36%', '33% 12%'
  ],

  // Anchor point (normalized 0–1) the raven's head pivots around for
  // head-turn transforms — roughly where the neck meets the body.
  headAnchor: { x: 0.5, y: 0.28 },

  // Eye patch used for the blink illusion in clip-path mode. Normalized
  // to the scene box. Tune these with the calibration tool.
  eyePosition: { x: 0.458, y: 0.177 },
  eyeSize: { width: 0.035, height: 0.028 },

  // ---------------------------------------------------------------------
  // Portrait state (external-integration hook — v1 only ever uses ACTIVE,
  // but the state machine and event listener are live now so future
  // integrations have something to talk to).
  // ---------------------------------------------------------------------
  portraitState: 'ACTIVE'
};
