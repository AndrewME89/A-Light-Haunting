(function () {
  'use strict';

  const STATES = Object.freeze({ ACTIVE: 'ACTIVE', IDLE: 'IDLE', SLEEP: 'SLEEP', AWAY: 'AWAY' });
  const stateAssets = Object.freeze({
    normal: 'assets/raven/normal.svg',
    blink: 'assets/raven/blink.svg',
    'ruffle-1': 'assets/raven/ruffle-01.svg',
    'ruffle-2': 'assets/raven/ruffle-02.svg',
    'head-left': 'assets/raven/head-left.svg',
    'head-right': 'assets/raven/head-right.svg'
  });
  const image = document.getElementById('raven-image');
  const raven = document.getElementById('raven');
  const panel = document.getElementById('debug-panel');
  const timers = new Set();
  let portraitState = STATES.ACTIVE;
  let actionRunning = false;

  Object.keys(stateAssets).forEach(function (state) {
    const preload = new Image();
    preload.src = stateAssets[state];
  });

  function randomBetween(min, max) { return min + Math.random() * (max - min); }
  function sleep(ms) { return new Promise(function (resolve) { window.setTimeout(resolve, ms); }); }
  function setRavenState(state) {
    image.src = stateAssets[state] || stateAssets.normal;
    raven.className = 'raven raven--' + state;
  }

  async function blink() {
    if (actionRunning || portraitState !== STATES.ACTIVE) return;
    actionRunning = true;
    setRavenState('blink');
    await sleep(randomBetween(CONFIG.blinkMinDurationMs, CONFIG.blinkMaxDurationMs));
    setRavenState('normal');
    if (Math.random() < CONFIG.doubleBlinkChance) {
      await sleep(randomBetween(170, 390));
      setRavenState('blink');
      await sleep(randomBetween(CONFIG.blinkMinDurationMs, CONFIG.blinkMaxDurationMs));
      setRavenState('normal');
    }
    actionRunning = false;
  }

  async function ruffle() {
    if (actionRunning || portraitState !== STATES.ACTIVE) return;
    actionRunning = true;
    for (const step of [['ruffle-1', 180], ['ruffle-2', 230], ['ruffle-1', 190], ['normal', 0]]) {
      setRavenState(step[0]);
      await sleep(step[1]);
    }
    actionRunning = false;
  }

  async function moveHead(forcedDirection) {
    if (actionRunning || portraitState !== STATES.ACTIVE) return;
    actionRunning = true;
    setRavenState(forcedDirection || (Math.random() < 0.5 ? 'head-left' : 'head-right'));
    await sleep(randomBetween(900, 2400));
    setRavenState('normal');
    actionRunning = false;
  }

  function schedule(name, minMs, maxMs, action) {
    let delay = randomBetween(minMs, maxMs);
    if (name !== 'blink' && Math.random() < CONFIG.longQuietPeriodChance) delay *= CONFIG.longQuietPeriodMultiplier;
    const timer = window.setTimeout(async function () {
      timers.delete(timer);
      await action();
      schedule(name, minMs, maxMs, action);
    }, delay);
    timers.add(timer);
  }

  function exposeIntegrationHook() {
    window.HauntedPortrait = Object.freeze({
      states: STATES,
      getState: function () { return portraitState; },
      setState: function (nextState) {
        if (!STATES[nextState]) return false;
        portraitState = STATES[nextState];
        document.body.dataset.portraitState = portraitState.toLowerCase();
        if (portraitState !== STATES.ACTIVE) setRavenState('normal');
        return true;
      }
    });
  }

  function setupDebug() {
    if (!CONFIG.debug) return;
    panel.hidden = false;
    const actions = { blink, ruffle, 'head-left': function () { return moveHead('head-left'); }, 'head-right': function () { return moveHead('head-right'); }, normal: function () { actionRunning = false; setRavenState('normal'); } };
    panel.addEventListener('click', function (event) {
      const button = event.target.closest('button');
      if (button && actions[button.dataset.action]) actions[button.dataset.action]();
    });
    document.addEventListener('keydown', function (event) {
      const keyActions = { b: blink, r: ruffle, n: actions.normal, ArrowLeft: actions['head-left'], ArrowRight: actions['head-right'] };
      if (keyActions[event.key]) keyActions[event.key]();
    });
  }

  if (!CONFIG.burnInProtection) document.body.classList.add('no-drift');
  exposeIntegrationHook();
  setupDebug();
  schedule('blink', CONFIG.blinkMinSeconds * 1000, CONFIG.blinkMaxSeconds * 1000, blink);
  schedule('ruffle', CONFIG.ruffleMinMinutes * 60000, CONFIG.ruffleMaxMinutes * 60000, ruffle);
  schedule('head', CONFIG.headMoveMinMinutes * 60000, CONFIG.headMoveMaxMinutes * 60000, moveHead);

  window.addEventListener('beforeunload', function () { timers.forEach(window.clearTimeout); });
}());
