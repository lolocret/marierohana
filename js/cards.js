// cards.js: a pack holds ONE card, and you get it directly: no swipe, no choice to make.
// The card goes into the bag (a product) and into the collection (a Gunbelt, a BIGZIP, a tee, a jogging, a RUNWAY picture).
// The odds come from the zip of the hoodie of the pack: a red zip gives rarer cards.

(function () {
  window.App = window.App || {};

  let count = 0;

  function ofRarity(rarity) {
    return App.data.CARDS.filter(function (card) { return card.rarity === rarity && card.group !== 'special'; });
  }

  function randomCard(booster) {
    const roll = Math.random();
    const rarity = roll < booster.legendary ? 'legendary' : roll < booster.legendary + booster.rare ? 'rare' : 'common';
    return Object.assign({}, App.utils.pick(ofRarity(rarity)));
  }

  // The card inside a pack.
  function draw(booster) {
    const card = randomCard(booster);
    count += 1;
    return Object.assign({}, card, { uid: 'card-' + count + '-' + Date.now() });
  }

  // The card is yours: it goes into the collection only (never into the bag), and today's drop is spent.
  function reveal() {
    const card = App.state.get('deck')[0];
    if (card.slot && App.state.get('inventory').indexOf(card.slot) === -1) {
      App.state.set('inventory', App.state.get('inventory').concat([card.slot]));
    } else if (card.slot) {
      // a card you already own is a duplicate: a gift for the lobby
      const dupes = Object.assign({}, App.state.get('dupes'));
      dupes[card.slot] = (dupes[card.slot] || 0) + 1;
      App.state.set('dupes', dupes);
    }
    App.community.log(new Date().toTimeString().slice(0, 5) + ' · ' + (App.state.get('player').name || 'RM_PLAYER').toUpperCase() + ' OPENED A DROP');
    App.state.set('history', { lastDate: App.utils.today() }); // one supply drop per day
    App.feedback.play(card.rarity);
    App.feedback.buzz(card.rarity === 'legendary' ? [40, 40, 40, 40, 80] : card.rarity === 'rare' ? [30, 30, 30] : 15);
  }

  // The card you got is big, and you can move it: it tilts under the finger, a sheen follows, it springs back.
  (function () {
    const holder = document.querySelector('[data-reveal]');
    let down = false;

    function tilt(event) {
      const card = holder.querySelector('.card');
      if (!down || !card) return;
      const box = holder.getBoundingClientRect();
      const x = App.utils.clamp((event.clientX - box.left) / box.width * 2 - 1, -1.3, 1.3);
      const y = App.utils.clamp((event.clientY - box.top) / box.height * 2 - 1, -1.3, 1.3);
      card.classList.remove('is-new');
      card.style.transition = 'none';
      card.style.transform = 'rotateY(' + x * 28 + 'deg) rotateX(' + -y * 22 + 'deg)';
      card.style.setProperty('--sx', (50 + x * 50) + '%');
      card.style.setProperty('--sy', (50 + y * 50) + '%');
    }

    function release() {
      const card = holder.querySelector('.card');
      down = false;
      if (!card) return;
      card.style.transition = 'transform 0.6s cubic-bezier(0.2, 1.4, 0.4, 1)';
      card.style.transform = '';
    }

    holder.addEventListener('pointerdown', function (event) {
      down = true;
      holder.setPointerCapture(event.pointerId);
      tilt(event);
    });
    holder.addEventListener('pointermove', tilt);
    holder.addEventListener('pointerup', release);
    holder.addEventListener('pointercancel', release);
  })();

  App.cards = { draw, reveal };
})();
