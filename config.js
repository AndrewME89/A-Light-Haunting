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
  // Eyelid-closed hold duration (not counting the fade in/out below).
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
  // The ruffle is one continuous feather-turbulence gesture (ramp up then
  // back down), not discrete frames — see "How the raven animates" in
  // README. Total duration of that single gesture:
  ruffleDurationMinMs: 500,
  ruffleDurationMaxMs: 750,
  // Max displacement (px) the turbulence filter pushes feather pixels at
  // the peak of the gesture. Keep small — this should read as a shiver,
  // not a warp.
  ruffleDisplacementScale: 5,
  // SVG feTurbulence baseFrequency ("x y"). Higher = finer/tighter ripples.
  ruffleTurbulenceFrequency: '0.06 0.09',

  headMoveMinMinutes: 10,
  headMoveMaxMinutes: 40,
  headMoveHoldMinMs: 1400,
  headMoveHoldMaxMs: 3200,
  // Transform transition duration turning into / back out of the pose.
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
  // Assets
  // ---------------------------------------------------------------------
  // Background-only cemetery scene (raven cleanly removed).
  heroImage: 'assets/backgrounds/cemetery-background.png',

  // Single isolated raven cutout (transparent PNG), pixel-aligned to the
  // same 1672×941 canvas as heroImage. There is no separate pose art —
  // every animation (blink, ruffle, head-move, look-viewer) is produced
  // procedurally in CSS/SVG on top of this one image. See README
  // "How the raven animates".
  ravenImage: 'assets/raven/raven-normal.png',

  // Painted fog overlays (real artwork, not CSS gradients). Missing files
  // are detected gracefully — that layer just stays inactive.
  fogFarImage: 'assets/weather/fog-far.png',
  fogNearImage: 'assets/weather/fog-near.png',

  // --- Calibration (all normalized 0–1, expressed as CSS percentages,
  // relative to the scene box — ravenImage already shares the scene's
  // canvas alignment so no separate raven-local coordinate space is
  // needed). Tune with the calibration tool: enable debug mode, press
  // "c", click the scene, and read the logged percentages from the
  // console. ---

  // Polygon isolating just the body/wing/tail feathers — deliberately
  // excludes the head/beak/eye, so the ruffle filter never distorts the
  // face. Roughly "everything below the shoulder line".
  ruffleClipPath: [
    '52% 30%', '56% 40%', '54% 58%', '46% 74%', '35% 92%',
    '11% 89%', '14% 68%', '20% 36%', '33% 30%'
  ],

  // Anchor point the raven pivots around for head-turn transforms —
  // roughly where the neck meets the body.
  headAnchor: { x: 0.5, y: 0.28 },

  // Eyelid-overlay placement for the blink illusion.
  eyePosition: { x: 0.458, y: 0.177 },
  eyeSize: { width: 0.035, height: 0.028 },

  // ---------------------------------------------------------------------
  // Portrait state (external-integration hook — v1 only ever uses ACTIVE,
  // but the state machine and event listener are live now so future
  // integrations have something to talk to).
  // ---------------------------------------------------------------------
  portraitState: 'ACTIVE'
};
