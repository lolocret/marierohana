// utils.js: small helpers that only turn an input into an output.
// They never touch the page and never touch the state.

(function () {
  window.App = window.App || {};

  App.utils = {
    // The day, to know that today's drop is spent.
    today() {
      return new Date().toISOString().slice(0, 10);
    },

    clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    },

    pad(number) {
      return String(number).padStart(2, '0');
    },

    pick(list) {
      return list[Math.floor(Math.random() * list.length)];
    },

    // Pinch = thumb tip (point 4) close to index tip (point 8). The gap is divided by the size of the
    // palm (wrist point 0 to the base of the middle finger, point 9), so it works near or far from the camera.
    pinchRatio(thumb, index, wrist, middleBase) {
      const palm = Math.hypot(wrist.x - middleBase.x, wrist.y - middleBase.y);
      return palm ? Math.hypot(thumb.x - index.x, thumb.y - index.y) / palm : Infinity;
    },

    // Hysteresis: it takes a tighter pinch to start than to keep, so the grip does not flicker.
    isPinched(ratio, wasPinched) {
      return wasPinched ? ratio < 0.7 : ratio < 0.45;
    },

    // Average of the last values: the hand shakes, the cursor should not.
    average(values) {
      return values.reduce(function (sum, value) { return sum + value; }, 0) / values.length;
    },

    total(cards) {
      return cards.reduce(function (sum, card) {
        return sum + (card.price || 0) * (card.qty || 1);
      }, 0);
    }
  };
})();
