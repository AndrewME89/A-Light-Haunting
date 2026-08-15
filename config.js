/* The one place to tune the portrait. Times are deliberately broad and random. */
const CONFIG = Object.freeze({
  latitude: null,
  longitude: null,
  weatherUpdateMinutes: 5,

  blinkMinSeconds: 20,
  blinkMaxSeconds: 120,
  blinkMinDurationMs: 110,
  blinkMaxDurationMs: 230,
  doubleBlinkChance: 0.08,

  ruffleMinMinutes: 4,
  ruffleMaxMinutes: 20,
  headMoveMinMinutes: 10,
  headMoveMaxMinutes: 40,
  longQuietPeriodChance: 0.08,
  longQuietPeriodMultiplier: 1.8,

  audioEnabled: true,
  audioVolume: 0.2,
  audioMinMinutes: 3,
  audioMaxMinutes: 25,
  longSilenceChance: 0.15,

  lightningEnabled: true,
  burnInProtection: true,
  debug: false
});
