// booster.js: the first zip of the app. A BIGZIP hoodie of the brand covers the whole phone and the 3 boosters
// of the day are behind it. Pulling the zip down opens it in a V, like a real zip: the fabric on both sides is cut
// along two lines that start at the slider, and the real teeth of the zip are drawn along those lines.
// The geometry is computed in pixels from the size of the screen, at every step of the zip.
// Who pulls: the hand (hand.js), a finger (below) or the keyboard.

(function () {
  window.App = window.App || {};

  const pack = document.querySelector('[data-pack]');
  const pull = pack.querySelector('[data-zip-pull]');
  const fabrics = [pack.querySelector('[data-fabric-left]'), pack.querySelector('[data-fabric-right]')];
  const fabricImages = pack.querySelectorAll('[data-fabric-img]');
  const teethLeft = pack.querySelector('[data-teeth-left]');
  const teethRight = pack.querySelector('[data-teeth-right]');
  const pullImage = pack.querySelector('[data-pull-img]');
  const flash = document.querySelector('[data-flash]');
  const Z = App.data.ZIP;

  let progress = 0;
  let lastTick = 0;
  let opened = false;
  let dragging = false;
  let grabOffset = 0;

  // size of the screen and of the zip pictures on it
  let width = 0;
  let height = 0;
  let k = 1; // screen pixels for one pixel of the zip pictures
  let apex0 = 0; // where the zip opens at the start
  let apex1 = 0; // and at the end

  function measure() {
    width = pack.offsetWidth;
    height = pack.offsetHeight;
    if (!width || !height) return;
    k = Math.max(width / Z.fabricW, height / Z.fabricH);
    apex0 = Z.apexY * k;
    // the slider stops at the bottom of the zip, or before the bottom of the screen: its ring stays in view
    apex1 = Math.min(Z.stopY * k, height - (Z.pullH - Z.pullApexY) * k - 4);
    fabricImages.forEach(function (image) {
      image.style.width = Z.fabricW * k + 'px';
      image.style.height = Z.fabricH * k + 'px';
      image.style.left = (width - Z.fabricW * k) / 2 + 'px';
    });
    [teethLeft, teethRight].forEach(function (strip) {
      strip.style.backgroundSize = Z.teethW * k + 'px ' + Z.teethH * k + 'px';
      strip.style.width = (Z.teethW / 2) * k + 'px';
    });
    teethRight.style.backgroundPosition = -(Z.teethW / 2) * k + 'px 100%';
    teethLeft.style.backgroundPosition = '0 100%';
    pullImage.style.width = Z.pullW * k + 'px';
    pullImage.style.height = Z.pullH * k + 'px';
    pull.style.width = Z.pullW * k + 'px';
    pull.style.height = Z.pullH * k + 'px';
    draw(progress);
  }

  // The V: from the slider (cx, sy) up to the top of the screen, wider and wider.
  function draw(zip) {
    if (!width) return;
    const cx = width / 2;
    const sy = apex0 + zip * (apex1 - apex0);
    const half = ((cx + 40) / (apex1 - apex0)) * (sy - apex0); // half width of the V at the top
    const xTop = cx - half;
    const edge = xTop >= 0 ? { x: xTop, y: 0 } : { x: 0, y: sy * (1 - cx / half) };

    const left = xTop >= 0
      ? [[0, 0], [xTop, 0], [cx, sy], [cx, height], [0, height]]
      : [[0, edge.y], [cx, sy], [cx, height], [0, height]];
    const right = left.map(function (point) { return [width - point[0], point[1]]; }).reverse();
    fabrics[0].style.clipPath = polygon(left);
    fabrics[1].style.clipPath = polygon(right);

    // the real teeth, along the two edges of the V
    const dx = cx - edge.x;
    const dy = sy - edge.y;
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dx, dy);
    const strip = (Z.teethW / 2) * k;
    placeStrip(teethLeft, cx - strip, sy - length, length, 100, -angle);
    placeStrip(teethRight, cx, sy - length, length, 0, angle);

    // the slider, on top
    pull.style.left = cx - Z.pullApexX * k + 'px';
    pull.style.top = sy - Z.pullApexY * k + 'px';
  }

  function polygon(points) {
    return 'polygon(' + points.map(function (p) { return p[0].toFixed(1) + 'px ' + p[1].toFixed(1) + 'px'; }).join(',') + ')';
  }

  function placeStrip(element, x, y, length, originX, angle) {
    element.style.left = x + 'px';
    element.style.top = y + 'px';
    element.style.height = length + 'px';
    element.style.transformOrigin = originX + '% 100%';
    element.style.transform = 'rotate(' + angle + 'rad)';
  }

  // Pulled this far, the zip finishes by itself: nobody should have to pull all the way down.
  const AUTO_AT = 0.5;
  let finishing = false;

  function finishByItself() {
    if (finishing || opened) return;
    finishing = true;
    const from = progress;
    const started = performance.now();
    const duration = 900 * (1 - from); // a little faster when it is nearly done
    (function step(now) {
      const t = App.utils.clamp((now - started) / duration, 0, 1);
      finishing = false; // let setProgress move the zip
      setProgress(from + (1 - from) * (t * t * (3 - 2 * t)), true);
      if (t < 1 && !opened) {
        finishing = true;
        requestAnimationFrame(step);
      }
    })(started);
  }

  function setProgress(value, byItself) {
    if (opened || (finishing && !byItself)) return;
    let p = App.utils.clamp(value, 0, 1);
    if (p < progress) p = progress; // the zip never goes back up
    // one click per tooth
    if (p - lastTick > 0.025) {
      App.feedback.zipTick();
      App.feedback.buzz(4);
      lastTick = p;
    }
    progress = p;
    if (p > 0.01) pack.classList.remove('is-idle');
    draw(p);
    if (p >= 0.97) open();
    else if (p >= AUTO_AT && !byItself) finishByItself();
  }

  function open() {
    if (opened) return;
    opened = true;
    App.hand.stop();
    draw(1);
    pack.classList.add('is-open');
    App.state.set('unzipStatus', '');
    App.feedback.play('open');
    App.feedback.buzz([30, 30, 60]);
    flash.classList.remove('is-on');
    void flash.offsetWidth; // restart the flash animation
    flash.classList.add('is-on');
    setTimeout(function () {
      // the hoodie leaves: the 3 boosters were behind it
      App.state.set('gate', false);
      App.afterZip();
      App.render.focusScreenTitle();
    }, 1100);
  }

  // Where the slider is on screen (the phone may be scaled on a laptop), and which zip position
  // a vertical point of the screen means: used by the hand and the finger.
  function scale() {
    return pack.getBoundingClientRect().height / pack.offsetHeight || 1;
  }

  function tabCenter() {
    const box = pull.getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  }

  function progressAt(clientY, offset) {
    const box = pack.getBoundingClientRect();
    const centre = (clientY - offset - box.top) / scale();
    const sy = centre - (Z.pullH / 2 - Z.pullApexY) * k;
    return (sy - apex0) / (apex1 - apex0);
  }

  // Gravity: the slider hangs from the zip like a pendulum. Tilt the phone and it swings, with a little
  // inertia, then settles back to hang straight down. It never moves along the zip: only a hand pulls it.
  const SWAY_MAX = 14; // degrees: a slight swing, never a spin
  const SPRING = 28; // how hard gravity pulls it back
  const DAMPING = 5; // how fast the swing dies
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  let swing = 0; // angle of the slider, degrees
  let speed = 0;
  let aim = 0; // where gravity pulls it, from the lean of the phone
  let swayTime = 0;
  let swaying = false;

  function sway(now) {
    const dt = Math.min(0.05, (now - (swayTime || now)) / 1000);
    swayTime = now;
    speed += (-SPRING * (swing - aim) - DAMPING * speed) * dt;
    swing = App.utils.clamp(swing + speed * dt, -SWAY_MAX, SWAY_MAX);
    pullImage.style.rotate = opened ? '0deg' : swing.toFixed(2) + 'deg';
    pullImage.style.transformOrigin = Z.pullApexX * k + 'px ' + Z.pullApexY * k + 'px';
    if (opened) swaying = false;
    else requestAnimationFrame(sway);
  }

  function startSway() {
    if (calm.matches || swaying) return;
    swaying = true;
    swayTime = 0;
    requestAnimationFrame(sway);
    App.tilt.enter({
      // the phone leans to the right: the slider, pulled by gravity, swings to its left
      // the first 4 degrees of lean (a hand that trembles) are ignored
      lean(value) {
        const beyond = Math.sign(value) * Math.max(0, Math.abs(value) - 4);
        aim = App.utils.clamp(-beyond * 0.4, -SWAY_MAX, SWAY_MAX);
      },
      decide() {},
      busy() { return true; }
    });
  }

  function start(booster) {
    progress = 0;
    lastTick = 0;
    opened = false;
    finishing = false;
    pack.classList.remove('is-open');
    pack.classList.add('is-idle'); // the slider nudges: pull me
    App.state.set('hoodie', booster);
    App.state.set('unzipStarted', false);
    App.state.set('fingerMode', false);
    App.state.set('fingerOffer', false);
    App.state.set('unzipStatus', 'RAISE YOUR HAND');
    measure();
    startSway();
  }

  // finger (only after "USE YOUR FINGER")
  pull.addEventListener('pointerdown', function (event) {
    if (!App.state.get('fingerMode')) return;
    dragging = true;
    grabOffset = event.clientY - tabCenter().y;
    pull.setPointerCapture(event.pointerId);
    App.feedback.init();
  });
  pull.addEventListener('pointermove', function (event) {
    if (dragging) setProgress(progressAt(event.clientY, grabOffset));
  });
  pull.addEventListener('pointerup', function () { dragging = false; });
  pull.addEventListener('pointercancel', function () { dragging = false; });

  // keyboard: arrow down, Enter or Space pulls a little
  pull.addEventListener('keydown', function (event) {
    if (['ArrowDown', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      App.feedback.init();
      setProgress(progress + 0.12);
    }
  });

  window.addEventListener('resize', measure);

  App.booster = {
    start,
    measure,
    setProgress,
    tabCenter,
    progressAt,
    isOpen() { return opened; },
    progress() { return progress; }
  };
})();
