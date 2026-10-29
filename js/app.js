// app.js: connects everything. Loaded last.
// A tap runs an action, the action changes the state, the state change redraws the page.
// The journey: the hoodie of the day (zip) -> 3 boosters (choose one, zip it) -> its one card -> recap -> the site.

(function () {
  let checkoutTimer = 0;
  let introStep = 0; // 0: the welcome alone; 1 to 3: one idea per screen

  // What is saved in the browser, and what "RESET DEMO" puts back.
  const FRESH = {
    bag: [], inventory: [], collectionCard: '', outfit: { jacket: '', tee: '', bottom: '', belt: '', backdrop: '' },
    player: { name: '', avatar: '' }, tour: true, zipped: false, coached: [], history: { lastDate: '' }
  };

  // EDIT HERE: one entry per data-action in index.html.
  const actions = {
    'go-to'(button) {
      App.state.set('screen', button.dataset.to);
    },

    // The banner of the site: the next drop, or today's drop that was left closed.
    'open-unzip'() {
      actions['open-boosters']();
    },

    // The one tap of the journey: camera and tilt sensor, asked together.
    'open-with-hand'() {
      App.hand.startWithCamera();
    },

    'simulate-hand'() {
      App.hand.startWithMouse();
    },

    'use-finger'() {
      App.hand.useFinger();
    },

    // The recap, then the site.
    'continue'() {
      document.querySelector('#reveal-title').dataset.write = 'try moving the card';      // the gift screen changes the title
      const card = App.state.get('deck')[0];
      App.render.showCollectionCard(card && card.slot || '');
    },

    // The intro: avatar, name (see the submit listener), fitting.
    'pick-avatar'(button) {
      App.state.set('player', Object.assign({}, App.state.get('player'), { avatar: button.dataset.avatar }));
      App.render.avatars();
      // choosing is the way on: a short beat to see the choice, then the name
      setTimeout(function () {
        if (App.state.get('screen') === 'spawn') App.state.set('screen', 'name');
      }, 350);
    },

    // Dress-up: a tab for the place, a tap on a piece puts it on, a second tap takes it off.
    'fit-tab'(button) {
      App.state.set('fitTab', button.dataset.tab);
    },

    'fit-pick'(button) {
      const outfit = Object.assign({}, App.state.get('outfit'));
      outfit[button.dataset.tab] = outfit[button.dataset.tab] === button.dataset.slot ? '' : button.dataset.slot;
      App.state.set('outfit', outfit);
    },

    'outfit-size'(button) {
      App.state.set('outfitSizes', Object.assign({}, App.state.get('outfitSizes'), { [button.dataset.slot]: button.dataset.size }));
    },

    // CHOOSE SIZES: from the fitting room to the sizes of the pieces to buy.
    // the hood of the jacket: down behind the neck, or up over the head (works best on the girl)
    'outfit-sizes'() {
      if (App.render.toBuy().length) App.state.set('screen', 'size');
      else if (App.render.introPhase()) App.state.set('screen', 'home'); // nothing to buy: on to the shop
      else App.feedback.toast('NOTHING TO BUY IN THIS OUTFIT');
    },

    // ADD TO BASKET: every piece to buy goes into the bag with its size.
    'outfit-add'() {
      const sizes = App.state.get('outfitSizes');
      const cards = App.render.toBuy();
      if (!cards.length) {
        App.feedback.toast('NOTHING TO BUY IN THIS OUTFIT');
        return;
      }
      if (cards.some(function (c) { return c.sizes.length > 1 && !sizes[c.slot]; })) {
        App.feedback.toast('CHOOSE A SIZE FOR EVERY PIECE');
        return;
      }
      cards.forEach(function (c) { App.bag.add(c, c.sizes.length === 1 ? c.sizes[0] : sizes[c.slot]); });
      App.feedback.play('keep');
      App.feedback.buzz(15);
      App.feedback.toast('OUTFIT ADDED TO BAG');
      App.state.set('screen', App.state.get('tour') ? 'home' : 'bag');
    },

    // From a product sheet: put it on the avatar.
    'try-on'(button) {
      actions['wear-card'](button);
    },

    // The first pages: a tap anywhere goes on.
    // The intro, screen by screen, a tap goes on: the welcome alone, then three one-line screens, then the avatar.
    'intro-next'() {
      const LINES = ['dress ur avatar and buy the outfit', 'collect the cards to get surprises', 'share ur look and vote for the best'];
      introStep += 1;
      if (introStep > LINES.length) {
        App.state.set('screen', 'spawn');
        return;
      }
      const title = document.querySelector('#welcome-title');
      title.dataset.write = LINES[introStep - 1];
      App.render.write(document.querySelector('.welcome'));
    },

    // From the bag: unzip the booster of the day.
    'open-boosters'() {
      // the boosters can always be looked at; opening one waits for tomorrow (see packs.js).
      // The ring is drawn again each time: every booster closed, as new.
      App.packs.build();
      App.state.set('screen', 'packs');
      App.packs.enter();
    },

    'enter-site'() {
      // during the first visit (avatar, name, fitting room, sizes) the logo does not take you out of it
      const screen = App.state.get('screen');
      const onboarding = ['welcome', 'spawn', 'name', 'size'].includes(screen) || (screen === 'tryon' && App.state.get('onboarding'));
      if (onboarding) return;
      App.state.set('screen', 'home');
    },

    'shop-variant'(button) {
      const picked = Object.assign({}, App.state.get('shopVariants'));
      picked[button.dataset.group] = +button.dataset.i;
      App.state.set('shopVariants', picked);
    },

    'shop-size'(button) {
      App.state.set('shopSizes', Object.assign({}, App.state.get('shopSizes'), { [button.dataset.group]: button.dataset.size }));
    },

    // In the bag: the size of a product.
    'set-size'(button) {
      App.state.set('bag', App.bag.merge(App.state.get('bag').map(function (card) {
        return card.uid === button.dataset.id ? Object.assign({}, card, { size: button.dataset.size }) : card;
      })));
    },

    // The quantity of a line of the bag.
    'qty-up'(button) {
      App.state.set('bag', App.state.get('bag').map(function (card) {
        return card.uid === button.dataset.id ? Object.assign({}, card, { qty: (card.qty || 1) + 1 }) : card;
      }));
    },

    'qty-down'(button) {
      App.state.set('bag', App.state.get('bag').map(function (card) {
        return card.uid === button.dataset.id ? Object.assign({}, card, { qty: Math.max(1, (card.qty || 1) - 1) }) : card;
      }));
    },

    // ADD TO BAG, from the shop: the variant on the screen goes into the bag.
    'shop-add'(button) {
      const product = App.data.SHOP.find(function (p) { return p.group === button.dataset.group; });
      const card = product.variants[App.state.get('shopVariants')[product.group] || 0];
      const size = card.sizes.length === 1 ? card.sizes[0] : App.state.get('shopSizes')[product.group];
      if (!size) {
        App.feedback.toast('CHOOSE A SIZE');
        return;
      }
      addToBag(card, size);
      actions['close-sheet']();
    },

    // ADD TO BAG, from the collection: a card you own.
    'collection-add'(button) {
      const card = App.data.CARDS.find(function (c) { return c.slot === button.dataset.slot; });
      addToBag(card, card.sizes.length === 1 ? card.sizes[0] : '');
    },

    // The avatar: put a piece on, or take it off.
    // The sheet that slides up from the bottom.
    'open-sheet'(button) {
      App.state.set('sheet', { kind: button.dataset.sheet, id: button.dataset.id || '' });
    },

    'close-sheet'() {
      App.state.set('sheet', { kind: '', id: '' });
    },

    'collection-tab'(button) {
      App.state.set('collectionTab', button.dataset.tab);
    },

    // From a card or a product: put it on the avatar, and go and see it in the fitting room.
    'wear-card'(button) {
      App.state.set('outfit', Object.assign({}, App.state.get('outfit'), { [button.dataset.place]: button.dataset.slot }));
      App.state.set('fitTab', button.dataset.place);
      App.state.set('sheet', { kind: '', id: '' });
      App.state.set('screen', 'tryon');
    },

    'remove-from-bag'(button) {
      App.state.set('bag', App.state.get('bag').filter(function (card) { return card.uid !== button.dataset.id; }));
    },

    // Buying a piece gives its virtual card too: it goes into the collection, and onto the 3D avatar.
    checkout() {
      const bag = App.state.get('bag');
      const owned = App.state.get('inventory');
      const slots = bag.map(function (card) { return card.slot; }).filter(function (slot, i, all) {
        return slot && owned.indexOf(slot) === -1 && all.indexOf(slot) === i;
      });
      App.state.set('inventory', owned.concat(slots));
      App.state.set('bag', []);
      App.state.set('checkoutNote', 'CONCEPT PROTOTYPE / NO REAL PURCHASE' + (slots.length ? ' / ' + slots.length + ' CARD' + (slots.length > 1 ? 'S' : '') + ' ADDED' : ''));
      clearTimeout(checkoutTimer);
      checkoutTimer = setTimeout(function () {
        App.state.set('checkoutNote', '');
      }, 2600);
    },

    // For the presentation: everything is as on the first visit, and the demo starts again on the hoodie.
    'reset-demo'() {
      resetDemo();
    }
  };

  // The bag: the same piece in the same size is one line with a quantity; another size is another line.
  App.bag = {
    merge(bag) {
      const lines = [];
      bag.forEach(function (card) {
        const same = lines.find(function (line) { return line.slot && line.slot === card.slot && (line.size || '') === (card.size || ''); });
        if (same) same.qty = (same.qty || 1) + (card.qty || 1);
        else lines.push(Object.assign({}, card, { qty: card.qty || 1 }));
      });
      return lines;
    },

    add(card, size) {
      const line = Object.assign({}, card, { size, qty: 1, uid: 'add-' + card.slot + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) });
      App.state.set('bag', App.bag.merge(App.state.get('bag').concat([line])));
    }
  };

  Object.assign(actions, App.community.actions);

  function resetDemo() {
    Object.keys(FRESH).forEach(function (key) { App.state.set(key, FRESH[key]); });
    location.href = location.pathname + (/[?&]demo\b/.test(location.search) ? '?demo' : ''); // without ?reset, so a reload does not reset again
  }

  function addToBag(card, size, message) {
    App.bag.add(card, size);
    App.feedback.play('keep');
    App.feedback.buzz(15);
    App.feedback.toast(message || 'ADDED TO BAG');
  }

  // The guide shows once per screen, during the tour.
  function startCoach() {
    const screen = App.state.get('screen');
    if (App.state.get('onboarding') && !['tryon', 'size'].includes(screen)) App.state.set('onboarding', false);
    const spent = App.state.get('history').lastDate === App.utils.today();
    // normal use: no guide at all, the tour is over as soon as the home page is reached (the guide is only part of the video version, ?demo)
    if (!/[?&]demo\b/.test(location.search)) {
      if (App.state.get('tour') && screen === 'home') App.state.set('tour', false);
      return;
    }
    // the tour is over once the home page was reached without a guide (today's drop already spent) or the first card is in the collection:
    // otherwise the AVATAR tab would open the first-visit fitting room, without the menu
    if (App.state.get('tour') && (screen === 'collection' || (screen === 'home' && spent))) App.state.set('tour', false);
    if (App.state.get('tour') && !App.state.get('gate') && App.data.COACH[screen] && !App.state.get('coached').includes(screen) && !(screen === 'home' && spent)) {
      App.state.set('coached', App.state.get('coached').concat([screen]));
      App.state.set('coach', { screen, i: 0 });
    } else if (App.state.get('coach').screen && App.state.get('coach').screen !== screen) {
      App.state.set('coach', { screen: '', i: -1 });
    }
  }

  // The hoodie is open (this happens once): the intro starts.
  App.afterZip = function () {
    App.state.set('zipped', true);
    App.state.set('screen', 'welcome');
  };

  // The guide: a tap goes to the next step. On a step that asks for a tap on the lit part, that tap does the job.
  function coachTap(event) {
    const coach = App.state.get('coach');
    const root = event.target.closest('[data-coach]');
    if (!root || !coach.screen) return;
    const steps = App.data.COACH[coach.screen];
    const step = steps[coach.i];
    const lit = document.querySelector(step.target);
    const hole = lit ? lit.getBoundingClientRect() : { left: 0, right: 0, top: 0, bottom: 0 };
    const inside = event.clientX >= hole.left && event.clientX <= hole.right && event.clientY >= hole.top && event.clientY <= hole.bottom;
    if (coach.i + 1 < steps.length) {
      App.state.set('coach', { screen: coach.screen, i: coach.i + 1 });
      return;
    }
    App.state.set('coach', { screen: '', i: -1 });
    if (coach.screen === 'collection') App.state.set('tour', false); // the tour is over
    if (step.act && inside) actions[step.act]();
  }

  function submitName(event) {
    if (event) {
      if (!event.target.matches('[data-name-form]')) return;
      event.preventDefault();
    }
    const name = document.querySelector('#player-name').value.trim().toUpperCase() || 'RM_PLAYER';
    App.state.set('player', Object.assign({}, App.state.get('player'), { name }));
    App.state.set('onboarding', true);      // the first fitting room, with its CONTINUE: only after the name
    App.state.set('screen', 'tryon');
  }

  function redrawInventory() {
    App.render.inventory();
    App.render.reveal();
  }

  // EDIT HERE: which part of the page to redraw when a piece of state changes.
  const redraw = {
    screen() {
      App.render.screen();
      App.render.focusScreenTitle();
      if (App.state.get('screen') === 'size') App.render.sizes();
      if (['welcome', 'spawn', 'name', 'tryon'].includes(App.state.get('screen'))) {
        App.render.intro();
        App.render.fit();
      }
      startCoach();
      if (App.state.get('screen') === 'lobby') { App.community.drawLobby(); App.community.showFeed(); }
      if (App.state.get('screen') === 'winner') App.community.drawWinner();
      if (App.state.get('screen') === 'home') App.community.drawGoal();
      if (App.state.get('screen') === 'tryon') App.avatar3d.show();
      else App.avatar3d.hide();
      App.render.write(document.querySelector('.screen:not([hidden])'));
      if (['home', 'bag', 'collection'].includes(App.state.get('screen'))) redrawInventory();
      App.render.drop();
    },
    outfit() {
      App.render.fit();
      App.render.sizes();
      if (App.state.get('screen') === 'lobby') App.community.drawTimer();
    },
    votes() {
      if (App.state.get('screen') === 'lobby') App.community.drawLobby();
    },
    myVotes() {
      if (App.state.get('screen') === 'lobby') App.community.drawLobby();
    },
    fitTab: App.render.fit,
    outfitSizes: App.render.sizes,
    player: App.render.intro,
    coach() {
      setTimeout(App.render.coach, 380); // after the screen has slid in
    },
    gate: App.render.screen,
    hoodie: App.render.hoodie,
    unzipStarted: App.render.unzip,
    unzipStatus: App.render.unzip,
    fingerMode: App.render.unzip,
    fingerOffer: App.render.unzip,
    deck: App.render.reveal,
    bag: App.render.bag,
    checkoutNote: App.render.bag,
    shopVariants: App.render.home,
    shopSizes: App.render.home,
    sheet: App.render.sheet,
    collectionTab() {
      App.render.inventory();
      document.querySelector('[data-collection-body]').scrollTop = 0;
    },
    history() {
      App.render.drop();
    },
    inventory() {
      redrawInventory();
      App.community.drawGoal();
    },
    toast: App.render.toast,
    clock: App.render.clock,
    countdown() {
      App.render.countdown();
      App.packs.refreshHint();
      if (App.state.get('screen') === 'lobby') App.community.drawLobby();
    }
  };

  function runAction(event) {
    const element = event.target.closest('[data-action]');
    if (element && actions[element.dataset.action]) {
      actions[element.dataset.action](element);
    }
  }

  function redrawChangedState(event) {
    if (redraw[event.detail.key]) redraw[event.detail.key]();
  }

  function start() {
    App.shared.keep(['bag', 'inventory', 'collectionCard', 'outfit', 'history', 'player', 'tour', 'zipped', 'coached', 'dupes']);

    document.addEventListener('click', runAction);
    document.addEventListener('click', coachTap);
    // a step that lets your finger through ends with the first touch
    document.addEventListener('pointerdown', function () {
      if (App.state.get('coach').screen && App.data.COACH[App.state.get('coach').screen][App.state.get('coach').i].pass) App.state.set('coach', { screen: '', i: -1 });
    }, true);
    document.addEventListener('submit', submitName);
    window.addEventListener('resize', function () {
      App.render.coach();
      App.render.tabbarShape();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && App.state.get('sheet').kind) actions['close-sheet']();
    });
    // the counter of the card pager follows the swipe
    document.addEventListener('scroll', function (event) {
      if (!event.target.matches || !event.target.matches('[data-pager]')) return;
      const count = document.querySelector('[data-pager-count]');
      const total = event.target.children.length;
      count.textContent = Math.min(total, Math.round(event.target.scrollLeft / event.target.clientWidth) + 1) + ' / ' + total;
    }, true);
    document.addEventListener('state-change', redrawChangedState);

    if (/reset/.test(location.search)) resetDemo(); // ?reset in the address starts the demo again

    App.profile.choose(true); // today's hoodie, the 3 boosters, and who you are

    // The hoodie closes the app once, at the very start (?nogate skips it, to test the rest).
    // After that, the booster of the day opens from the site: the hoodie never comes back.
    const spent = App.state.get('history').lastDate === App.utils.today();
    const gate = !App.state.get('zipped') && !/nogate/.test(location.search);
    App.state.set('gate', gate);
    // Behind the opening hoodie: a blank white page (the intro starts when it is gone, see App.afterZip).
    App.state.set('screen', gate ? 'blank' : (spent || App.state.get('player').name ? 'home' : 'welcome'));
    App.render.home();
    App.render.screen();
    App.render.drop();
    App.render.bag();
    App.render.reveal();
    App.render.toast();
    App.render.intro();
    App.render.fit();

    App.clock.start();
    App.community.start();
    // the 3D avatars load in the background from the start of the intro, and again as soon as the avatar is chosen
    App.avatar3d.preload();
    redrawInventory();

    App.packs.build();
  }

  start();
})();
