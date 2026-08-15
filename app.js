/**
 * Haunted Raven Portrait — core application.
 *
 * Architecture notes:
 *  - Everything timing-related uses recursive setTimeout with fresh random
 *    delays each time (never setInterval), so no two events share a phase
 *    and the viewer can't learn a rhythm.
 *  - The raven can run in two rendering modes, auto-detected at startup:
 *      "sprite" — production renderer. Real cutout PNGs (assets/raven/*.png),
 *                 preloaded at boot, crossfaded between on a two-layer
 *                 <img> stack so pose changes never hard-swap.
 *      "clip"   — fallback only, used if raven-normal.png fails to load.
 *                 Single painted image (assets/backgrounds/hero.png, raven
 *                 baked in) with a CSS clip-path isolating the raven region.
 *    Production art exists, so sprite mode is what actually renders; clip
 *    mode is a safety net, not the primary path.
 *  - window.RavenPortrait is the public surface future modules (weather,
 *    audio, house integration) call into. Nothing outside app.js needs to
 *    know which raven render mode is active.
 */

(function () {
  'use strict';

  // ----------------------------------------------------------------
  // Small utilities
  // ----------------------------------------------------------------
  const rand = (min, max) => min + Math.random() * (max - min);
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const minutesToMs = (m) => m * 60 * 1000;
  const secondsToMs = (s) => s * 1000;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  function pickWeighted(entries) {
    // entries: [{ value, weight }]
    const total = entries.reduce((sum, e) => sum + e.weight, 0);
    let r = Math.random() * total;
    for (const e of entries) {
      if (r < e.weight) return e.value;
      r -= e.weight;
    }
    return entries[entries.length - 1].value;
  }

  function log(...args) {
    if (!CONFIG.debug) return;
    console.log('[raven]', ...args);
    const el = document.getElementById('debug-log');
    if (el) {
      const line = document.createElement('div');
      line.textContent = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ');
      el.prepend(line);
      while (el.childNodes.length > 40) el.removeChild(el.lastChild);
    }
  }

  // ----------------------------------------------------------------
  // DOM refs
  // ----------------------------------------------------------------
  const sceneEl = document.getElementById('scene');
  const heroEl = document.getElementById('layer-hero');
  const layerRavenEl = document.getElementById('layer-raven');
  const ravenLayerA = document.getElementById('raven-layer-a');
  const ravenLayerB = document.getElementById('raven-layer-b');
  const ravenOverlayEl = document.getElementById('layer-raven-overlay');
  const blinkEl = document.getElementById('layer-blink');
  const daynightEl = document.getElementById('layer-daynight');
  const cloudsEl = document.getElementById('layer-clouds');
  const fogFarEl = document.getElementById('layer-fog-far');
  const fogNearEl = document.getElementById('layer-fog-near');
  const rainCanvas = document.getElementById('layer-rain');
  const lightningEl = document.getElementById('layer-lightning');
  const debugPanel = document.getElementById('debug-panel');

  // ----------------------------------------------------------------
  // Portrait state machine (external-integration hook)
  // ----------------------------------------------------------------
  const STATE_MULTIPLIERS = {
    ACTIVE: 1,
    IDLE: 1.8,
    SLEEP: Infinity, // scheduling suspended entirely
    AWAY: 3.2
  };

  const Portrait = {
    state: CONFIG.portraitState || 'ACTIVE',
    setState(name) {
      if (!STATE_MULTIPLIERS.hasOwnProperty(name)) return;
      const prev = this.state;
      this.state = name;
      log('portrait state ->', name);
      if (name === 'SLEEP') {
        setNight(true);
        setOvercast(0.4);
      } else if (prev === 'SLEEP') {
        setNight(nightFlag);
        setOvercast(overcastFlag ? 0.35 : 0);
      }
      if (name === 'AWAY') {
        heroEl.style.filter = 'brightness(0.55)';
        layerRavenEl.style.filter = 'brightness(0.55)';
      } else {
        heroEl.style.filter = '';
        layerRavenEl.style.filter = '';
      }
    }
  };

  // Future external integrations (Home Assistant, presence sensors, etc.)
  // can drive the portrait without touching this file:
  //   window.dispatchEvent(new CustomEvent('portrait:setState', { detail: { state: 'AWAY' } }));
  window.addEventListener('portrait:setState', (e) => {
    if (e.detail && e.detail.state) Portrait.setState(e.detail.state);
  });

  // ----------------------------------------------------------------
  // Raven render mode detection + two-layer sprite crossfade renderer
  // ----------------------------------------------------------------
  let ravenMode = 'clip';
  const spriteCache = {};
  const layerEls = { a: ravenLayerA, b: ravenLayerB };
  let activeLayer = 'a';
  let currentRavenKey = 'normal';

  function preloadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth > 0 ? img : null);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  // Crossfades to `key` over `durationMs`. Both the incoming and outgoing
  // layers animate opacity together over the same duration so the raven's
  // body (identical, pixel-aligned pixels in every state) never appears to
  // jump — only the changed feature (eye/feathers/head) visibly transitions.
  function setRavenState(key, durationMs) {
    if (ravenMode !== 'sprite') return Promise.resolve();
    const targetSrc = spriteCache[key] || spriteCache.normal;
    const fromEl = layerEls[activeLayer];
    const toKey = activeLayer === 'a' ? 'b' : 'a';
    const toEl = layerEls[toKey];
    toEl.src = targetSrc;
    toEl.style.transitionDuration = durationMs + 'ms';
    fromEl.style.transitionDuration = durationMs + 'ms';
    requestAnimationFrame(() => {
      toEl.classList.add('raven-frame-visible');
      fromEl.classList.remove('raven-frame-visible');
    });
    activeLayer = toKey;
    currentRavenKey = key;
    log('raven state ->', key, `(${durationMs}ms)`);
    return wait(durationMs);
  }

  async function detectRavenMode() {
    const normalOk = await preloadImage(CONFIG.ravenSpriteMode.normal);
    if (!normalOk) {
      ravenMode = 'clip';
      log('raven-normal.png not found at', CONFIG.ravenSpriteMode.normal, '— falling back to clip-path renderer');
      await initClipFallback();
      log('renderer: CLIP (fallback)');
      return;
    }

    spriteCache.normal = CONFIG.ravenSpriteMode.normal;
    const optionalKeys = Object.keys(CONFIG.ravenSpriteMode).filter(k => k !== 'normal');
    await Promise.all(optionalKeys.map(async (key) => {
      const ok = await preloadImage(CONFIG.ravenSpriteMode[key]);
      if (ok) {
        spriteCache[key] = CONFIG.ravenSpriteMode[key];
      } else {
        spriteCache[key] = spriteCache.normal;
        log('WARNING: missing raven sprite state "' + key + '" (' + CONFIG.ravenSpriteMode[key] + ') — falling back to normal');
      }
    }));

    ravenMode = 'sprite';
    ravenLayerA.src = spriteCache.normal;
    ravenLayerA.classList.add('raven-frame-visible');
    activeLayer = 'a';
    currentRavenKey = 'normal';

    // Hide the clip-path fallback entirely — there must never be a second
    // raven visible underneath the active sprite.
    ravenOverlayEl.hidden = true;
    blinkEl.hidden = true;
    layerRavenEl.hidden = false;

    log('raven sprite assets detected — using production sprite renderer');
    log('renderer: SPRITE');
  }

  async function initClipFallback() {
    const loaded = await preloadImage(CONFIG.heroFallbackImage);
    if (loaded) {
      sceneEl.style.setProperty('--clip-hero-image', `url("${CONFIG.heroFallbackImage}")`);
    } else {
      log('clip fallback image also failed to load:', CONFIG.heroFallbackImage, '— scene will show background only, no raven');
    }
    sceneEl.style.setProperty('--raven-clip', `polygon(${CONFIG.ravenClipPath.join(', ')})`);
    sceneEl.style.setProperty('--head-anchor-x', `${CONFIG.headAnchor.x * 100}%`);
    sceneEl.style.setProperty('--head-anchor-y', `${CONFIG.headAnchor.y * 100}%`);
    sceneEl.style.setProperty('--eye-x', `${CONFIG.eyePosition.x * 100}%`);
    sceneEl.style.setProperty('--eye-y', `${CONFIG.eyePosition.y * 100}%`);
    sceneEl.style.setProperty('--eye-w', `${CONFIG.eyeSize.width * 100}%`);
    sceneEl.style.setProperty('--eye-h', `${CONFIG.eyeSize.height * 100}%`);
    ravenOverlayEl.hidden = false;
    blinkEl.hidden = false;
    layerRavenEl.hidden = true;
  }

  // ----------------------------------------------------------------
  // Background (production: raven-free cemetery scene)
  // ----------------------------------------------------------------
  async function initBackground() {
    const loaded = await preloadImage(CONFIG.heroImage);
    if (loaded) {
      sceneEl.style.setProperty('--bg-image', `url("${CONFIG.heroImage}")`);
    } else {
      log('background image failed to load:', CONFIG.heroImage, '— running with blank scene');
    }
  }

  // ----------------------------------------------------------------
  // Fog (real painted overlays — gracefully inactive if a file is missing)
  // ----------------------------------------------------------------
  let fogFarAvailable = false;
  let fogNearAvailable = false;

  async function initFog() {
    const far = await preloadImage(CONFIG.fogFarImage);
    if (far) {
      sceneEl.style.setProperty('--fog-far-image', `url("${CONFIG.fogFarImage}")`);
      fogFarAvailable = true;
    } else {
      log('fog-far asset not found (' + CONFIG.fogFarImage + ') — far fog layer stays inactive');
    }
    const near = await preloadImage(CONFIG.fogNearImage);
    if (near) {
      sceneEl.style.setProperty('--fog-near-image', `url("${CONFIG.fogNearImage}")`);
      fogNearAvailable = true;
    } else {
      log('fog-near asset not found (' + CONFIG.fogNearImage + ') — near fog layer stays inactive');
    }
  }

  // ----------------------------------------------------------------
  // Raven behaviour: blink / ruffle / head move / look-at-viewer
  // ----------------------------------------------------------------
  let busy = false;

  function withBusyGuard(fn) {
    return async (...args) => {
      if (busy || Portrait.state === 'SLEEP') return;
      busy = true;
      try { await fn(...args); } finally { busy = false; }
    };
  }

  const doBlink = withBusyGuard(async function doBlinkInner() {
    await blinkOnce();
    if (Math.random() < CONFIG.doubleBlinkChance) {
      await wait(CONFIG.doubleBlinkPauseMs);
      await blinkOnce();
    }
    log('blink');
  });

  async function blinkOnce() {
    const holdMs = randInt(CONFIG.blinkDurationMinMs, CONFIG.blinkDurationMaxMs);
    const fadeIn = randInt(CONFIG.blinkFadeInMinMs, CONFIG.blinkFadeInMaxMs);
    const fadeOut = randInt(CONFIG.blinkFadeOutMinMs, CONFIG.blinkFadeOutMaxMs);
    if (ravenMode === 'sprite') {
      await setRavenState('blink', fadeIn);
      await wait(holdMs);
      await setRavenState('normal', fadeOut);
      return;
    }
    // Clip-mode fallback: quick CSS-opacity eye patch, unrelated to sprite crossfade.
    return new Promise((resolve) => {
      blinkEl.classList.remove('blink-closing');
      blinkEl.classList.add('blink-active');
      setTimeout(() => {
        blinkEl.classList.remove('blink-active');
        blinkEl.classList.add('blink-closing');
        setTimeout(resolve, 100);
      }, holdMs);
    });
  }

  const doRuffle = withBusyGuard(async function doRuffleInner() {
    log('ruffle');
    if (ravenMode === 'sprite') {
      await setRavenState('ruffle1', randInt(CONFIG.ruffleFrameFadeMinMs, CONFIG.ruffleFrameFadeMaxMs));
      await setRavenState('ruffle2', randInt(CONFIG.ruffleFrameFadeMinMs, CONFIG.ruffleFrameFadeMaxMs));
      await setRavenState('ruffle1', randInt(CONFIG.ruffleFrameFadeMinMs, CONFIG.ruffleFrameFadeMaxMs));
      await setRavenState('normal', randInt(CONFIG.ruffleFrameFadeMinMs, CONFIG.ruffleFrameFadeMaxMs));
      return;
    }
    ravenOverlayEl.classList.add('raven-fast-transition');
    ravenOverlayEl.classList.add('raven-ruffle1'); await wait(260);
    ravenOverlayEl.classList.remove('raven-ruffle1');
    ravenOverlayEl.classList.add('raven-ruffle2'); await wait(260);
    ravenOverlayEl.classList.remove('raven-ruffle2');
    ravenOverlayEl.classList.add('raven-ruffle1'); await wait(220);
    ravenOverlayEl.classList.remove('raven-ruffle1');
    await wait(300);
    ravenOverlayEl.classList.remove('raven-fast-transition');
  });

  const doHeadMove = withBusyGuard(async function doHeadMoveInner() {
    // Deliberately only left/right here — "look at viewer" has its own
    // independent, much rarer scheduler (see doLookViewer below), so it
    // never gets folded into ordinary head-turn odds.
    const direction = pickWeighted([
      { value: 'left', weight: 1 },
      { value: 'right', weight: 1 }
    ]);
    log('head move:', direction);
    const holdMs = randInt(CONFIG.headMoveHoldMinMs, CONFIG.headMoveHoldMaxMs);
    const fadeIn = randInt(CONFIG.headMoveFadeInMinMs, CONFIG.headMoveFadeInMaxMs);
    const fadeOut = randInt(CONFIG.headMoveFadeOutMinMs, CONFIG.headMoveFadeOutMaxMs);
    if (ravenMode === 'sprite') {
      const key = direction === 'left' ? 'headLeft' : 'headRight';
      await setRavenState(key, fadeIn);
      await wait(holdMs);
      await setRavenState('normal', fadeOut);
      return;
    }
    const cls = direction === 'left' ? 'raven-headL' : 'raven-headR';
    ravenOverlayEl.classList.add(cls);
    await wait(holdMs);
    ravenOverlayEl.classList.remove(cls);
    await wait(900); // let the CSS transition settle before allowing another event
  });

  // "Look at viewer" — psychological-ambiguity event. Extremely rare by
  // design: independent scheduler (see startSchedulers), long interval,
  // and a chance to skip a scheduled attempt outright so real gaps of
  // several hours are common. Debug key 'v' can trigger it on demand for
  // testing without affecting production rarity.
  const doLookViewer = withBusyGuard(async function doLookViewerInner() {
    log('look viewer (rare event)');
    const holdMs = randInt(CONFIG.lookViewerHoldMinMs, CONFIG.lookViewerHoldMaxMs);
    const fadeIn = randInt(CONFIG.lookViewerFadeInMinMs, CONFIG.lookViewerFadeInMaxMs);
    const fadeOut = randInt(CONFIG.lookViewerFadeOutMinMs, CONFIG.lookViewerFadeOutMaxMs);
    if (ravenMode === 'sprite') {
      await setRavenState('lookViewer', fadeIn);
      await wait(holdMs);
      await setRavenState('normal', fadeOut);
      return;
    }
    ravenOverlayEl.classList.add('raven-headF');
    await wait(holdMs);
    ravenOverlayEl.classList.remove('raven-headF');
    await wait(900);
  });

  // ----------------------------------------------------------------
  // Independent random schedulers
  // ----------------------------------------------------------------
  function scheduleLoop(minUnitMs, maxUnitMs, action, label, opts) {
    const skipChance = (opts && opts.skipChance) || 0;
    const tick = () => {
      let delay = rand(minUnitMs, maxUnitMs);
      if (Math.random() < CONFIG.longQuietPeriodChance) {
        delay *= CONFIG.longQuietPeriodMultiplier;
        log(label, 'rolled a long quiet period');
      }
      const mult = STATE_MULTIPLIERS[Portrait.state] ?? 1;
      const finalDelay = mult === Infinity ? minutesToMs(60) : delay * mult;
      setTimeout(async () => {
        if (skipChance > 0 && Math.random() < skipChance) {
          log(label, 'scheduled attempt skipped');
        } else {
          await action();
        }
        tick();
      }, finalDelay);
    };
    tick();
  }

  function startSchedulers() {
    scheduleLoop(secondsToMs(CONFIG.blinkMinSeconds), secondsToMs(CONFIG.blinkMaxSeconds), doBlink, 'blink');
    scheduleLoop(minutesToMs(CONFIG.ruffleMinMinutes), minutesToMs(CONFIG.ruffleMaxMinutes), doRuffle, 'ruffle');
    scheduleLoop(minutesToMs(CONFIG.headMoveMinMinutes), minutesToMs(CONFIG.headMoveMaxMinutes), doHeadMove, 'headMove');
    scheduleLoop(minutesToMs(CONFIG.lookViewerMinMinutes), minutesToMs(CONFIG.lookViewerMaxMinutes), doLookViewer, 'lookViewer', { skipChance: CONFIG.lookViewerSkipChance });
  }

  // ----------------------------------------------------------------
  // Weather visual layers (weather.js drives these same setters once
  // latitude/longitude are configured; debug keys drive them otherwise)
  // ----------------------------------------------------------------
  let nightFlag = false;
  let overcastFlag = false;
  let rainIntensity = 0;
  let stormActive = false;
  let stormTimer = null;

  function setNight(on) {
    nightFlag = on;
    daynightEl.classList.toggle('is-night', on);
  }

  function setOvercast(intensity) {
    overcastFlag = intensity > 0;
    cloudsEl.classList.toggle('is-overcast', intensity > 0);
    cloudsEl.style.setProperty('--cloud-intensity', intensity);
    cloudsEl.style.opacity = intensity > 0 ? Math.min(1, 0.5 + intensity * 0.5) : 0;
  }

  function setFog(intensity) {
    const on = intensity > 0;
    fogFarEl.classList.toggle('fog-on', on && fogFarAvailable);
    fogNearEl.classList.toggle('fog-on', on && fogNearAvailable);
    fogFarEl.style.setProperty('--fog-intensity', clamp(intensity, 0, 1) * 0.7);
    fogNearEl.style.setProperty('--fog-intensity', clamp(intensity, 0, 1) * 0.55);
  }

  function setRain(intensity) {
    rainIntensity = clamp(intensity, 0, 1);
    rainCanvas.classList.toggle('rain-on', rainIntensity > 0);
    if (rainIntensity > 0) startRainLoop(); else stopRainLoop();
  }

  function triggerLightning(strength) {
    if (!CONFIG.lightningEnabled) return;
    lightningEl.classList.remove('flash-weak', 'flash-strong');
    // reflow to restart animation
    void lightningEl.offsetWidth;
    lightningEl.classList.add(strength === 'strong' ? 'flash-strong' : 'flash-weak');
  }

  function startStorm() {
    stormActive = true;
    const loop = () => {
      if (!stormActive) return;
      const gap = rand(4000, 45000);
      stormTimer = setTimeout(() => {
        if (!stormActive) return;
        const strength = Math.random() < 0.3 ? 'strong' : 'weak';
        triggerLightning(strength);
        if (strength === 'strong' && Math.random() < 0.25) {
          setTimeout(() => triggerLightning('weak'), rand(150, 400));
        }
        loop();
      }, gap);
    };
    loop();
  }

  function stopStorm() {
    stormActive = false;
    if (stormTimer) clearTimeout(stormTimer);
  }

  // --- Rain particle simulation (canvas, only runs while active) ---
  let rainCtx = null;
  let rainDrops = [];
  let rainRAF = null;

  function resizeRainCanvas() {
    const rect = sceneEl.getBoundingClientRect();
    rainCanvas.width = rect.width;
    rainCanvas.height = rect.height;
  }

  function startRainLoop() {
    if (rainRAF) return;
    rainCtx = rainCtx || rainCanvas.getContext('2d');
    resizeRainCanvas();
    const count = Math.round(40 + rainIntensity * 260);
    rainDrops = Array.from({ length: count }, () => spawnDrop());
    const step = () => {
      if (rainIntensity <= 0) { rainRAF = null; return; }
      drawRain();
      rainRAF = requestAnimationFrame(step);
    };
    rainRAF = requestAnimationFrame(step);
  }

  function stopRainLoop() {
    if (rainRAF) { cancelAnimationFrame(rainRAF); rainRAF = null; }
    if (rainCtx) rainCtx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);
  }

  function spawnDrop() {
    const w = rainCanvas.width, h = rainCanvas.height;
    const angle = 12 + rainIntensity * 10; // more slant as it gets heavier
    return {
      x: rand(0, w + h * Math.tan(angle * Math.PI / 180)),
      y: rand(-h, 0),
      len: rand(10, 22) * (0.6 + rainIntensity * 0.8),
      speed: rand(6, 10) * (0.6 + rainIntensity),
      angle,
      opacity: rand(0.08, 0.22)
    };
  }

  function drawRain() {
    const w = rainCanvas.width, h = rainCanvas.height;
    rainCtx.clearRect(0, 0, w, h);
    rainCtx.strokeStyle = 'rgba(200,210,225,1)';
    rainCtx.lineCap = 'round';
    for (const d of rainDrops) {
      const rad = d.angle * Math.PI / 180;
      const dx = Math.sin(rad) * d.len;
      const dy = Math.cos(rad) * d.len;
      rainCtx.globalAlpha = d.opacity;
      rainCtx.lineWidth = 1;
      rainCtx.beginPath();
      rainCtx.moveTo(d.x, d.y);
      rainCtx.lineTo(d.x + dx, d.y + dy);
      rainCtx.stroke();
      d.x += Math.sin(rad) * d.speed;
      d.y += Math.cos(rad) * d.speed;
      if (d.y > h) { Object.assign(d, spawnDrop(), { y: rand(-40, 0) }); }
    }
    rainCtx.globalAlpha = 1;
  }

  window.addEventListener('resize', resizeRainCanvas);

  // ----------------------------------------------------------------
  // Burn-in protection
  // ----------------------------------------------------------------
  function initBurnInProtection() {
    if (!CONFIG.burnInProtection) return;
    sceneEl.style.setProperty('--burn-in-minutes', CONFIG.burnInCycleMinutes);
    sceneEl.style.setProperty('--drift-px', `${CONFIG.burnInDriftPixels}px`);
    sceneEl.classList.add('burn-in-drift');
  }

  // ----------------------------------------------------------------
  // Fullscreen (best effort — Silk/Fire TV may require a first tap)
  // ----------------------------------------------------------------
  function tryFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  }
  window.addEventListener('load', tryFullscreen);
  window.addEventListener('click', tryFullscreen, { once: true });
  window.addEventListener('keydown', tryFullscreen, { once: true });

  // ----------------------------------------------------------------
  // Public API for weather.js / audio.js / future integrations
  // ----------------------------------------------------------------
  window.RavenPortrait = {
    setRain, setFog, setNight, setOvercast, triggerLightning,
    setPortraitState: (s) => Portrait.setState(s),
    getPortraitState: () => Portrait.state,
    getRavenMode: () => ravenMode,
    getRavenState: () => currentRavenKey,
    log
  };

  // ----------------------------------------------------------------
  // Debug mode
  // ----------------------------------------------------------------
  let calibrationMode = false;

  function initDebug() {
    if (!CONFIG.debug) return;
    debugPanel.hidden = false;
    log('debug mode enabled');

    window.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'b': doBlink(); break;
        case 'r': doRuffle(); break;
        case 'h': doHeadMove(); break;
        case 'v': doLookViewer(); break;
        case 'l': triggerLightning(Math.random() < 0.5 ? 'weak' : 'strong'); break;
        case '1': setRain(rainIntensity > 0 ? 0 : 0.6); break;
        case '2': setFog(0.7); break;
        case '3': setNight(!nightFlag); break;
        case '4': stormActive ? (stopStorm(), setRain(0)) : (startStorm(), setRain(0.8), setOvercast(0.8), setNight(true)); break;
        case '0':
          setRain(0); setFog(0); setNight(false); setOvercast(0); stopStorm();
          log('reset visual state'); break;
        case 'a': Portrait.setState('ACTIVE'); break;
        case 'i': Portrait.setState('IDLE'); break;
        case 's': Portrait.setState('SLEEP'); break;
        case 'w': Portrait.setState('AWAY'); break;
        case 'c':
          calibrationMode = !calibrationMode;
          log('calibration mode', calibrationMode ? 'ON — click the scene' : 'off');
          break;
        case 'd':
          debugPanel.hidden = !debugPanel.hidden;
          break;
      }
    });

    sceneEl.addEventListener('click', (e) => {
      if (!calibrationMode) return;
      const rect = sceneEl.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
      const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
      log(`'${x}% ${y}%',`);
    });
  }

  // ----------------------------------------------------------------
  // Boot
  // ----------------------------------------------------------------
  async function boot() {
    await initBackground();
    await initFog();
    await detectRavenMode();
    initBurnInProtection();
    initDebug();
    startSchedulers();
    if (window.Weather && typeof window.Weather.init === 'function') window.Weather.init();
    if (window.RavenAudio && typeof window.RavenAudio.init === 'function') window.RavenAudio.init();
    log('boot complete — renderer:', ravenMode.toUpperCase(), '| raven state:', currentRavenKey,
      '| fog far:', fogFarAvailable, '| fog near:', fogNearAvailable);
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
