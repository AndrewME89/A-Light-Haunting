/**
 * Haunted Raven Portrait — central configuration.
 * Every tunable value lives here. Nothing behaviourally significant
 * should be hard-coded elsewhere in the app.
 */
const CONFIG = {
  // ---------------------------------------------------------------------
  // Location & weather (wired up in Version 2 — safe to leave populated
  // now, the app will simply never call the weather API until v2 code
  // is added to weather.js).
  // ---------------------------------------------------------------------
  latitude: null,
  longitude: null,
  weatherUpdateMinutes: 5,

  // ---------------------------------------------------------------------
  // Raven behaviour timing (Version 1)
  // ---------------------------------------------------------------------
  blinkMinSeconds: 20,
  blinkMaxSeconds: 120,
  blinkDurationMinMs: 100,
  blinkDurationMaxMs: 250,
  doubleBlinkChance: 0.1,          // chance a blink is followed by a second, quick blink
  doubleBlinkPauseMs: 220,

  ruffleMinMinutes: 4,
  ruffleMaxMinutes: 20,

  headMoveMinMinutes: 10,
  headMoveMaxMinutes: 40,
  headMoveHoldMinMs: 1400,
  headMoveHoldMaxMs: 3200,

  // Occasionally skip a scheduled event entirely and roll a much longer
  // wait instead, so the viewer can never learn the rhythm.
  longQuietPeriodChance: 0.12,
  longQuietPeriodMultiplier: 3,

  // ---------------------------------------------------------------------
  // Audio (Version 3 — module present, disabled by default until real
  // samples are dropped into assets/audio/)
  // ---------------------------------------------------------------------
  audioEnabled: false,
  audioVolume: 0.2,
  audioMinMinutes: 3,
  audioMaxMinutes: 25,
  longSilenceChance: 0.15,

  // ---------------------------------------------------------------------
  // Weather visuals (Version 2 — layers exist now and are drivable from
  // the debug panel; real weather will call the same setters in v2)
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
  // Single painted hero scene (cemetery + raven combined). This is the
  // only required art asset for Version 1.
  heroImage: 'assets/backgrounds/hero.png',

  // If assets/raven/normal.png (and friends) exist and load successfully,
  // the app automatically switches to true sprite-swap mode instead of
  // the clip-path trick below. See README "Asset replacement".
  ravenSpriteMode: {
    normal: 'assets/raven/normal.png',
    blink: 'assets/raven/blink.png',
    ruffle1: 'assets/raven/ruffle-01.png',
    ruffle2: 'assets/raven/ruffle-02.png',
    headLeft: 'assets/raven/head-left.png',
    headRight: 'assets/raven/head-right.png'
  },

  // --- Clip-path calibration (used only while sprite assets are absent) ---
  // Normalized (0–1) polygon roughly outlining the raven within heroImage,
  // expressed as CSS clip-path percentages. Tune with the calibration tool:
  // enable debug mode, press "c", click around the raven's silhouette, and
  // read the logged percentages from the console.
  // Calibrated by eye against assets/backgrounds/hero.png. Re-run the
  // calibration tool (debug mode, press "c") if you swap in a different
  // painting or crop.
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
  // Portrait state (Version 4 hook — v1 only ever uses ACTIVE, but the
  // state machine and external-event listener are live now so future
  // integrations have something to talk to).
  // ---------------------------------------------------------------------
  portraitState: 'ACTIVE'
};
