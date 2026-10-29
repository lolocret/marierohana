// hand.js: unzip with a hand in front of the front camera, without touching the screen.
// ml5.js handPose finds the hand; a pinch (thumb tip + index tip) near the slider grabs it,
// and while the pinch is held the slider follows the hand's height.
// A mouse can play the hand (demo mode): moving = the hand, mouse button down = the pinch.

(function () {
  window.App = window.App || {};

  const HISTORY = 5; // positions averaged, so the cursor does not tremble
  const LOST_MS = 300; // a hand lost for less than this is ignored
  const NEAR_PX = 130; // a pinch this close to the slider grabs it at once
  const GRAB_ANYWHERE_MS = 400; // a pinch held elsewhere grabs it too: the hand then pulls by how far it moves
  const NO_HAND_MS = 5000; // then "USE YOUR FINGER" is offered

  const stage = document.querySelector('.phone');
  const cursor = document.querySelector('[data-hand-cursor]');
  const video = document.querySelector('[data-camera-video]');

  let source = null; // 'camera' or 'mouse'
  let stream = null;
  let model = null;
  let xs = [];
  let ys = [];
  let lastSeen = 0;
  let pinched = false;
  let grabbed = false;
  let grabOffset = 0;
  let everSeen = false;
  let offerTimer = 0;
  let pinchSince = 0;
  let frames = 0;
  let handsSeen = 0;
  let lastRatio = 0;
  let modelState = 'no model';
  const debug = document.querySelector('[data-hand-debug]');
  const NO_FRAMES_MS = 7000; // the model is loaded but sends nothing: try the other one
  const NO_HAND_LONG_MS = 12000; // the model sees no hand for this long: try the other one
  // ?tfjs or ?mediapipe in the address chooses the first model
  const order = /tfjs/.test(location.search) ? ['tfjs', 'mediapipe']
    : /mediapipe/.test(location.search) || matchMedia('(pointer: coarse)').matches ? ['mediapipe', 'tfjs'] : ['tfjs', 'mediapipe'];
  let attempt = 0;
  let runtime = order[0];
  let readyAt = 0;
  let watchTimer = 0;

  function setStatus(text) {
    if (App.state.get('unzipStatus') !== text) App.state.set('unzipStatus', text);
  }

  function lose() {
    xs = [];
    ys = [];
    pinched = false;
    grabbed = false;
    cursor.hidden = true;
    if (source && !App.booster.isOpen()) setStatus('RAISE YOUR HAND');
  }

  // One reading of the hand: x and y between 0 and 1 (already mirrored), ratio of the pinch.
  // `null` = no hand seen.
  function feed(reading) {
    if (App.booster.isOpen()) return;
    const now = performance.now();
    if (!reading) {
      if (now - lastSeen > LOST_MS && !cursor.hidden) lose();
      return;
    }
    lastSeen = now;
    everSeen = true;
    clearTimeout(offerTimer);

    xs.push(reading.x);
    ys.push(reading.y);
    if (xs.length > HISTORY) {
      xs.shift();
      ys.shift();
    }
    const box = stage.getBoundingClientRect();
    const x = box.left + App.utils.average(xs) * box.width;
    const y = box.top + App.utils.average(ys) * box.height;

    const rawX = box.left + reading.x * box.width;
    const rawY = box.top + reading.y * box.height;
    const wasPinched = pinched;
    lastRatio = reading.ratio;
    pinched = App.utils.isPinched(reading.ratio, pinched);
    if (pinched && !wasPinched) pinchSince = now;

    cursor.hidden = false;
    const scale = box.width / stage.offsetWidth || 1; // the phone may be scaled on a laptop
    cursor.style.left = (x - box.left) / scale + 'px';
    cursor.style.top = (y - box.top) / scale + 'px';
    cursor.classList.toggle('is-pinched', pinched);


    // a pinch that starts near the slider grabs it
    const tab = App.booster.tabCenter();
    const near = Math.min(Math.hypot(x - tab.x, y - tab.y), Math.hypot(rawX - tab.x, rawY - tab.y));
    if (pinched && !wasPinched && near < NEAR_PX) {
      grabbed = true;
      grabOffset = y - tab.y;
      App.feedback.buzz(8);
    }
    if (pinched && !grabbed && now - pinchSince > GRAB_ANYWHERE_MS) {
      grabbed = true;
      grabOffset = y - tab.y;
      App.feedback.buzz(8);
    }
    if (!pinched) grabbed = false;

    if (grabbed) {
      App.booster.setProgress(App.booster.progressAt(y, grabOffset));
      setStatus('PULL DOWN');
    } else {
      setStatus(pinched ? 'HOLD THE PINCH' : 'PINCH THE ZIP');
    }
  }

  // Two hand models can run: tfjs and mediapipe. On a phone mediapipe goes first (tfjs may pick the
  // WebGPU of recent iPhones and find no hand). If a model sends nothing, or sees no hand for a long
  // time, the next one is tried.
  function loadModel() {
    runtime = order[attempt % order.length];
    modelState = 'loading ' + runtime;
    setStatus('LOADING HAND TRACKING');
    showDebug();
    frames = 0;
    try {
      if (runtime === 'tfjs' && ml5.setBackend) ml5.setBackend('webgl');
    } catch {
      // keep the default backend
    }
    model = ml5.handPose({ maxHands: 1, flipped: true, runtime }, function () {
      modelState = 'ready ' + runtime;
      readyAt = performance.now();
      // the hand model is big: the 5 seconds start once it is loaded
      clearTimeout(offerTimer);
      offerTimer = setTimeout(function () {
        if (!everSeen) offerFinger();
      }, NO_HAND_MS);
      setStatus('RAISE YOUR HAND');
      model.detectStart(video, readHands);
      watch();
    });
  }

  function tryNextModel() {
    if (model && model.detectStop) model.detectStop();
    attempt += 1;
    loadModel();
  }

  function watch() {
    clearTimeout(watchTimer);
    watchTimer = setTimeout(function () {
      if (!source || App.booster.isOpen() || everSeen) return;
      // nothing received, or nothing found for a long while: the other model, once for each
      if (attempt < order.length - 1 && (frames === 0 || performance.now() - readyAt > NO_HAND_LONG_MS)) {
        tryNextModel();
        return;
      }
      setStatus('RAISE YOUR HAND');
      showDebug();
      watchTimer = setTimeout(watch, 4000);
    }, NO_FRAMES_MS);
  }

  // Add ?debug to the address to see what the camera finds.  ?mediapipe tries the other hand model.
  if (/debug/.test(location.search)) debug.hidden = false;

  function showDebug() {
    if (debug.hidden) return;
    debug.textContent = 'MODEL ' + modelState + ' / VIDEO ' + video.videoWidth + 'x' + video.videoHeight +
      ' / FRAMES ' + frames + ' / HANDS ' + handsSeen + ' / PINCH ' + lastRatio.toFixed(2) + (pinched ? ' ON' : '') + (grabbed ? ' GRAB' : '');
  }

  function offerFinger(reason) {
    if (App.booster.isOpen()) return;
    App.state.set('fingerOffer', true);
    if (reason) App.feedback.toast(reason);
  }

  // camera + hand model
  function readHands(hands) {
    frames += 1;
    const hand = hands && hands[0];
    if (hand) handsSeen += 1;
    showDebug();
    if (!hand || !video.videoWidth) {
      feed(null);
      return;
    }
    const p = hand.keypoints;
    // flipped: true in ml5 already mirrors x, as the front camera shows you
    feed({
      x: p[8].x / video.videoWidth,
      y: p[8].y / video.videoHeight,
      ratio: App.utils.pinchRatio(p[4], p[8], p[0], p[9])
    });
  }

  async function startCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 640 } },
        audio: false
      });
    } catch {
      offerFinger('CAMERA UNAVAILABLE / USE YOUR FINGER');
      return;
    }
    video.classList.add('is-live'); // a small mirrored preview: you see what the camera sees
    video.srcObject = stream;
    await video.play().catch(function () {});
    // ml5 scales the hand points with the size of the <video> element: without it every point is NaN
    video.width = video.videoWidth;
    video.height = video.videoHeight;
    if (typeof ml5 === 'undefined' || !ml5.handPose) {
      offerFinger('HAND TRACKING UNAVAILABLE / USE YOUR FINGER');
      return;
    }
    source = 'camera';
    loadModel();
  }

  // mouse as a hand
  function mouseReading(event, down) {
    const box = stage.getBoundingClientRect();
    return {
      x: (event.clientX - box.left) / box.width,
      y: (event.clientY - box.top) / box.height,
      ratio: down ? 0.1 : 1
    };
  }

  function listenToMouse() {
    let down = false;
    stage.addEventListener('pointermove', function (event) {
      if (source === 'mouse') feed(mouseReading(event, down));
    });
    stage.addEventListener('pointerdown', function (event) {
      down = true;
      if (source === 'mouse') feed(mouseReading(event, true));
    });
    window.addEventListener('pointerup', function (event) {
      down = false;
      if (source === 'mouse') feed(mouseReading(event, false));
    });
    stage.addEventListener('pointerleave', function () {
      if (source === 'mouse') {
        lastSeen = 0;
        feed(null);
      }
    });
  }

  listenToMouse();

  App.hand = {
    // The one tap: camera and tilt sensor are asked together (iPhone wants it inside the tap).
    async startWithCamera() {
      App.feedback.init();
      const motion = App.tilt.request();
      App.state.set('unzipStarted', true);
      App.feedback.play('incoming');
      setStatus('RAISE YOUR HAND');
      everSeen = false;
      offerTimer = setTimeout(function () {
        if (!everSeen) offerFinger();
      }, NO_HAND_MS);
      await Promise.all([startCamera(), motion]);
    },

    startWithMouse() {
      App.feedback.init();
      source = 'mouse';
      App.feedback.play('incoming');
      App.state.set('unzipStarted', true);
      setStatus('RAISE YOUR HAND');
    },

    useFinger() {
      clearTimeout(offerTimer);
      App.hand.stop();
      App.state.set('fingerMode', true);
      App.state.set('fingerOffer', false);
      setStatus('PULL THE ZIP DOWN');
    },

    // Camera off as soon as the hoodie is open (or when starting again).
    stop() {
      clearTimeout(offerTimer);
      clearTimeout(watchTimer);
      video.classList.remove('is-live');
      if (model && model.detectStop) model.detectStop();
      model = null;
      if (stream) stream.getTracks().forEach(function (track) { track.stop(); });
      stream = null;
      source = null;
      xs = [];
      ys = [];
      pinched = false;
      grabbed = false;
      cursor.hidden = true;
    },

    // Used by the test page to feed a hand without a camera.
    feed
  };
})();
