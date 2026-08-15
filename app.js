/**
 * Haunted Raven Portrait — core application.
 *
 * Architecture notes:
 *  - Everything timing-related uses recursive setTimeout with fresh random
 *    delays each time (never setInterval), so no two events share a phase
 *    and the viewer can't learn a rhythm.
 *  - The raven rests as ONE static image (assets/raven/raven-normal.png).
 *    Gestures (blink, ruffle, head-move, subtle, look-viewer) are short
 *    pre-rendered video clips (assets/raven/video/*.mp4). Each clip sits
 *    on a flat black or white background with no alpha channel, so at
 *    playback a small WebGL shader keys that flat colour out in real
 *    time and composites just the raven over the cemetery background —
 *    see initRavenVideoGL()/playGestureVideo() below, and README "How the
 *    raven animates" for the one known limitation (very dark shadow
 *    feathers on the black-keyed clips are close to the same colour as
 *    the background in that footage).
 *  - window.RavenPortrait is the public surface future modules (weather,
 *    audio, house integration) call into.
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
  const ravenBaseEl = document.getElementById('raven-base');
  const ravenVideoCanvas = document.getElementById('raven-video-canvas');
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
  // Raven — static resting image
  // ----------------------------------------------------------------
  let ravenLoaded = false;
  let currentGesture = 'normal'; // debug-only label

  function preloadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth > 0 ? img : null);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  async function initRaven() {
    const loaded = await preloadImage(CONFIG.ravenImage);
    if (!loaded) {
      log('WARNING: raven image failed to load at', CONFIG.ravenImage, '— scene will show the cemetery with no raven');
      return;
    }
    sceneEl.style.setProperty('--raven-image', `url("${CONFIG.ravenImage}")`);
    sceneEl.style.setProperty('--raven-crossfade-ms', CONFIG.ravenVideoCrossfadeMs + 'ms');
    ravenLoaded = true;
    log('raven image loaded');
  }

  // ----------------------------------------------------------------
  // Background (raven-free cemetery scene)
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
  // Raven gesture videos — WebGL real-time luma-key compositor
  // ----------------------------------------------------------------
  const videoEls = {
    blink: document.getElementById('video-blink'),
    ruffle: document.getElementById('video-ruffle'),
    headLeft: document.getElementById('video-headLeft'),
    lookViewer: document.getElementById('video-lookViewer'),
    subtle: document.getElementById('video-subtle')
  };
  const videoAvailable = {};

  let gl = null;
  let glProgram = null;
  let glTexture = null;
  const glUniforms = {};
  let glReady = false;

  const VERTEX_SRC = `
    attribute vec2 aPosition;
    varying vec2 vBaseUV;
    void main() {
      vBaseUV = aPosition * 0.5 + 0.5;
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  // Keys out a flat black or white background in real time. Distance from
  // the key colour is measured as luminance (or 1-luminance for white),
  // then smoothstep'd between uKeyLow/uKeyHigh into an alpha value — a
  // tight band so it only clears genuinely flat background, not merely
  // dark/light raven pixels. uWatermarkCrop forces the bottom-right corner
  // (where two of the source clips have a burned-in tool watermark)
  // fully transparent regardless of colour.
  const FRAGMENT_SRC = `
    precision mediump float;
    varying vec2 vBaseUV;
    uniform sampler2D uVideo;
    uniform vec2 uUVScale;
    uniform vec2 uUVOffset;
    uniform float uKeyMode;
    uniform float uKeyLow;
    uniform float uKeyHigh;
    uniform vec2 uWatermarkCrop;
    void main() {
      vec2 uv = vBaseUV * uUVScale + uUVOffset;
      vec4 color = texture2D(uVideo, uv);
      float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      float dist = uKeyMode < 0.5 ? lum : (1.0 - lum);
      float alpha = smoothstep(uKeyLow, uKeyHigh, dist);
      // uWatermarkCrop.y is authored as "fraction down from the top" (the
      // usual image convention), but uv.y here runs bottom-up (GL
      // convention), so the bottom-right corner is uv.x high / uv.y LOW.
      if (uv.x > uWatermarkCrop.x && uv.y < (1.0 - uWatermarkCrop.y)) {
        alpha = 0.0;
      }
      gl_FragColor = vec4(color.rgb, alpha);
    }
  `;

  function compileShader(type, src) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      log('WARNING: raven video shader failed to compile:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function initRavenVideoGL() {
    gl = ravenVideoCanvas.getContext('webgl', { alpha: true, premultipliedAlpha: false })
      || ravenVideoCanvas.getContext('experimental-webgl', { alpha: true, premultipliedAlpha: false });
    if (!gl) {
      log('WARNING: WebGL unavailable — raven gesture videos disabled, raven will stay static');
      return false;
    }
    const vs = compileShader(gl.VERTEX_SHADER, VERTEX_SRC);
    const fs = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SRC);
    if (!vs || !fs) return false;

    glProgram = gl.createProgram();
    gl.attachShader(glProgram, vs);
    gl.attachShader(glProgram, fs);
    gl.linkProgram(glProgram);
    if (!gl.getProgramParameter(glProgram, gl.LINK_STATUS)) {
      log('WARNING: raven video shader program failed to link:', gl.getProgramInfoLog(glProgram));
      return false;
    }
    gl.useProgram(glProgram);

    const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
    const aPosition = gl.getAttribLocation(glProgram, 'aPosition');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    glTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, glTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    glUniforms.uVideo = gl.getUniformLocation(glProgram, 'uVideo');
    glUniforms.uUVScale = gl.getUniformLocation(glProgram, 'uUVScale');
    glUniforms.uUVOffset = gl.getUniformLocation(glProgram, 'uUVOffset');
    glUniforms.uKeyMode = gl.getUniformLocation(glProgram, 'uKeyMode');
    glUniforms.uKeyLow = gl.getUniformLocation(glProgram, 'uKeyLow');
    glUniforms.uKeyHigh = gl.getUniformLocation(glProgram, 'uKeyHigh');
    glUniforms.uWatermarkCrop = gl.getUniformLocation(glProgram, 'uWatermarkCrop');

    gl.uniform2f(glUniforms.uWatermarkCrop, CONFIG.ravenVideoWatermarkCrop.x, CONFIG.ravenVideoWatermarkCrop.y);

    return true;
  }

  // Replicates CSS `background-size: cover` — scales+crops (never
  // stretches) so the video fills the box, matching how raven-base sits.
  function computeCoverUV(videoW, videoH, boxW, boxH) {
    const videoAspect = videoW / videoH;
    const boxAspect = boxW / boxH;
    if (videoAspect > boxAspect) {
      const visibleWidth = boxAspect / videoAspect;
      return { scaleX: visibleWidth, scaleY: 1, offsetX: (1 - visibleWidth) / 2, offsetY: 0 };
    }
    const visibleHeight = videoAspect / boxAspect;
    return { scaleX: 1, scaleY: visibleHeight, offsetX: 0, offsetY: (1 - visibleHeight) / 2 };
  }

  function drawGLFrame(videoEl, uv) {
    gl.viewport(0, 0, ravenVideoCanvas.width, ravenVideoCanvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, glTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoEl);
    gl.uniform1i(glUniforms.uVideo, 0);
    gl.uniform2f(glUniforms.uUVScale, uv.scaleX, uv.scaleY);
    gl.uniform2f(glUniforms.uUVOffset, uv.offsetX, uv.offsetY);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  async function initRavenVideos() {
    glReady = initRavenVideoGL();
    if (!glReady) return;

    const keys = Object.keys(CONFIG.ravenVideos);
    await Promise.all(keys.map((key) => new Promise((resolve) => {
      const cfg = CONFIG.ravenVideos[key];
      const el = videoEls[key];
      if (!el) { videoAvailable[key] = false; resolve(); return; }
      function onReady() { videoAvailable[key] = true; cleanup(); resolve(); }
      function onError() {
        videoAvailable[key] = false;
        log('WARNING: missing/failed raven gesture video "' + key + '" (' + cfg.src + ') — that gesture will be skipped');
        cleanup(); resolve();
      }
      function cleanup() {
        el.removeEventListener('loadeddata', onReady);
        el.removeEventListener('error', onError);
      }
      el.addEventListener('loadeddata', onReady);
      el.addEventListener('error', onError);
      el.src = cfg.src;
    })));

    const readyCount = Object.values(videoAvailable).filter(Boolean).length;
    log('raven gesture videos ready:', readyCount + '/' + keys.length);
    log('renderer: VIDEO (WebGL)');
  }

  function playGestureVideo(key) {
    return new Promise((resolve) => {
      const cfg = CONFIG.ravenVideos[key];
      const el = videoEls[key];
      if (!glReady || !cfg || !el || !videoAvailable[key]) { resolve(); return; }

      ravenVideoCanvas.width = ravenVideoCanvas.clientWidth;
      ravenVideoCanvas.height = ravenVideoCanvas.clientHeight;
      const uv = computeCoverUV(el.videoWidth, el.videoHeight, ravenVideoCanvas.clientWidth, ravenVideoCanvas.clientHeight);

      const threshold = CONFIG.ravenVideoKeyThreshold[cfg.key] || CONFIG.ravenVideoKeyThreshold.black;
      gl.useProgram(glProgram);
      gl.uniform1f(glUniforms.uKeyMode, cfg.key === 'white' ? 1 : 0);
      gl.uniform1f(glUniforms.uKeyLow, threshold.low);
      gl.uniform1f(glUniforms.uKeyHigh, threshold.high);

      ravenBaseEl.classList.add('raven-base-hidden');
      ravenVideoCanvas.classList.add('raven-video-active');

      let rafId = null;
      function onEnded() {
        if (rafId) cancelAnimationFrame(rafId);
        el.removeEventListener('ended', onEnded);
        ravenVideoCanvas.classList.remove('raven-video-active');
        ravenBaseEl.classList.remove('raven-base-hidden');
        setTimeout(resolve, CONFIG.ravenVideoCrossfadeMs);
      }
      function frame() {
        if (el.paused || el.ended) return;
        drawGLFrame(el, uv);
        rafId = requestAnimationFrame(frame);
      }
      el.addEventListener('ended', onEnded);
      el.currentTime = 0;
      el.play().then(() => {
        rafId = requestAnimationFrame(frame);
      }).catch(() => onEnded());
    });
  }

  // ----------------------------------------------------------------
  // Raven behaviour: blink / ruffle / head move / subtle / look-at-viewer
  // ----------------------------------------------------------------
  let busy = false;

  function withBusyGuard(fn) {
    return async (...args) => {
      if (busy || Portrait.state === 'SLEEP' || !ravenLoaded) return;
      busy = true;
      try { await fn(...args); } finally { busy = false; }
    };
  }

  function makeGesture(key, label, gestureName) {
    return withBusyGuard(async () => {
      log(label);
      currentGesture = gestureName;
      await playGestureVideo(key);
      currentGesture = 'normal';
    });
  }

  const doBlink = makeGesture('blink', 'blink', 'blink');
  const doRuffle = makeGesture('ruffle', 'ruffle', 'ruffle');
  // Only ever turns left — there is no head-right clip.
  const doHeadMove = makeGesture('headLeft', 'head move: left', 'head-left');
  const doSubtle = makeGesture('subtle', 'subtle shift', 'subtle');
  // "Look at viewer" — psychological-ambiguity event. Extremely rare by
  // design: independent scheduler (see startSchedulers), long interval,
  // and a chance to skip a scheduled attempt outright so real gaps of
  // several hours are common. Debug key 'v' can trigger it on demand for
  // testing without affecting production rarity.
  const doLookViewer = makeGesture('lookViewer', 'look viewer (rare event)', 'look-viewer');

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
    scheduleLoop(minutesToMs(CONFIG.subtleMinMinutes), minutesToMs(CONFIG.subtleMaxMinutes), doSubtle, 'subtle');
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
    isRavenLoaded: () => ravenLoaded,
    getRavenGesture: () => currentGesture,
    isGestureVideoReady: (key) => !!videoAvailable[key],
    log
  };

  // ----------------------------------------------------------------
  // Debug mode
  // ----------------------------------------------------------------
  function initDebug() {
    if (!CONFIG.debug) return;
    debugPanel.hidden = false;
    log('debug mode enabled');

    window.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'b': doBlink(); break;
        case 'r': doRuffle(); break;
        case 'h': doHeadMove(); break;
        case 'u': doSubtle(); break;
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
        case 'd':
          debugPanel.hidden = !debugPanel.hidden;
          break;
      }
    });
  }

  // ----------------------------------------------------------------
  // Boot
  // ----------------------------------------------------------------
  async function boot() {
    await initBackground();
    await initFog();
    await initRaven();
    await initRavenVideos();
    initBurnInProtection();
    initDebug();
    startSchedulers();
    if (window.Weather && typeof window.Weather.init === 'function') window.Weather.init();
    if (window.RavenAudio && typeof window.RavenAudio.init === 'function') window.RavenAudio.init();
    log('boot complete — raven loaded:', ravenLoaded, '| webgl:', glReady,
      '| fog far:', fogFarAvailable, '| fog near:', fogNearAvailable);
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
