// community.js: the other players. Everything is simulated in the browser (no server): ~40 fake players,
// a live feed, the lobby, BEST FIT OTD, the shared goal and sharing a card.
// EDIT HERE: PLAYERS (handles, cities), FEED_EVERY_MS, GOAL.

(function () {
  window.App = window.App || {};

  const FEED_EVERY_MS = 3000;
  const GOAL = { base: 668, total: 1000 };
  const HANDLES = ['KAILA_93', 'NOAH.TKY', 'lil.marcel', 'STONEH@VEN_GRL', 'zip.me.up', 'MAYA_LDN', 'RUBEN.B', 'sol.nyc', 'AKIRA_77', 'bloody.apple', 'EMI.SEOUL', 'dax.geneva', 'LOLA_PRS', 'tobi.404', 'NINA.BRLN', 'kid.gunbelt', 'YUKI_TKY', 'marcel.xx', 'JADE.NYC', 'leo.zrh', 'SANA_SEL', 'big.zipper', 'OTTO_BRLN', 'mia.paris', 'KENJI.OSK', 'pink.drop', 'IVY_LDN', 'raf.lausanne', 'ZOE.NYC', 'nuke.town', 'HANA_SEL', 'cal.berlin', 'RIO_TKY', 'lux.gva', 'VERA_PRS', 'jun.seoul', 'ABEL.LDN', 'tess.nyc', 'SKY_ZRH', 'wren.tky'];
  const CITIES = ['PARIS', 'TOKYO', 'LONDON', 'BERLIN', 'NYC', 'GENEVA', 'SEOUL', 'ZURICH', 'LAUSANNE', 'OSAKA'];
  const PLACES = { jacket: 'bigzip', tee: 'tee', bottom: 'jog', belt: 'gunbelt', backdrop: 'runway' };

  // How the flat pictures of the garments sit on the flat avatar pictures (fractions of the picture).
  const FLAT = {
    f: { aspect: 502 / 1500, jacket: { top: 0.15, w: 0.7 }, tee: { top: 0.165, w: 0.56 }, bottom: { top: 0.35, bottom: 0.94, cap: 0.6 }, belt: { cy: 0.385, w: 0.3 } },
    m: { aspect: 620 / 1489, jacket: { top: 0.14, w: 0.8 }, tee: { top: 0.15, w: 0.66 }, bottom: { top: 0.34, bottom: 0.94, cap: 0.56 }, belt: { cy: 0.37, w: 0.3 } }
  };

  // a small seeded random: the same fake players on every visit
  function seeded(seed) {
    let t = seed;
    return function () {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  const rand = seeded(2610);
  function pickOf(list) { return list[Math.floor(rand() * list.length)]; }

  // Every fake player wears a full outfit: a jacket or a tee, trousers and a belt (shoes come with the avatar).
  const JACKETS = App.data.CARDS.filter(function (x) { return x.group === 'bigzip'; });
  const TEES = App.data.CARDS.filter(function (x) { return x.group === 'tee'; });
  const JOGS = App.data.CARDS.filter(function (x) { return x.group === 'jog'; });
  const BELTS = App.data.CARDS.filter(function (x) { return x.group === 'gunbelt'; });
  const PLAYERS = HANDLES.map(function (handle, i) {
    const outfit = { jacket: '', tee: '', bottom: JOGS[i % JOGS.length].slot, belt: BELTS[(i * 4 + 1) % BELTS.length].slot, backdrop: '' };
    if (i % 3 === 1) outfit.tee = TEES[i % TEES.length].slot;
    else outfit.jacket = JACKETS[(i * 5) % JACKETS.length].slot;
    if (i % 4 === 2) outfit.tee = TEES[(i + 1) % TEES.length].slot;
    return { id: 'p' + i, handle: handle.toUpperCase(), city: CITIES[(i * 3) % CITIES.length], avatar: i % 2 === 0 ? 'm' : 'f', outfit, online: i % 3 !== 2, votes: 12 + Math.floor(rand() * 260) };
  });

  function card(slot) {
    return App.data.CARDS.find(function (c) { return c.slot === slot; });
  }

  function me() {
    return { id: 'me', handle: (App.state.get('player').name || 'RM_PLAYER').toUpperCase(), city: 'GENEVA', avatar: App.state.get('player').avatar || 'f', outfit: App.state.get('outfit') };
  }

  // ---- a dressed flat avatar, as HTML: used by the lobby and by the gallery
  function layerStyle(avatar, place, slot) {
    const g = FLAT[avatar];
    const ratio = App.data.FIT_PIECES[slot];
    if (!ratio) return '';
    let wf;
    let top;
    if (place === 'bottom') {
      wf = Math.min((g.bottom.bottom - g.bottom.top) * ratio / g.aspect, g.bottom.cap);
      top = g.bottom.top;
    } else {
      wf = g[place].w;
      top = place === 'belt' ? g.belt.cy - wf * g.aspect / ratio / 2 : g[place].top;
    }
    const hf = wf * g.aspect / ratio;
    return 'left:' + (0.5 - wf / 2) * 100 + '%;top:' + top * 100 + '%;width:' + wf * 100 + '%;height:' + hf * 100 + '%';
  }

  // The dressed avatar as a picture: the 3D avatar with its 3D clothes, rendered off screen (App.avatar3d.snapshot).
  // The flat picture of the avatar shows while it renders, and stays if 3D is missing.
  // the pictures already rendered: a redraw of the lobby puts them back at once, without flashing the flat picture
  const snapUrls = {};

  function figureHtml(avatar, outfit, extra, w, h) {
    if (!(App.avatar3d && App.avatar3d.available())) return flatFigureHtml(avatar, outfit, extra);
    const key = encodeURIComponent(JSON.stringify([avatar, outfit])) + '|' + (w || 240);
    const done = snapUrls[key];
    return '<img class="snap ' + (extra || '') + (done ? ' is-3d' : '') + '" data-w="' + (w || 240) + '" data-h="' + (h || 600) + '" src="' + (done || 'assets/avatar_' + avatar + '.png') + '" alt="" draggable="false" data-snap="' + encodeURIComponent(JSON.stringify([avatar, outfit])) + '"' + (done ? ' data-done="1"' : '') + ' />';
  }

  function hydrate(root) {
    (root || document).querySelectorAll('img[data-snap]:not([data-done])').forEach(function (image) {
      image.dataset.done = '1';
      const args = JSON.parse(decodeURIComponent(image.dataset.snap));
      App.avatar3d.snapshot(args[0], args[1], +image.dataset.w || 240, +image.dataset.h || 600).then(function (url) {
        if (!url) return;
        // keep the flat picture if the render came out empty (a lost WebGL context, a texture not ready...)
        const probe = new Image();
        probe.onload = function () {
          const k = document.createElement('canvas');
          k.width = 24;
          k.height = 60;
          const g = k.getContext('2d');
          g.drawImage(probe, 0, 0, 24, 60);
          const d = g.getImageData(0, 0, 24, 60).data;
          let n = 0;
          for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++;
          if (n > 60) { image.src = url; image.classList.add('is-3d'); snapUrls[image.dataset.snap + '|' + (+image.dataset.w || 240)] = url; } else delete image.dataset.done;
        };
        probe.src = url;
      });
    });
  }

  function flatFigureHtml(avatar, outfit, extra) {
    const g = FLAT[avatar];
    const order = ['bottom', 'tee', 'jacket', 'belt'];
    return '<div class="fig ' + (extra || '') + '" style="aspect-ratio:' + g.aspect + '"><img class="fig-base" src="assets/avatar_' + avatar + '.png" alt="" draggable="false" />' +
      order.map(function (place) {
        return outfit[place] ? '<img class="fig-layer" src="assets/fit/' + outfit[place] + '.png" alt="" draggable="false" style="' + layerStyle(avatar, place, outfit[place]) + '" />' : '';
      }).join('') + '</div>';
  }

  function piecesOf(outfit) {
    return ['jacket', 'tee', 'bottom', 'belt'].map(function (p) { return outfit[p]; }).filter(Boolean).map(function (slot) { return card(slot); });
  }

  function backdropOf(outfit) {
    const c = card(outfit.backdrop);
    // The special card already contains an avatar: do not put a second one over it.
    return c && c.group !== 'special' ? c.img : 'assets/runway/stonehaven-2.jpg';
  }

  // ---- live feed
  let feed = [];
  let feedTimer = 0;
  let online = 47;
  const pad = function (n) { return String(n).padStart(2, '0'); };
  function clockText() {
    const d = new Date();
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function randomPlayer() { return PLAYERS[Math.floor(Math.random() * PLAYERS.length)]; }

  function line() {
    const p = randomPlayer();
    const roll = Math.random();
    let text;
    if (roll < 0.28) text = p.handle + ' (' + p.city + ') PULLED A ' + (Math.random() < 0.5 ? 'LEGENDARY' : 'RARE');
    else if (roll < 0.5) text = p.handle + ' COPIED ' + (Math.random() < 0.5 ? 'UR FIT' : randomPlayer().handle + '\'S FIT');
    else if (roll < 0.7) text = (6 + Math.floor(Math.random() * 18)) + ' PLAYERS OPENED A DROP';
    else if (roll < 0.86) text = p.handle + ' COMPLETED ' + pickOf(['GUNBELT 9/9', 'TEE 4/4', 'JOGGING 2/2']);
    else text = p.handle + ' POSTED A FIT';
    return clockText() + ' · ' + text;
  }

  function pushLine(text) {
    feed.push(text);
    if (feed.length > 30) feed.shift();
    showFeed(text);
  }

  function showFeed(text) {
    document.querySelectorAll('[data-ticker-text]').forEach(function (element) {
      element.textContent = text;
      element.classList.remove('is-new');
      void element.offsetWidth;
      element.classList.add('is-new');
    });
  }

  function startFeed() {
    if (feedTimer) return;
    pushLine(line());
    feedTimer = setInterval(function () {
      const screen = App.state.get('screen');
      if (screen === 'home' || screen === 'lobby') pushLine(line());
      online = Math.max(40, Math.min(60, online + Math.round(Math.random() * 4 - 2)));
      document.querySelectorAll('[data-online]').forEach(function (e) { e.textContent = online; });
    }, FEED_EVERY_MS);
  }

  // ---- the shared goal, on the home page
  function drawGoal() {
    const mine = App.data.CARDS.filter(function (c) { return c.group === 'gunbelt' && App.state.get('inventory').indexOf(c.slot) !== -1; }).length;
    const n = GOAL.base + mine;
    document.querySelectorAll('[data-goal-text]').forEach(function (e) {
      e.textContent = 'THE COMMUNITY COLLECTED ' + n + ' / ' + GOAL.total + ' GUNBELTS → NEW COLOUR UNLOCKS FRIDAY';
    });
    document.querySelectorAll('[data-goal-bar]').forEach(function (e) { e.style.width = n / GOAL.total * 100 + '%'; });
  }

  // ---- the lobby: a lookbook, 2 columns of portrait frames, one player each
  const LOOKBOOK = 12;
  function shortPieces(outfit) {
    return piecesOf(outfit).map(function (x) { return x.name.replace(' BIGZIP HOODIE', ' BIGZIP').replace(' SOUVENIR TEE', ' TEE').replace('SPIRAL JOGGING ', 'SPIRAL JOGGING ').replace(' GUNBELT', ' GUNBELT'); }).join(' · ');
  }

  function frameHtml(p, rank) {
    const isMe = p.id === 'me';
    const votes = App.state.get('votes');
    return '<li class="look"><button class="look-frame' + (isMe ? ' is-me' : '') + '" type="button" data-action="open-sheet" data-sheet="player" data-id="' + p.id + '" aria-label="' + p.handle + ', ' + p.city + '">' +
      '<span class="look-floor"></span><span class="look-u"><b>' + rank + '</b>' + p.handle + (isMe ? '<i class="me-dot"></i>' : '') + '</span>' + figureHtml(p.avatar, p.outfit, 'look-fig') + '</button>' +
      '<button class="bf-vote" type="button" data-action="vote" data-id="' + p.id + '"' + (votes[p.id] ? ' disabled' : '') + '><span>' + (votes[p.id] ? 'VOTED' : 'VOTE') + '</span><span>' + p.shown + '</span></button></li>';
  }

  function drawLobby() {
    const grid = document.querySelector('[data-lobby-grid]');
    if (!grid) return;
    document.querySelector('[data-bestfit-head]').textContent = 'BEST FIT OTD · ENDS IN ' + App.state.get('countdown');
    grid.innerHTML = contestEntries().map(function (p, i) { return frameHtml(p, i + 1); }).join('');
    hydrate(grid);
    if (following) followMine();
  }

  // the countdown ticks every second: only its line changes, the frames are not drawn again
  function drawTimer() {
    const head = document.querySelector('[data-bestfit-head]');
    if (head) head.textContent = 'BEST FIT OTD · ENDS IN ' + App.state.get('countdown');
  }

  // during the demo the screen follows your frame as it climbs
  function followMine() {
    const mine = document.querySelector('.look-frame[data-id="me"]');
    if (mine) mine.closest('.look').scrollIntoView({ block: 'center', behavior: App.utils && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  // ---- BEST FIT OTD
  function contestEntries() {
    const votes = App.state.get('votes');
    const posted = App.state.get('posted');
    const mine = Object.assign(me(), { id: 'me', online: true, votes: 0 });
    if (posted) Object.assign(mine, posted, { id: 'me', online: true, votes: App.state.get('myVotes') });
    const list = [mine].concat(PLAYERS.slice(0, LOOKBOOK - 1).map(function (p) { return Object.assign({}, p); }));
    list.forEach(function (e) { e.shown = e.votes + (votes[e.id] ? 1 : 0); });
    return list.sort(function (a, b) { return b.shown - a.shown; });
  }

  // ---- the winner and its blog article
  function drawWinner() {
    const entry = App.state.get('posted') ? Object.assign({}, App.state.get('posted')) : Object.assign(me(), { outfit: App.state.get('outfit') });
    const d = new Date();
    const date = pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear();
    document.querySelector('[data-winner-body]').innerHTML =
      '<p class="hand-small">congrats, ' + entry.handle.toLowerCase() + '</p>' +
      '<div class="win-card" style="background-image:url(' + backdropOf(entry.outfit) + ')">' + figureHtml(entry.avatar, entry.outfit) + '</div>' +
      '<p class="win-line">UR FIT IS ON THE BLOG</p>' +
      '<button class="button button-primary" type="button" data-action="claim-gift">CLAIM UR GIFT</button>' +
      '<button class="button" type="button" data-action="share-fit">SHARE</button>';
    hydrate(document.querySelector('[data-winner-body]'));
  }

  // ---- the player sheet and the card to send
  function sheetFor(state, body, setTitle) {
    if (state.kind === 'player') {
      const p = state.id === 'me' ? Object.assign(me(), { online: true }) : PLAYERS.find(function (x) { return x.id === state.id; });
      if (!p) return false;
      setTitle(p.handle + ' · ' + p.city);
      const total = piecesOf(p.outfit).reduce(function (sum, x) { return sum + (x.price || 0); }, 0);
      body.innerHTML = '<div class="player-sheet"><div class="player-big"><span class="look-floor"></span>' + figureHtml(p.avatar, p.outfit, 'look-fig', 480, 900) + '</div>' +
        '<p class="player-head"><span class="dot-online"></span><b>' + (p.online ? 'ONLINE' : 'OFFLINE') + '</b><span>' + p.city + '</span></p>' +
        '<ul class="player-pieces">' + piecesOf(p.outfit).map(function (x) { return '<li><span>' + x.name + '</span><em>' + x.price + ' CHF</em></li>'; }).join('') + '<li class="player-total"><span>TOTAL</span><em>' + total + ' CHF</em></li></ul>' +
        (p.id === 'me' ? '' : '<div class="player-actions"><button class="button button-primary" type="button" data-action="copy-fit" data-id="' + p.id + '">COPY FIT</button>' +
        '<button class="button" type="button" data-action="open-sheet" data-sheet="send" data-id="' + p.id + '">SEND A CARD</button></div>') + '</div>';
      hydrate(body);
      return true;
    }
    if (state.kind === 'send') {
      const p = PLAYERS.find(function (x) { return x.id === state.id; });
      const dupes = App.state.get('dupes');
      const dupeSlots = Object.keys(dupes).filter(function (slot) { return dupes[slot] > 0; });
      // duplicates first, then the cards you own: a card you give is gone from your collection
      const owned = App.state.get('inventory').filter(function (slot) { return dupeSlots.indexOf(slot) === -1; });
      const slots = dupeSlots.concat(owned).slice(0, 12);
      setTitle('SEND A CARD');
      body.innerHTML = slots.length
        ? '<p class="hint">PICK A CARD FOR ' + p.handle + '</p><ul class="send-list">' + slots.map(function (slot) {
          const c = card(slot);
          return '<li><button class="send-item" type="button" data-action="send-card" data-id="' + p.id + '" data-slot="' + slot + '"><img src="' + c.img + '" alt="" /><span>' + c.name + '</span><em>' + (dupes[slot] > 0 ? 'x' + dupes[slot] : 'GIVE') + '</em></button></li>';
        }).join('') + '</ul>'
        : '<p class="empty">NO CARD YET.<br>OPEN A DROP, THEN SEND ONE TO ' + p.handle + '.</p>';
      return true;
    }
    return false;
  }

  // The other player answers a gift with a card of their own, one that is not in your collection yet.
  function giftBack(player, given) {
    const owned = App.state.get('inventory');
    const pool = App.data.CARDS.filter(function (x) { return x.slot && owned.indexOf(x.slot) === -1 && x.slot !== given; });
    if (!pool.length) return;
    const gift = pool[Math.floor(Math.random() * pool.length)];
    App.state.set('inventory', App.state.get('inventory').concat([gift.slot]));
    App.feedback.play('incoming');
    App.feedback.buzz([30, 30, 30]);
    App.community.log(clockText() + ' · ' + player.handle + ' SENT A CARD TO ' + me().handle);
    App.render.showCollectionCard(gift.slot);
    App.feedback.toast(player.handle + ' SENT U ' + gift.name, 6000);
  }

  // ---- sharing: a 9:16 picture, shared with the phone or downloaded
  function loadImage(src) {
    return new Promise(function (resolve) {
      const image = new Image();
      image.onload = function () { resolve(image); };
      image.onerror = function () { resolve(null); };
      image.src = src;
    });
  }

  function coverDraw(g, image, w, h) {
    const k = Math.max(w / image.width, h / image.height);
    g.drawImage(image, (w - image.width * k) / 2, (h - image.height * k) / 2, image.width * k, image.height * k);
  }

  function frame(draw) {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const g = canvas.getContext('2d');
    return Promise.resolve(draw(g, 1080, 1920)).then(function () { return canvas; });
  }

  function footer(g, w, h, lines) {
    g.fillStyle = '#111';
    g.font = '300 44px "SFProDisplayCustom", Helvetica, Arial, sans-serif';
    g.textAlign = 'left';
    lines.forEach(function (text, i) { g.fillText(text, 72, h - 250 + i * 60); });
    return loadImage('assets/logo.png').then(function (logo) {
      if (logo) g.drawImage(logo, 72, h - 130, 340, 34);
      g.font = '300 38px "SFProDisplayCustom", Helvetica, Arial, sans-serif';
      g.textAlign = 'right';
      g.fillText('#byus #foryou', w - 72, h - 100);
    });
  }

  // The special card: the winner's own avatar on the runway, thin white lines, a few words. Drawn when the gift is claimed.
  function giftCardUrl(entry) {
    const shot = App.avatar3d && App.avatar3d.available() ? App.avatar3d.snapshot(entry.avatar, entry.outfit, 540, 1350) : Promise.resolve(null);
    const W = 600, H = 690;      // the proportions of the picture area of a card
    return Promise.all([loadImage(backdropOf(entry.outfit)), shot.then(function (url) { return loadImage(url || 'assets/avatar_' + entry.avatar + '.png'); }), document.fonts && document.fonts.load ? document.fonts.load('80px RMHand') : null]).then(function (images) {
      const k = document.createElement('canvas');
      k.width = W; k.height = H;
      const g = k.getContext('2d');
      g.fillStyle = '#111';
      g.fillRect(0, 0, W, H);
      if (images[0]) coverDraw(g, images[0], W, H);
      g.fillStyle = 'rgba(0,0,0,0.28)';
      g.fillRect(0, 0, W, H);
      if (images[1]) {
        const fh = H * 0.68;
        const fw = fh * images[1].width / images[1].height;
        g.drawImage(images[1], W * 0.6 - fw / 2, H * 0.1, fw, fh);
      }
      g.strokeStyle = 'rgba(255,255,255,0.9)';
      g.lineWidth = 2;
      g.strokeRect(22, 22, W - 44, H - 44);
      g.fillStyle = '#fff';
      g.textBaseline = 'alphabetic';
      g.font = '22px ui-monospace, Menlo, monospace';
      g.textAlign = 'left';
      g.fillText('BEST FIT OTD', 44, 66);
      g.textAlign = 'right';
      g.fillText('1 / 1', W - 44, 66);
      g.textAlign = 'left';
      g.font = '92px RMHand, "Bradley Hand", cursive';
      g.fillText('best', 44, H - 150);
      g.fillText('fit', 44, H - 78);
      g.font = '22px ui-monospace, Menlo, monospace';
      g.fillText(entry.handle + ' · ' + entry.city, 44, H - 44);
      g.textAlign = 'right';
      g.fillText('RM$', W - 44, H - 44);
      return k.toDataURL('image/png');
    });
  }

  function fitCanvas(entry) {
    const g0 = FLAT[entry.avatar];
    const shot = App.avatar3d && App.avatar3d.available() ? App.avatar3d.snapshot(entry.avatar, entry.outfit, 540, 1350) : Promise.resolve(null);
    return frame(function (g, w, h) {
      return Promise.all([loadImage(backdropOf(entry.outfit)), shot.then(function (url) { return loadImage(url || 'assets/avatar_' + entry.avatar + '.png'); })]).then(function (images) {
        g.fillStyle = '#fff';
        g.fillRect(0, 0, w, h);
        if (images[0]) { coverDraw(g, images[0], w, h); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, 0, w, h); }
        const fh = h * 0.74;
        const fw = fh * (images[1] ? images[1].width / images[1].height : g0.aspect);
        if (images[1]) g.drawImage(images[1], (w - fw) / 2, h * 0.1, fw, fh);
        g.fillStyle = '#111';
        g.font = '300 64px "SFProDisplayCustom", Helvetica, Arial, sans-serif';
        g.textAlign = 'left';
        g.fillText(entry.handle, 72, 110);
        g.font = '300 40px "SFProDisplayCustom", Helvetica, Arial, sans-serif';
        g.fillText(entry.city + ' · ' + new Date().toLocaleDateString('en-GB'), 72, 168);
        return footer(g, w, h, piecesOf(entry.outfit).slice(0, 4).map(function (c) { return c.name; }));
      });
    });
  }

  function cardCanvas(c) {
    return frame(function (g, w, h) {
      return loadImage(c.img).then(function (image) {
        g.fillStyle = '#fff';
        g.fillRect(0, 0, w, h);
        g.strokeStyle = '#111';
        g.lineWidth = 4;
        g.strokeRect(120, 200, w - 240, 1250);
        if (image) {
          const k = Math.min((w - 320) / image.width, 1000 / image.height);
          g.drawImage(image, (w - image.width * k) / 2, 300 + (1000 - image.height * k) / 2, image.width * k, image.height * k);
        }
        g.fillStyle = '#111';
        g.font = '300 52px "SFProDisplayCustom", Helvetica, Arial, sans-serif';
        g.textAlign = 'center';
        g.fillText(c.name, w / 2, 1380);
        g.textAlign = 'left';
        return footer(g, w, h, ['I GOT A ' + c.rarity.toUpperCase() + ' CARD']);
      });
    });
  }

  function share(canvasPromise, name) {
    canvasPromise.then(function (canvas) {
      canvas.toBlob(function (blob) {
        if (!blob) { App.feedback.toast('CANNOT SHARE HERE'); return; }
        const file = new File([blob], name + '.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: 'RM$', text: '#byus #foryou' }).catch(function () {});
        } else {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = name + '.png';
          link.click();
          App.feedback.toast('PICTURE SAVED');
        }
      }, 'image/png');
    }).catch(function () { App.feedback.toast('CANNOT SHARE HERE'); });
  }

  // ---- actions (merged into app.js)
  const actions = {
    'copy-fit'(button) {
      const p = PLAYERS.find(function (x) { return x.id === button.dataset.id; });
      App.state.set('outfit', Object.assign({}, p.outfit));
      App.state.set('sheet', { kind: '', id: '' });
      App.state.set('screen', 'tryon');
      App.community.log(clockText() + ' · U COPIED ' + p.handle + '\'S FIT');

    },

    'send-card'(button) {
      const dupes = Object.assign({}, App.state.get('dupes'));
      const slot = button.dataset.slot;
      if (dupes[slot]) {              // a duplicate is given away
        dupes[slot] -= 1;
        if (dupes[slot] <= 0) delete dupes[slot];
        App.state.set('dupes', dupes);
      } else if (App.state.get('inventory').indexOf(slot) !== -1) {      // a card you own: it leaves your collection
        App.state.set('inventory', App.state.get('inventory').filter(function (s) { return s !== slot; }));
      } else return;
      const p = PLAYERS.find(function (x) { return x.id === button.dataset.id; });
      App.state.set('sheet', { kind: '', id: '' });

      App.community.log(clockText() + ' · ' + me().handle + ' SENT A CARD TO ' + p.handle);
      // after your gift, the player sends one back: a card you do not have yet
      setTimeout(function () { giftBack(p, slot); }, 6000);
    },

    // The gift of the winner: a special card, shown on the card screen, then in the collection
    'claim-gift'() {
      const gift = App.data.CARDS.find(function (x) { return x.slot === 'special-bestfit'; });
      const entry = App.state.get('posted') ? Object.assign({}, App.state.get('posted')) : Object.assign(me(), { outfit: App.state.get('outfit') });
      giftCardUrl(entry).catch(function () { return null; }).then(function (url) {
        if (url) gift.img = url;            // the card carries the winner's avatar (also in the collection, for this visit)
        if (App.state.get('inventory').indexOf(gift.slot) === -1) {
          App.state.set('inventory', App.state.get('inventory').concat([gift.slot]));
        }
        App.state.set('deck', [Object.assign({}, gift, { uid: 'gift-' + Date.now() })]);
        document.querySelector('#reveal-title').dataset.write = 'ur gift for the best fit';
        App.community.log(clockText() + ' · ' + me().handle + ' WON THE SPECIAL CARD');
        App.state.set('screen', 'reveal');
        App.feedback.play('legendary');
        App.feedback.buzz([40, 40, 40, 40, 80]);
      });
    },

    // POST UR FIT: the fit you wear in the fitting room goes into the contest
    'post-fit'() {
      const mine = me();
      App.state.set('posted', { handle: mine.handle, city: mine.city, avatar: mine.avatar, outfit: Object.assign({}, App.state.get('outfit')) });
      App.community.log(clockText() + ' · ' + mine.handle + ' POSTED A FIT');
      App.state.set('screen', 'lobby');

      if (/[?&]demo\b/.test(location.search)) climb(); else trickle();
    },

    'vote'(button) {
      const votes = Object.assign({}, App.state.get('votes'));
      if (votes[button.dataset.id]) return;
      votes[button.dataset.id] = true;
      App.state.set('votes', votes);
      App.feedback.play('keep');
    },

    'share-fit'() {
      const posted = App.state.get('posted') || me();
      share(fitCanvas(posted), 'rm-fit');
    },

    'share-card'() {
      const c = App.state.get('deck')[0];
      if (c) share(cardCanvas(c), 'rm-card');
    }
  };

  let titleTaps = [];
  document.addEventListener('click', function (event) {
    // triple tap on the title of BEST FIT OTD: ends the contest and shows the winner (hidden, for the demo video)
    if (!event.target.closest('.lobby-head')) return;
    const now = Date.now();
    titleTaps = titleTaps.filter(function (t) { return now - t < 900; }).concat([now]);
    if (titleTaps.length >= 3) {
      titleTaps = [];
      stopClimb();
      if (!App.state.get('posted')) actions['post-fit']();
      stopClimb();
      App.state.set('screen', 'winner');
    }
  });

  // The demo: once the fit is posted, the other players vote for it one after the other, the frame climbs
  // in the ranking, and at the top the winner screen opens by itself.
  let climbTimer = 0;
  let following = false;      // the screen follows your frame only in the video demo (?demo)
  function stopClimb() { clearTimeout(climbTimer); following = false; }
  // Free use: a few votes arrive now and then for your fit. It does not win by itself (the winner screen stays hidden).
  function trickle() {
    stopClimb();
    App.state.set('myVotes', 0);
    const step = function () {
      if (App.state.get('posted')) {
        App.state.set('myVotes', App.state.get('myVotes') + 4 + Math.floor(Math.random() * 9));
        climbTimer = setTimeout(step, 2500);
      }
    };
    climbTimer = setTimeout(step, 2500);
  }

  function climb() {
    stopClimb();
    following = true;
    App.state.set('myVotes', 0);
    const step = function () {
      const list = contestEntries();
      const top = list.find(function (e) { return e.id !== 'me'; });
      const mine = list.find(function (e) { return e.id === 'me'; });
      if (mine.shown > top.shown) {
        // first place: a pause to see it, then the winner
        climbTimer = setTimeout(function () {
          if (App.state.get('screen') !== 'lobby') return;
          App.community.log(clockText() + ' · ' + mine.handle + ' IS THE BEST FIT OTD');
          App.state.set('screen', 'winner');
        }, 1600);
        return;
      }
      const gain = 18 + Math.floor(Math.random() * 30);
      App.state.set('myVotes', App.state.get('myVotes') + gain);
      App.feedback.play('common');
      climbTimer = setTimeout(step, 1100);
    };
    climbTimer = setTimeout(step, 2200);
  }

  // Draw the lobby pictures in the background right after the models are loaded, so the lobby opens already full.
  function warm() {
    if (!(App.avatar3d && App.avatar3d.available())) return;
    contestEntries().forEach(function (e) { App.avatar3d.snapshot(e.avatar, e.outfit, 240, 600); });
  }

  App.community = {
    warm,
    drawTimer,
    PLAYERS,
    actions,
    start() {
      startFeed();
      drawGoal();
    },
    log: pushLine,
    drawGoal,
    drawLobby,
    drawWinner,
    sheet: sheetFor,
    showFeed() {
      if (feed.length) showFeed(feed[feed.length - 1]);
    }
  };
})();
