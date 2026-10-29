// packs.js: a ring of packs, like Pokémon TCG Pocket. Many packs turn around you: the one in front is big,
// its neighbours are turned on the sides, the ones on the far side of the ring show their backs.
// Only 3 of them are for you today (the product chooses the player).
// Turn the ring by tilting the phone (or the arrow keys, or a swipe next to the pack).
// A pack is a BIGZIP in small: a knit booster with a photographic zip along its top edge. Swipe across the pack,
// from left to right, and the zip parts in front of your finger; the strip on top flies off and the card comes out.

(function () {
  window.App = window.App || {};

  let COUNT = 8; // packs in the ring: each booster once
  let STEP = 360 / COUNT;
  const SWIPE_PX = 50;
  const GAP = 1.2; // the ring is a bit wider than packs side by side

  const carousel = document.querySelector('[data-carousel]');
  const ring = carousel.querySelector('[data-ring]');
  const flash = document.querySelector('[data-flash]');

  let packs = []; // { booster, number, available }
  let cards = []; // the elements
  let backs = []; // the back of each pack, seen from behind
  let angle = 0; // how far the ring has turned, in degrees
  let busy = false;
  let progress = 0;
  let lastTick = 0;
  let zipFrom = null; // where the swipe along the zip started
  let zipSpan = 1; // the length of swipe that opens the pack, in screen pixels
  let turnFrom = null; // where a swipe that turns the ring started

  function focus() {
    return ((Math.round(-angle / STEP) % COUNT) + COUNT) % COUNT;
  }

  // the photographic zip of each colour, and the knit of the packs (assets/pack): loaded once
  const ZIPS = {};
  ['black', 'grey', 'blue', 'pink', 'red', 'nude', 'white'].forEach(function (name) {
    const image = new Image();
    image.onload = function () { cards.forEach(function (card, i) { if (packs[i] && packs[i].booster.pack[1] === name) drawZip(card, i === focus() ? progress : 0); }); };
    image.src = 'assets/pack/zip_' + name + '.png';
    ZIPS[name] = image;
  });

  function packHtml(pack, index) {
    const fab = '<div class="pk-fab f-' + pack.booster.pack[0] + '"></div><div class="pk-shade"></div><div class="pk-crimp"></div>';
    return '<div class="pack-card' + (pack.available ? '' : ' is-locked') + (pack.booster.pack[0] === 'latex' ? ' is-latex' : '') + ' is-' + pack.booster.open + (['grey', 'white', 'latex'].includes(pack.booster.pack[0]) ? ' is-light' : '') + '" data-index="' + index + '" ' +
      'role="group" aria-label="' + pack.booster.name + ' pack ' + pack.number + '">' +
      '<div class="pack-face"><div class="pack-inside" aria-hidden="true"><i></i></div>' +
      '<div class="pk-body">' + fab + '<p class="pk-label" aria-label="' + pack.booster.name + '"><svg class="pk-r" viewBox="50 360 1000 360" aria-hidden="true" focusable="false"><defs><mask id="rm' + index + '"><rect x="0" y="300" width="1100" height="500" fill="#fff"/><path fill-rule="evenodd" fill="#000" d="M85,520 L130,498 L250,455 L400,422 L560,392 L665,392 L735,425 L790,460 L720,492 L640,508 L580,525 L700,515 L900,530 L1020,565 L900,620 L780,665 L700,678 L600,645 L520,598 L500,700 L440,702 L410,560 L400,500 L250,510 Z M482,458 L540,458 L515,505 Z"/></mask><filter id="rb' + index + '"><feGaussianBlur stdDeviation="4"/></filter></defs><g mask="url(#rm' + index + ')"><g class="pk-r-dark" filter="url(#rb' + index + ')" transform="translate(16 18)"><path fill-rule="evenodd" d="M85,520 L130,498 L250,455 L400,422 L560,392 L665,392 L735,425 L790,460 L720,492 L640,508 L580,525 L700,515 L900,530 L1020,565 L900,620 L780,665 L700,678 L600,645 L520,598 L500,700 L440,702 L410,560 L400,500 L250,510 Z M482,458 L540,458 L515,505 Z"/></g><g class="pk-r-light" filter="url(#rb' + index + ')" transform="translate(-12 -14)"><path fill-rule="evenodd" d="M85,520 L130,498 L250,455 L400,422 L560,392 L665,392 L735,425 L790,460 L720,492 L640,508 L580,525 L700,515 L900,530 L1020,565 L900,620 L780,665 L700,678 L600,645 L520,598 L500,700 L440,702 L410,560 L400,500 L250,510 Z M482,458 L540,458 L515,505 Z"/></g></g></svg></p></div>' +
      '<div class="pk-flap">' + fab + '</div>' +
      '<div class="pk-zip"><canvas aria-hidden="true"></canvas>' +
      '<button class="pk-puller" type="button" tabindex="-1" aria-label="Zip open the ' + pack.booster.name + ' pack" ' + (pack.available ? '' : 'disabled') + '>' +
      '<img src="assets/pack/puller_' + pack.booster.pack[1] + '.png" alt="" draggable="false" /></button></div>' +
       '</div></div>';
  }

  // crimped, serrated top and bottom edges, like a foil booster
  function serrate(card) {
    const n = 26;
    const top = [];
    const bottom = [];
    for (let i = 0; i <= n; i++) top.push((i / n * 100).toFixed(2) + '% ' + (i % 2 ? 0 : 2.2) + '%');
    for (let i = n; i >= 0; i--) bottom.push((i / n * 100).toFixed(2) + '% ' + (i % 2 ? 100 : 98.6) + '%');
    card.querySelector('.pk-flap').style.clipPath = 'polygon(' + top.join(',') + ',100% 100%,0 100%)';
    card.querySelector('.pk-body').style.clipPath = 'polygon(0 0,100% 0,' + bottom.join(',') + ')';
  }

  // The knit is cut, the latex is burnt: a line follows the finger along the top of the pack.
  function drawLine(context, mode, W, H, pad, X, opened) {
    const y = pad + H / 2;
    const fray = function (x) { return Math.sin(x * 0.9) * 0.9 + Math.sin(x * 0.37 + 2) * 1.4 + Math.sin(x * 2.3) * 0.5; };
    if (mode === 'cut') {
      // a slit through the knit: dark inside, a pale frayed edge on both sides
      const gap = Math.min(5, 1 + X / 40);
      for (let x = 0; x < X; x += 2) {
        const g = gap * (0.65 + 0.35 * Math.sin(x * 0.2));
        context.fillStyle = '#0a0a0a';
        context.fillRect(x, y - g / 2, 2.5, g);
        context.fillStyle = 'rgba(235, 232, 225, 0.85)';
        context.fillRect(x, y - g / 2 - 1.4 + fray(x) * 0.25, 2.5, 1.2);
        context.fillRect(x, y + g / 2 + 0.2 + fray(x + 7) * 0.25, 2.5, 1.2);
      }
      if (X > 0 && !opened) {
        // the blade: a thin bright mark at the point of the cut
        context.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        context.lineWidth = 1.5;
        context.beginPath();
        context.moveTo(X, y - 9);
        context.lineTo(X + 4, y + 9);
        context.stroke();
      }
      return;
    }
    // burn: a charred band behind the flame, a glowing edge, and a flame at the point
    const t = Date.now() / 90;
    for (let x = 0; x < X; x += 2) {
      const h = 3.5 + 3 * Math.min(1, (X - x) / 60) + fray(x) * 0.8;
      const glow = Math.max(0, 1 - (X - x) / 46);
      context.fillStyle = 'rgba(' + (24 + 230 * glow | 0) + ',' + (10 + 80 * glow | 0) + ',6,' + (0.92) + ')';
      context.fillRect(x, y - h, 2.5, h * 2);
      context.fillStyle = 'rgba(80, 40, 20, 0.5)';
      context.fillRect(x, y - h - 2, 2.5, 2);
      context.fillRect(x, y + h, 2.5, 2);
    }
    if (X > 0 && !opened) {
      const g = context.createRadialGradient(X, y, 0, X, y, 40);
      g.addColorStop(0, 'rgba(255, 210, 120, 0.9)');
      g.addColorStop(0.35, 'rgba(255, 120, 30, 0.45)');
      g.addColorStop(1, 'rgba(255, 80, 20, 0)');
      context.fillStyle = g;
      context.fillRect(X - 40, y - 40, 80, 80);
      // the flame: a few teardrops that rise and flicker
      for (let i = 0; i < 5; i++) {
        const fx = X + Math.sin(t + i * 2) * 4;
        const fh = 16 + 10 * Math.abs(Math.sin(t * 1.3 + i * 1.7)) + (i === 0 ? 8 : 0);
        context.fillStyle = i < 2 ? 'rgba(255, 238, 170, 0.95)' : i < 4 ? 'rgba(255, 150, 40, 0.8)' : 'rgba(230, 60, 20, 0.6)';
        context.beginPath();
        context.moveTo(fx - 4 + i, y);
        context.quadraticCurveTo(fx - 3 + i, y - fh * 0.6, fx + Math.sin(t + i) * 3, y - fh);
        context.quadraticCurveTo(fx + 4 - i, y - fh * 0.5, fx + 4 - i, y);
        context.fill();
      }
    }
  }

  // The zip of one pack at progress p (0 to 1): a photo of the zip in two rows that part behind the slider,
  // and the inside of the pack shows through the opening.
  function drawZip(card, p) {
    const zip = card.querySelector('.pk-zip');
    const canvas = zip.querySelector('canvas');
    const W = zip.clientWidth;
    const H = zip.clientHeight;
    if (!W || !H) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(W * dpr)) {
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * 2 * dpr);
    }
    const context = canvas.getContext('2d');
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, W, H * 2);
    const mode = packs[+card.dataset.index].booster.open;
    const image = ZIPS[packs[+card.dataset.index].booster.pack[1]];
    const opened = card.classList.contains('is-open');
    const pad = H / 2;
    const X = p * W;
    if (mode !== 'zip') {
      drawLine(context, mode, W, H, pad, X, opened);
      return;
    }
    if (image.complete && image.naturalWidth) {
      const iw = image.naturalWidth;
      const ih = image.naturalHeight;
      const maxS = H * 0.55;
      if (X > 6 && !opened) {
        const gh = Math.min(maxS * 1.6, X / 6);
        const g = context.createLinearGradient(0, pad + H / 2 - gh, 0, pad + H / 2 + gh);
        g.addColorStop(0, '#1a1a1a');
        g.addColorStop(0.5, 'rgb(' + (28 + 40 * p | 0) + ',' + (24 + 34 * p | 0) + ',' + (20 + 24 * p | 0) + ')');
        g.addColorStop(1, '#1a1a1a');
        context.fillStyle = g;
        context.beginPath();
        context.ellipse(X / 2, pad + H / 2, X / 2, gh, 0, 0, Math.PI * 2);
        context.fill();
      }
      const step = 2;
      for (let x = 0; x < W; x += step) {
        const d = X - x - 6;
        let o = d > 0 ? Math.min(1, d / (W * 0.22)) : 0;
        o = o * o * (3 - 2 * o);
        const sh = o * maxS;
        const tilt = o * 2.5;
        const K = 1.45;
        const sx = x / W * iw / K;
        const sw = step / W * iw / K + 0.4;
        if (!opened) context.drawImage(image, sx, 0, sw, ih / 2, x, pad - sh - tilt, step + 0.4, H / 2);
        context.drawImage(image, sx, ih / 2, sw, ih / 2, x, pad + H / 2 + sh + tilt, step + 0.4, H / 2);
      }
    }
    // the slider follows the opening
    const puller = zip.querySelector('.pk-puller');
    const pw = puller.clientWidth || W * 0.358;
    const ph = pw * 540 / 220;
    puller.style.left = X - pw * 0.58 + 'px';
    puller.style.top = H / 2 - ph * 0.185 + 'px';
  }

  // the ring: every pack on its place of the circle, the whole ring turned by `angle`
  function layout() {
    if (!cards.length) return;
    const width = cards[0].offsetWidth;
    const radius = (width / 2 / Math.tan(Math.PI / COUNT)) * GAP; // a space between the packs
    cards.forEach(function (card, i) {
      card.style.transform = 'rotateY(' + i * STEP + 'deg) translateZ(' + radius + 'px)';
      backs[i].style.transform = 'rotateY(' + i * STEP + 'deg) translateZ(' + radius + 'px) rotateY(180deg)';
    });
    ring.style.transform = 'translateZ(' + -radius + 'px) rotateY(' + angle + 'deg)';
    const front = focus();
    cards.forEach(function (card, i) {
      card.classList.toggle('is-focus', i === front);
      card.querySelector('.pk-puller').tabIndex = i === front && packs[i].available ? 0 : -1;
    });
    show();
  }

  // the hint, "1 / 3" and the three dots follow the pack in front
  function show() {
    const index = focus();
    const mine = packs.filter(function (p) { return p.available; });
    const rank = mine.indexOf(packs[index]);
    const spent = App.state.get('history').lastDate === App.utils.today();
    const hint = spent
      ? 'NEXT DROP IN ' + App.state.get('countdown') + '\nONE DROP PER DAY'
      : packs[index].available
      ? (App.state.get('input') === 'tilt' ? 'TILT TO BROWSE' : 'SWIPE BESIDE TO BROWSE') + ' · ' + { zip: 'SWIPE ACROSS THE ZIP TO OPEN IT', cut: 'CUT THE TOP: SWIPE ACROSS THE LINE', burn: 'BURN THE TOP: SWIPE ACROSS WITH THE LIGHTER' }[packs[index].booster.open]
      : (App.state.get('input') === 'tilt' ? 'TILT' : 'SWIPE BESIDE') + ' TO BROWSE';
    const hintLine = document.querySelector('[data-show="packs-hint"]');
    if (hintLine) {
      hintLine.textContent = hint;
      hintLine.classList.toggle('is-timer', spent);
    }
    cards.forEach(function (card, i) { card.classList.toggle('is-mine', packs[i].available); });
  }

  function turn(direction) {
    if (busy) return;
    drawZip(cards[focus()], 0); // the pack you leave closes again
    progress = 0;
    lastTick = 0;
    angle -= direction * STEP;
    App.feedback.play('keep');
    App.feedback.buzz(10);
    layout();
  }

  function setProgress(value) {
    if (busy) return;
    const p = App.utils.clamp(value, progress, 1); // a zip only goes one way
    if (p - lastTick > 0.025) {
      App.feedback.zipTick();
      App.feedback.buzz(4);
      lastTick = p;
    }
    progress = p;
    drawZip(cards[focus()], p);
    if (p >= 0.9) open();
  }

  // The pack is open: the strip on top is torn off in a burst of light, the card of the pack rises out of it,
  // then it is yours. The hoodie of the pack draws it: a red zip gives rarer cards.
  function open() {
    busy = true;
    const pack = packs[focus()];
    const drawn = App.cards.draw(pack.booster);
    App.state.set('hoodie', pack.booster);
    App.state.set('deck', [drawn]);
    cards[focus()].classList.add('is-open');
    drawZip(cards[focus()], 1);
    cards[focus()].querySelector('.pack-inside').innerHTML = '<i style="background-image: url(' + drawn.img + ')"' + (drawn.photo ? ' class="is-photo"' : '') + '></i>';
    carousel.classList.add('is-bursting');
    App.feedback.play('open');
    App.feedback.buzz([30, 30, 60]);
    flash.classList.remove('is-on');
    void flash.offsetWidth; // restart the flash animation
    flash.classList.add('is-on');
    setTimeout(function () {
      carousel.classList.remove('is-bursting');
      App.tilt.stop();
      App.cards.reveal();
      App.state.set('screen', 'reveal');
    }, 1400);
  }

  // finger: a swipe across the pack in front zips it; a swipe anywhere else turns the ring
  carousel.addEventListener('pointerdown', function (event) {
    if (busy) return;
    App.feedback.init();
    const front = cards[focus()];
    if (front.contains(event.target)) {
      if (!packs[focus()].available) {
        return;
      }
      if (App.state.get('history').lastDate === App.utils.today()) {
        App.feedback.toast('ONE DROP PER DAY / NEXT DROP IN ' + App.state.get('countdown'));
        return;
      }
      zipFrom = event.clientX;
      zipSpan = front.getBoundingClientRect().width * 0.75; // a swipe of three quarters of the pack opens it
      front.setPointerCapture(event.pointerId);
      if (packs[focus()].booster.open === 'burn') burning();
    } else {
      turnFrom = event.clientX;
    }
  });
  // the flame flickers while the finger is down
  function burning() {
    if (zipFrom === null || busy) return;
    drawZip(cards[focus()], progress);
    requestAnimationFrame(burning);
  }
  // the pack in front follows the finger in 3D, as if it were held
  function tiltPack(event) {
    const front = cards[focus()];
    if (!front || busy) return;
    const box = front.getBoundingClientRect();
    const x = App.utils.clamp((event.clientX - (box.left + box.width / 2)) / (box.width / 2), -1.3, 1.3);
    const y = App.utils.clamp((event.clientY - (box.top + box.height / 2)) / (box.height / 2), -1.3, 1.3);
    front.classList.remove('is-released');
    front.style.setProperty('--ty', x * 16 + 'deg');
    front.style.setProperty('--tx', -y * 12 + 'deg');
  }
  function untiltPack() {
    cards.forEach(function (card) {
      card.classList.add('is-released');
      card.style.setProperty('--ty', '0deg');
      card.style.setProperty('--tx', '0deg');
    });
  }
  carousel.addEventListener('pointermove', function (event) {
    if (zipFrom !== null) tiltPack(event);
    if (zipFrom === null) return;
    setProgress((event.clientX - zipFrom) / zipSpan);
  });
  function release(event) {
    untiltPack();
    const wasZipping = zipFrom !== null;
    zipFrom = null;
    // let go after most of the way: the zip finishes by itself
    if (wasZipping && !busy && progress >= 0.55) open();
    if (turnFrom !== null) {
      const dx = event.clientX - turnFrom;
      turnFrom = null;
      if (Math.abs(dx) > SWIPE_PX) turn(dx < 0 ? 1 : -1);
    }
  }
  carousel.addEventListener('pointerup', release);
  carousel.addEventListener('pointercancel', release);

  // keyboard: Enter or Space on the slider zips a little, the tilt turns the ring
  carousel.addEventListener('keydown', function (event) {
    if (!event.target.closest('.pk-puller')) return;
    if (['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      setProgress(progress + 0.12);
    }
  });

  window.addEventListener('resize', function () {
    layout();
    if (cards.length) drawZip(cards[focus()], progress);
  });

  App.packs = {
    // the hint under the ring follows the countdown
    refreshHint() {
      if (packs.length && document.querySelector('[data-screen="packs"]:not([hidden])')) show();
    },

    // The ring is drawn as soon as the app opens: it shows through the V of the hoodie.
    build() {
      busy = false;
      progress = 0;
      lastTick = 0;
      // every booster once. 3 are for you.
      const all = App.data.BOOSTERS.map(function (booster) { return { booster }; });
      COUNT = all.length;
      STEP = 360 / COUNT;
      all.sort(function () { return Math.random() - 0.5; });
      packs = all.map(function (pack, i) { return { booster: pack.booster, number: i + 1, available: false }; });
      packs.forEach(function (pack) { pack.available = true; }); // every booster can be opened
      ring.innerHTML = packs.map(packHtml).join('') + packs.map(function (pack) {
        // the back of a pack is its own fabric, seen from behind
        return '<div class="pack-card pack-back f-' + pack.booster.pack[0] + '" aria-hidden="true"></div>';
      }).join('');
      cards = Array.prototype.slice.call(ring.querySelectorAll('.pack-card:not(.pack-back)'));
      backs = Array.prototype.slice.call(ring.querySelectorAll('.pack-back'));
      angle = -packs.findIndex(function (pack) { return pack.available; }) * STEP;
      layout();
      cards.forEach(function (card) {
        serrate(card);
        drawZip(card, 0);
      });
    },

    // The hoodie is open: tilt turns the ring.
    enter() {
      layout();
      // the ring was built while its screen was hidden (canvases of size 0): draw every zip now that it has a size
      cards.forEach(function (card, i) { drawZip(card, i === focus() ? progress : 0); });
      requestAnimationFrame(function () { cards.forEach(function (card, i) { drawZip(card, i === focus() ? progress : 0); }); });
      App.tilt.enter({
        lean(value) {
          carousel.style.setProperty('--lean', App.utils.clamp(value / 25, -1, 1));
        },
        decide(toTheRight) { turn(toTheRight ? 1 : -1); },
        busy() { return busy || zipFrom !== null; } // the tilt does not turn the ring under a finger
      });
      show();
    }
  };
})();
