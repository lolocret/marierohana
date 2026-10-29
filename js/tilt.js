// tilt.js: tilt the phone to choose. Right = KEEP a card / next pack, left = PASS / previous pack.
// Reads DeviceOrientationEvent.gamma (left / right lean), smooths it, measures it from the position
// the phone had when the card appeared, and decides when the lean passes 25 degrees for 400 ms.
// After a decision the phone must come back flat before the next card can be judged.
// On a computer the left / right arrow keys play the lean. Without a gyroscope the card can be swiped.

(function () {
  window.App = window.App || {};

  const LIMIT = 25; // degrees
  const HOLD_MS = 400;
  const FLAT = 8; // back to flat means within this
  const CALIBRATE_WITHIN = 12; // the zero only moves if the phone is near it
  const SMOOTH = 6;

  let raw = [];
  let hasGyro = false;
  let zero = null;
  let keyLean = 0;
  let keyTarget = 0;
  let armed = false;
  let overSince = 0;
  let running = false;
  let handlers = null;

  window.addEventListener('deviceorientation', function (event) {
    if (event.gamma === null || event.gamma === undefined) return;
    hasGyro = true;
    if (zero === null && handlers) zero = event.gamma; // the sensor was allowed after the screen began: its first reading is the zero
    raw.push(event.gamma);
    if (raw.length > SMOOTH) raw.shift();
  });

  function smoothed() {
    return raw.length ? App.utils.average(raw) : 0;
  }

  function lean() {
    const gyro = hasGyro && zero !== null ? smoothed() - zero : 0;
    return App.utils.clamp(gyro + keyLean, -50, 50);
  }

  window.addEventListener('keydown', function (event) {
    if (!handlers) return;
    if (event.key === 'ArrowRight') keyTarget = 32;
    if (event.key === 'ArrowLeft') keyTarget = -32;
  });
  window.addEventListener('keyup', function (event) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') keyTarget = 0;
  });

  function frame(now) {
    if (!running) return;
    keyLean += (keyTarget - keyLean) * 0.25;
    const value = lean();
    const busy = handlers.busy();

    handlers.lean(value);

    if (!armed && Math.abs(value) < FLAT && !busy) armed = true;

    if (armed && Math.abs(value) > LIMIT && !busy) {
      if (!overSince) overSince = now;
      if (now - overSince > HOLD_MS) {
        armed = false;
        overSince = 0;
        handlers.decide(value > 0);
      }
    } else {
      overSince = 0;
    }
    requestAnimationFrame(frame);
  }

  App.tilt = {
    // iPhones ask permission, and only inside a tap. Other phones do not have this function.
    request() {
      try {
        if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) {
          return DeviceOrientationEvent.requestPermission().catch(function () {});
        }
      } catch {
        // No sensor permission to ask.
      }
      return Promise.resolve();
    },

    // The screen says what to do with the lean: lean(value) every frame, decide(toTheRight) when it
    // is held, busy() while it must not decide.
    enter(screenHandlers) {
      handlers = screenHandlers;
      App.state.set('input', hasGyro ? 'tilt' : 'swipe');
      App.tilt.calibrate();
      if (!running) {
        running = true;
        requestAnimationFrame(frame);
      }
    },

    // Called when a card appears: the phone is never perfectly flat, so its position now is the zero.
    calibrate() {
      armed = false;
      overSince = 0;
      if (hasGyro && (zero === null || Math.abs(smoothed() - zero) < CALIBRATE_WITHIN)) zero = smoothed();
    },

    stop() {
      running = false;
      handlers = null;
      keyTarget = 0;
    }
  };
})();
