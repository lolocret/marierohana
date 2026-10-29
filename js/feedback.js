// feedback.js: sounds (Web Audio), vibrations and the small toast message.
// Browsers only allow sound after a tap, so init() is called from the first button.

(function () {
  window.App = window.App || {};

  let context = null;
  let noise = null;
  let toastTimer = 0;

  function init() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return context;
    }
    try {
      context = new (window.AudioContext || window.webkitAudioContext)();
      noise = context.createBuffer(1, context.sampleRate * 0.05, context.sampleRate);
      const samples = noise.getChannelData(0);
      for (let i = 0; i < samples.length; i += 1) samples[i] = Math.random() * 2 - 1;
    } catch {
      context = null;
    }
    return context;
  }

  // One short click of filtered noise: the sound of a zip tooth.
  function zipTick() {
    if (!context) return;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const now = context.currentTime;
    source.buffer = noise;
    filter.type = 'bandpass';
    filter.frequency.value = 2500 + Math.random() * 1500;
    filter.Q.value = 3;
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    source.connect(filter).connect(gain).connect(context.destination);
    source.start(now);
    source.stop(now + 0.05);
  }

  function tone(freqs, length, type, volume, gap) {
    if (!context) return;
    freqs.forEach(function (freq, i) {
      const osc = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + i * gap;
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + length);
      osc.connect(gain).connect(context.destination);
      osc.start(start);
      osc.stop(start + length + 0.05);
    });
  }

  const sounds = {
    incoming() { tone([98, 110, 123], 0.5, 'sawtooth', 0.05, 0.12); },
    open() { tone([196, 262, 330, 392, 523], 0.45, 'sawtooth', 0.06, 0.06); },
    common() { tone([440, 554], 0.2, 'triangle', 0.16, 0.07); },
    rare() { tone([440, 554, 659, 880], 0.3, 'triangle', 0.16, 0.07); },
    legendary() { tone([440, 554, 659, 880, 1109, 1319], 0.55, 'sawtooth', 0.06, 0.08); },
    keep() { tone([659, 880], 0.15, 'square', 0.06, 0.07); },
    pass() { tone([294, 196], 0.28, 'sine', 0.14, 0.1); }
  };

  App.feedback = {
    init,
    zipTick,

    play(name) {
      if (sounds[name]) sounds[name]();
    },

    buzz(pattern) {
      try {
        if (navigator.vibrate) navigator.vibrate(pattern);
      } catch {
        // No vibration on this device.
      }
    },

    toast(message, duration = 1800) {
      App.state.set('toast', message);
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () {
        App.state.set('toast', '');
      }, duration);
    }
  };
})();
