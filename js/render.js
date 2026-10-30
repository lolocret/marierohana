// render.js: the only file that changes what is on the page from the state.
// Each function reads the state and updates the matching part of the HTML.
// (Gesture files write per-frame values: fog.js, booster.js and cards.js while a finger is down.)

(function () {
  window.App = window.App || {};

  const BADGES = { common: 'COMMON', rare: 'RARE', legendary: 'LEGENDARY' };

  // Writes text into every element marked data-show="name".
  function show(name, text) {
    document.querySelectorAll('[data-show="' + name + '"]').forEach(function (element) {
      element.textContent = text;
    });
  }

  function silhouette(card) {
    return '<svg class="silhouette" viewBox="0 0 100 100" role="img" aria-label="' + card.name + '" ' +
      'fill="var(--swatch-' + card.c + ')" stroke="var(--color-ink)" stroke-width="1.5" stroke-linejoin="round">' +
      App.data.SILHOUETTES[card.kind] + '</svg>';
  }

  function packshot(card) {
    return '<div class="packshot' + (card.photo ? ' is-photo' : '') + '">' +
      '<img src="' + card.img + '" alt="' + card.name + '" draggable="false" data-fallback="' + card.uid + '"></div>';
  }

  function dots(card) {
    return '<div class="dots" aria-hidden="true">' + (card.swatches || []).map(function (color) {
      return '<span class="dot' + (color === card.c ? ' is-current' : '') + '" style="--dot: var(--swatch-' + color + ')"></span>';
    }).join('') + '</div>';
  }

  function priceLine(card) {
    if (!card.price) return '';
    return '<p class="price"><em>' + card.price + ' CHF</em>' + (card.soldout ? ' <span class="soldout">SOLD OUT</span>' : '') + '</p>';
  }

  function metaLine(card) {
    const passed = card.passed ? 'PASSED BY A PLAYER IN ' + card.passed.city + ', ' + card.passed.time : '';
    const lines = [card.meta, card.fromOther ? passed || 'PASSED BY ANOTHER PLAYER' : ''].filter(Boolean);
    return lines.length ? '<p class="meta">' + lines.join(' / ') + '</p>' : '';
  }

  // Ink splatter: only on RARE and LEGENDARY cards, small, in a corner.
  const SPLATTER = '<path d="M44 40 C50 30 62 32 64 42 C72 44 74 56 64 60 C62 68 50 70 46 62 C36 62 32 50 40 46 C38 44 40 42 44 40 Z"/>' +
    '<path d="M64 42 C74 34 84 26 92 22 C86 30 78 38 70 46 Z"/><path d="M40 56 C30 62 20 70 12 80 C22 72 32 64 42 58 Z"/>' +
    '<path d="M52 66 C54 76 52 84 50 94 C46 84 46 74 48 66 Z"/>' +
    '<circle cx="90" cy="12" r="2.6"/><circle cx="18" cy="88" r="2.2"/><circle cx="80" cy="72" r="3"/><circle cx="24" cy="30" r="2"/><circle cx="94" cy="50" r="1.6"/>';

  function splatter(card) {
    if (card.rarity === 'common' || card.group === 'special') return '';
    const place = ['a', 'b', 'c'][(card.uid || card.name).length % 3];
    return '<svg class="splatter splatter-' + place + ' splatter-' + card.rarity + '" viewBox="0 0 100 100" aria-hidden="true">' + SPLATTER + '</svg>';
  }

  // A card looks like its product page: packshot on white, name, italic price, colour dots.
  function cardHtml(card) {
    return '<div class="card-top"><span class="badge badge-' + card.rarity + '">' + BADGES[card.rarity] + '</span>' +
      '<span class="tag">' + (card.buy ? 'BUYABLE' : 'COLLECT ONLY') + '</span></div>' +
      packshot(card) + splatter(card) +
      '<h2 class="name">' + card.name + '</h2>' + priceLine(card) + dots(card) + metaLine(card);
  }

  // A line of the bag, like the cart page of the brand's site.
  // The size buttons: one size is chosen at a time. A product with only one size does not ask.
  function sizesHtml(sizes, chosen, action, data) {
    return '<div class="sizes" role="group" aria-label="Size">' + sizes.map(function (size) {
      return '<button class="size-button" type="button" data-action="' + action + '" ' + data + ' data-size="' + size + '" aria-pressed="' + (size === chosen) + '">' + size + '</button>';
    }).join('') + '</div>';
  }

  function bagRowHtml(card) {
    const asks = (card.sizes || []).length > 1; // a bag saved by an older version has no sizes
    return '<article class="bag-row">' + packshot(card) +
      '<div class="bag-info"><h2 class="name">' + card.name + '</h2>' + priceLine(card) +
      (asks ? sizesHtml(card.sizes, card.size, 'set-size', 'data-id="' + card.uid + '"') : '<p class="tag">SIZE ' + (card.size || '') + '</p>') +
      '<p class="tag">' + (card.buy ? BADGES[card.rarity] : 'COLLECT ONLY / ' + BADGES[card.rarity]) + '</p>' +
      '<div class="qty"><span>QTY</span><button type="button" data-action="qty-down" data-id="' + card.uid + '" aria-label="One less">&minus;</button><b>' + (card.qty || 1) + '</b><button type="button" data-action="qty-up" data-id="' + card.uid + '" aria-label="One more">+</button></div>' +
      '<button class="text-button" type="button" data-action="remove-from-bag" data-id="' + card.uid + '">REMOVE</button></div>' +
      '</article>';
  }

  // A photo that does not load is replaced by a drawn silhouette in the product colour.
  document.addEventListener('error', function (event) {
    const image = event.target;
    if (!image.matches || !image.matches('img[data-fallback]')) return;
    const card = App.state.get('deck').concat(App.state.get('bag')).find(function (c) {
      return c.uid === image.dataset.fallback;
    });
    if (card) image.outerHTML = silhouette(card);
  }, true);

  function inventoryCount(album) {
    const inventory = App.state.get('inventory');
    return album.slots.filter(function (card) { return inventory.indexOf(card.slot) !== -1; }).length;
  }

  // "4/26": every card you own, out of all the cards
  function ownedTotal() {
    return App.data.ALBUMS.reduce(function (sum, album) { return sum + inventoryCount(album); }, 0);
  }

  const KIND_PLACE = { hoodie: 'jacket', tee: 'tee', jog: 'bottom', belt: 'belt', eye: 'backdrop' };
  const GEMS = { common: 1, rare: 2, legendary: 3 };

  // The cards shown by the collection: all of them, or one category.
  function tabCards() {
    const tab = App.state.get('collectionTab');
    return App.data.ALBUMS.filter(function (a) { return tab === 'all' || a.id === tab; }).reduce(function (list, a) { return list.concat(a.slots); }, []);
  }

  function gems(card) {
    return '<span class="tile-gems" aria-hidden="true">' + new Array(GEMS[card.rarity] + 1).join('<i class="gem"></i>') + '</span>';
  }

  // A card of the grid: in colour and outlined if you own it, a pale silhouette and its number if you do not.
  function tileHtml(card, i, owned) {
    const highlighted = owned && App.state.get('collectionCard') === card.slot;
    return '<li><button class="tile' + (owned ? '' : ' is-missing') + (highlighted ? ' is-received' : '') + (card.photo ? ' is-photo' : '') + '" type="button" data-action="open-sheet" data-sheet="card" data-id="' + card.slot + '" ' +
      'aria-label="' + (owned ? card.name : 'Card ' + (i + 1) + ', not found yet') + '">' +
      '<span class="tile-no">' + String(i + 1).padStart(2, '0') + '</span><img src="' + card.img + '" alt="" draggable="false" />' + gems(card) + '</button></li>';
  }

  // One card in big, in the pager of the sheet.
  function slideHtml(card, i, total, owned) {
    const place = KIND_PLACE[card.kind];
    let actions = '';
    if (owned) {
      if (card.buy) actions += '<button class="button button-primary" type="button" data-action="collection-add" data-slot="' + card.slot + '">ADD TO BAG, ' + card.price + ' CHF</button>';
      else actions += '<p class="hint">COLLECT ONLY / ' + BADGES[card.rarity] + '</p>';
      actions += '<button class="button" type="button" data-action="wear-card" data-slot="' + card.slot + '" data-place="' + place + '">' + (place === 'backdrop' ? 'USE AS AVATAR BACKDROP' : 'TRY ON MY AVATAR') + '</button>';
    } else {
      actions = '<p class="hint">NOT FOUND YET<br>OPEN A DROP' + (card.buy ? ' OR BUY IT IN THE SHOP' : '') + '</p>';
    }
    return '<section class="slide" aria-label="Card ' + (i + 1) + ' of ' + total + '">' +
      (owned
        ? '<div class="slide-card"><div class="card' + (card.rarity === 'legendary' ? ' is-legendary' : '') + '">' + cardHtml(card) + '</div></div>'
        : '<div class="slide-card is-missing"><div class="card"><img src="' + card.img + '" alt="" /><p>???</p></div></div>') +
      '<div class="slide-info">' + actions + '</div></section>';
  }

  // the places of an outfit, and which products go there
  const FIT_TABS = [
    { id: 'jacket', title: 'JACKET', group: 'bigzip' },
    { id: 'tee', title: 'T-SHIRT', group: 'tee' },
    { id: 'bottom', title: 'TROUSERS', group: 'jog' },
    { id: 'belt', title: 'BELT', group: 'gunbelt' },
    { id: 'backdrop', title: 'BACKDROP', group: 'runway' }
  ];
  let fitTabShown = '';

  function owns(card) {
    return App.state.get('inventory').indexOf(card.slot) !== -1;
  }

  // The pieces of the outfit that can be bought: not owned yet, and on sale (the BIGZIP is drop only).
  function outfitToBuy() {
    const outfit = App.state.get('outfit');
    return FIT_TABS.map(function (tab) { return App.data.CARDS.find(function (c) { return c.slot === outfit[tab.id]; }); })
      .filter(function (card) { return card && card.buy && !owns(card); });
  }

  // The first visit: the fitting room is part of the intro (no tab bar, SUIVANT / RETOUR).
  function introPhase() {
    return App.state.get('onboarding') && !App.state.get('gate');
  }

  // A grey rectangle with the name, for an image that is not in assets/ yet.
  function placeholder(img, label) {
    img.onerror = null;
    img.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="760" viewBox="0 0 300 760"><rect width="300" height="760" fill="#e4e4e4"/><text x="150" y="385" font-family="Helvetica,Arial,sans-serif" font-size="20" letter-spacing="3" text-anchor="middle" fill="#595959">' + label + '</text></svg>');
  }

  App.render = {
    showCollectionCard(slot) {
      App.state.set('collectionCard', slot);
      App.state.set('sheet', { kind: '', id: '' });
      App.state.set('collectionTab', 'all');
      App.state.set('screen', 'collection');
      setTimeout(function () {
        if (App.state.get('screen') !== 'collection' || App.state.get('collectionCard') !== slot) return;
        const tile = document.querySelector('.tile.is-received');
        if (!tile) return;
        tile.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      }, 450);
    },

    introPhase,
    toBuy: outfitToBuy,
    // Hand-written text: the letters appear one after the other, from left to right (see .ch in app.css).
    write(root) {
      // wait for the handwriting font, so the text never shows in another font and then changes size
      if (document.fonts && document.fonts.status !== 'loaded' && !App.render.fontReady) {
        document.fonts.load('1em RMHand').then(function () { App.render.fontReady = true; App.render.write(root); });
        return;
      }
      (root || document).querySelectorAll('[data-write]').forEach(function (element) {
        const text = element.dataset.write;
        element.textContent = '';
        if (!text) return;
        element.setAttribute('aria-label', text);
        let n = 0;
        text.split(' ').forEach(function (word) {
          const wrap = document.createElement('span');
          wrap.className = 'w';
          wrap.setAttribute('aria-hidden', 'true');
          word.split('').forEach(function (letter) {
            const ch = document.createElement('span');
            ch.className = 'ch';
            ch.textContent = letter;
            ch.style.setProperty('--i', n++);
            wrap.appendChild(ch);
          });
          n++;
          element.appendChild(wrap);
          element.appendChild(document.createTextNode(' '));
        });
      });
    },

    // The intro: the avatar pictures, the name, the title of the fitting.
    intro() {
      const player = App.state.get('player');
      document.querySelectorAll('[data-avatar-img]').forEach(function (img) {
        const which = img.dataset.avatarImg === 'current' ? (player.avatar || 'f') : img.dataset.avatarImg;
        const src = 'assets/avatar_' + which + '.png';
        const label = 'AVATAR ' + which.toUpperCase();
        if (App.data.INTRO_FILES.indexOf(which) === -1) placeholder(img, label);
        else if (img.getAttribute('src') !== src) img.src = src;
      });
      App.render.avatars();
      document.querySelector('#player-name').value = player.name;
      document.querySelector('#tryon-title').dataset.write = introPhase() ? 'change ur outfit, ' + (player.name || 'RM_PLAYER') : '';
    },

    avatars() {
      const chosen = App.state.get('player').avatar;
      document.querySelectorAll('.avatar-choice').forEach(function (button) {
        button.setAttribute('aria-pressed', button.dataset.avatar === chosen);
      });
    },

    // The pages that explain the experience.

    // The guide overlay: a frame on a screen section and a bubble that explains it.
    coach() {
      const state = App.state.get('coach');
      const root = document.querySelector('[data-coach]');
      const phone = document.querySelector('.phone');
      const step = state.screen && App.data.COACH[state.screen][state.i];
      root.hidden = !step;
      root.classList.toggle('is-passive', !!(step && step.pass)); // a step that lets your finger through
      phone.classList.toggle('is-coaching', !!step);
      if (!step) return;
      const target = document.querySelector(step.target);
      if (!target) return;
      target.scrollIntoView({ block: 'nearest' });
      const box = phone.getBoundingClientRect();
      const k = box.width / phone.offsetWidth || 1; // the phone may be scaled on a laptop
      const r = target.getBoundingClientRect();
      const pad = 6;
      let top = (r.top - box.top) / k - pad;
      let height = Math.min(r.height / k + pad * 2, phone.offsetHeight * 0.42);
      // the whole frame stays inside the phone: a target at the very bottom (the tab bar) is framed from above, never cut
      const room = phone.offsetHeight - 6;
      if (top + height > room) { top = Math.max(0, room - height); }
      const hole = document.querySelector('[data-coach-hole]');
      let left = (r.left - box.left) / k - pad;
      let width = r.width / k + pad * 2;
      if (step.target.indexOf('.tab') === 0) {     // a tab of the bar: a small square around its icon, not the whole cell
        const side = 52;
        const icon = (target.querySelector('svg') || target).getBoundingClientRect();
        left = (icon.left - box.left + icon.width / 2) / k - side / 2;
        width = side;
        top = (icon.top - box.top + icon.height / 2) / k - side / 2;
        height = side;
        if (top + height > phone.offsetHeight - 6) top = phone.offsetHeight - 6 - height;
      }
      hole.style.cssText = 'left:' + left + 'px;top:' + top + 'px;width:' + width + 'px;height:' + height + 'px';
      const bubble = document.querySelector('[data-coach-bubble]');
      bubble.textContent = step.text;
      const below = top + height / 2 < phone.offsetHeight / 2;
      // above the target, but never over the RETOUR / SUIVANT buttons
      const edge = Math.min(top - 14, phone.offsetHeight - 11 * 16);
      bubble.style.top = below ? top + height + 14 + 'px' : 'auto';
      bubble.style.bottom = below ? 'auto' : phone.offsetHeight - edge + 'px';
    },

    // The fitting room: a tab per place (jacket, t-shirt, trousers, belt, backdrop), a strip of pieces, all worn together.
    // Tap a piece to put it on, again to take it off. Pieces you own are free; the others show their price.
    fit() {
      const hintEl = document.querySelector('[data-drag-hint]');
      if (hintEl) {
        const avatar = App.state.get('player').avatar || 'f';
        hintEl.hidden = false;
        hintEl.innerHTML = 'DRAG THE HEAD: HOOD' + (avatar === 'f' ? ' · TAP THE HEAD: CAP' : '') + '<br />DRAG THE CHEST: ZIP';
      }
      const outfit = App.state.get('outfit');
      const tab = App.state.get('fitTab');
      document.querySelector('[data-fit-tabs]').innerHTML = FIT_TABS.map(function (t) {
        return '<button class="chip" type="button" role="tab" data-action="fit-tab" data-tab="' + t.id + '" aria-selected="' + (t.id === tab) + '">' + t.title + (outfit[t.id] ? ' <i class="chip-dot"></i>' : '') + '</button>';
      }).join('');
      const strip = document.querySelector('[data-fit-picker]');
      const scroll = fitTabShown === tab ? strip.scrollLeft : 0; // a redraw must not send the strip back to the start
      fitTabShown = tab;
      const group = FIT_TABS.find(function (t) { return t.id === tab; }).group;
      const cards = App.data.CARDS.filter(function (c) { return c.group === group && (group !== 'runway' || owns(c)); });
      strip.innerHTML = cards.length ? cards.map(function (c) {
        const note = owns(c) ? 'OWNED' : c.buy ? c.price + ' CHF' : 'DROP ONLY';
        return '<button class="fit-piece" type="button" data-action="fit-pick" data-tab="' + tab + '" data-slot="' + c.slot + '" aria-pressed="' + (c.slot === outfit[tab]) + '">' +
          '<img src="' + c.img + '" alt="" draggable="false" /><b>' + note + '</b><span>' + (c.variant || c.name) + '</span></button>';
      }).join('') : '<p class="empty">NO RUNWAY CARD YET.<br>OPEN A DROP TO FIND ONE.</p>';
      strip.scrollLeft = scroll;
      // the pieces on the avatar: each cut-out is sized and placed from the landmarks of the avatar (App.data.FIT)
      App.avatar3d.update(App.state.get('player').avatar || 'f', outfit);
      const g = App.data.FIT[App.state.get('player').avatar || 'f'];
      document.querySelector('[data-fit-figure]').style.aspectRatio = g.w + ' / ' + g.h;
      document.querySelectorAll('[data-fit-layer]').forEach(function (img) {
        const place = img.dataset.fitLayer;
        const card = App.data.CARDS.find(function (c) { return c.slot === outfit[place]; });
        img.hidden = !card;
        if (!card) return;
        const ratio = App.data.FIT_PIECES[card.slot];
        let width = g[place].width || 0;
        let height;
        let top;
        if (place === 'bottom') {
          height = g.bottom.bottom - g.bottom.top;
          width = Math.min(height * ratio, g.bottom.cap);
          height = width / ratio;
          top = g.bottom.top;
        } else {
          height = width / ratio;
          top = place === 'belt' ? g.belt.cy - height / 2 : g[place].top;
        }
        img.src = 'assets/fit/' + card.slot + '.png';
        img.alt = card.name;
        img.style.cssText = 'left:' + (g.cx - width / 2) / g.w * 100 + '%;top:' + top / g.h * 100 + '%;width:' + width / g.w * 100 + '%;height:' + height / g.h * 100 + '%';
      });
      const backdrop = App.data.CARDS.find(function (c) { return c.slot === outfit.backdrop; });
      const stage = document.querySelector('[data-fit-stage]');
      stage.style.backgroundImage = backdrop ? 'url(' + backdrop.img + ')' : '';
      stage.classList.toggle('has-backdrop', !!backdrop);
      // what there is to buy in this outfit
      const toBuy = outfitToBuy();
      const worn = FIT_TABS.some(function (t) { return outfit[t.id]; });
      // in the intro the bar is always there: it is the way on
      document.querySelector('[data-outfit-bar]').hidden = !toBuy.length && !introPhase();
      show('outfit-summary', toBuy.length ? toBuy.length + (toBuy.length > 1 ? ' PIECES' : ' PIECE') + ' TO BUY / ' + App.utils.total(toBuy) + ' CHF'
        : worn ? 'NOTHING TO BUY IN THIS OUTFIT' : 'TAP A PIECE TO TRY IT ON');
      show('outfit-cta', toBuy.length ? 'CHOOSE SIZES' : 'CONTINUE');
      document.querySelector('#tryon-title').setAttribute('aria-label', 'YOUR AVATAR');
    },

    // The size of each piece to buy, and the total.
    sizes() {
      const cards = outfitToBuy();
      const chosen = App.state.get('outfitSizes');
      document.querySelector('[data-size-list]').innerHTML = cards.length ? cards.map(function (card) {
        const one = card.sizes.length === 1;
        return '<li class="size-row"><div class="packshot"><img src="' + card.img + '" alt="" /></div><div class="size-info"><h2 class="name">' + card.name + '</h2>' + priceLine(card) +
          (one ? '<p class="tag">ONE SIZE</p>' : sizesHtml(card.sizes, chosen[card.slot], 'outfit-size', 'data-slot="' + card.slot + '"')) + '</div></li>';
      }).join('') : '<li class="empty">NOTHING TO BUY IN THIS OUTFIT.<br>GO BACK AND PICK SOME PIECES.</li>';
      show('outfit-total', App.utils.total(cards) + ' CHF');
    },

    screen() {
      const current = App.state.get('screen');
      document.querySelectorAll('[data-screen]').forEach(function (screen) {
        screen.hidden = screen.dataset.screen !== current;
      });
      App.render.curtain();
      App.render.tabs();
    },

    // Keyboard and screen-reader users land on the new screen's title, not on a hidden button.
    focusScreenTitle() {
      const closed = !document.querySelector('[data-curtain]').hidden;
      const title = closed ? document.querySelector('#unzip-title') : document.querySelector('.screen:not([hidden]) h1');
      if (title) title.focus({ preventScroll: true });
    },

    // The hoodie covers the whole phone, like a zip on a lock screen, until the site is unzipped.
    curtain() {
      const gate = App.state.get('gate');
      const curtain = document.querySelector('[data-curtain]');
      const wasHidden = curtain.hidden;
      curtain.hidden = !gate;
      document.querySelector('[data-hud]').hidden = !gate;
      if (gate && wasHidden) App.booster.measure();
      App.render.unzip();
    },

    // The shop, like a product page of the site: a photo, the name, the italic price, round colour dots
    // to change the variant, and a big grey button.
    // The shop: a grid of products. A tap opens the product in a sheet (see sheet()).
    home() {
      const picked = App.state.get('shopVariants');
      document.querySelector('[data-shop]').innerHTML = App.data.SHOP.map(function (product) {
        const card = product.variants[picked[product.group] || 0];
        return '<li><button class="shop-tile" type="button" data-action="open-sheet" data-sheet="product" data-id="' + product.group + '">' +
          '<span class="packshot"><img src="' + card.img + '" alt="" draggable="false" /></span>' +
          '<span class="eyebrow">' + product.category + '</span><span class="name">' + product.name + '</span><span class="price">' + card.price + ' CHF</span></button></li>';
      }).join('');
      if (App.state.get('sheet').kind === 'product') App.render.sheet();
    },

    // One supply drop per day: once it is spent, the button shows when the next one comes.
    drop() {
      const spent = App.state.get('history').lastDate === App.utils.today();
      document.querySelectorAll('[data-drop-banner]').forEach(function (banner) {
        banner.classList.toggle('is-spent', spent);
      });
      show('drop-label', spent ? 'NEXT IN ' + App.state.get('countdown') : 'READY TO OPEN');
      show('open-label', spent ? 'ONE DROP PER DAY' : 'OPEN DROP');
      App.render.tabs();
    },

    // The hoodie of today: its fabric, its real zip teeth, its slider.
    hoodie() {
      const hoodie = App.state.get('hoodie');
      const pack = document.querySelector('[data-pack]');
      if (!hoodie.fabric) return;
      document.querySelectorAll('[data-fabric-img]').forEach(function (image) { image.src = hoodie.fabric; });
      document.querySelectorAll('[data-teeth-left], [data-teeth-right]').forEach(function (strip) {
        strip.style.backgroundImage = 'url(' + hoodie.teeth + ')';
      });
      document.querySelector('[data-pull-img]').src = hoodie.pull;
      document.querySelector('.phone').style.setProperty('--on-fabric', hoodie.dark ? 'var(--color-paper)' : 'var(--color-ink)');
      document.querySelector('.phone').style.setProperty('--on-fabric-inverse', hoodie.dark ? 'var(--color-ink)' : 'var(--color-paper)');
      document.querySelector('.phone').style.setProperty('--scrim', hoodie.dark ? 'rgb(0 0 0 / 0.62)' : 'rgb(255 255 255 / 0.72)');
      pack.setAttribute('aria-label', hoodie.name + ' BIGZIP HOODIE, closed');
    },

    unzip() {
      const started = App.state.get('unzipStarted');
      const finger = App.state.get('fingerMode');
      document.querySelector('[data-action="use-finger"]').hidden = !App.state.get('fingerOffer') || finger;
      document.querySelector('[data-gate-start]').hidden = started;
      // The mouse-as-hand demo only makes sense on a computer.
      document.querySelectorAll('[data-action="simulate-hand"]').forEach(function (button) {
        button.hidden = !matchMedia('(pointer: fine)').matches || /[?&]demo\b/.test(location.search);      // not in the video version
      });
      // camera refused or no hand seen: the finger is the way, say so instead of asking for a hand
      const status = App.state.get('unzipStatus');
      show('unzip-status', (finger || App.state.get('fingerOffer')) && status === 'RAISE YOUR HAND' ? 'PULL THE ZIP DOWN' : status);
    },

    // The one card of the pack, given directly.
    reveal() {
      const card = App.state.get('deck')[0];
      const holder = document.querySelector('[data-reveal]');
      if (!card) { holder.innerHTML = ''; return; }
      holder.innerHTML = '<div class="card is-new' + (card.rarity === 'legendary' ? ' is-legendary' : '') + '">' + cardHtml(card) + '</div>';
      show('reveal-note', 'IN YOUR COLLECTION');
      // why it matters: how far you are from the reward of this kind of card
      const album = App.data.ALBUMS.find(function (a) { return a.id === card.group; });
      const owned = inventoryCount(album);
      show('reveal-progress', album.name + ' ' + owned + '/' + album.slots.length + (owned === album.slots.length
        ? ' · SET COMPLETE → ' + album.reward.text
        : ' · ' + (album.slots.length - owned) + ' MORE → ' + album.reward.text));
    },

    bag() {
      const bag = App.state.get('bag');
      show('bag-count', bag.reduce(function (sum, card) { return sum + (card.qty || 1); }, 0));
      const list = document.querySelector('[data-bag-list]');
      list.innerHTML = bag.length
        ? bag.map(bagRowHtml).join('')
        : '<p class="empty">YOUR BAG IS EMPTY.<br>OPEN TODAY\'S DROP.</p>';
      const subtotal = App.utils.total(bag);
      // a completed set takes its percent off the whole order (the best one counts)
      const won = App.data.ALBUMS.filter(function (a) { return a.reward.percent && inventoryCount(a) === a.slots.length; })
        .sort(function (a, b) { return b.reward.percent - a.reward.percent; })[0];
      const total = won ? Math.round(subtotal * (100 - won.reward.percent)) / 100 : subtotal;
      show('bag-total', total + ' CHF');
      show('bag-reward', won
        ? 'REWARD: ' + won.name + ' SET COMPLETE → −' + won.reward.percent + '% · CODE ' + won.reward.code
        : 'COMPLETE A SET IN YOUR COLLECTION TO WIN A DISCOUNT');
      const checkout = document.querySelector('[data-action="checkout"]');
      const needsSize = bag.some(function (card) { return (card.sizes || []).length > 0 && !card.size; });
      checkout.disabled = !total || needsSize;
      show('checkout-label', App.state.get('checkoutNote') || (needsSize ? 'CHOOSE A SIZE' : 'CHECKOUT'));
    },

    // The collection: the counters, a tab per category, the grid of cards.
    inventory() {
      const total = ownedTotal();
      const tab = App.state.get('collectionTab');
      const inventory = App.state.get('inventory');
      show('collection-owned', total);
      show('collection-total', App.data.TOTAL);
      document.querySelector('[data-collection-bar]').style.width = total / App.data.TOTAL * 100 + '%';
      document.querySelector('[data-chips]').innerHTML = '<button class="chip" type="button" role="tab" data-action="collection-tab" data-tab="all" aria-selected="' + (tab === 'all') + '">ALL <em>' + total + '/' + App.data.TOTAL + '</em></button>' +
        App.data.ALBUMS.map(function (album) {
          return '<button class="chip" type="button" role="tab" data-action="collection-tab" data-tab="' + album.id + '" aria-selected="' + (tab === album.id) + '">' + album.name + ' <em>' + inventoryCount(album) + '/' + album.slots.length + '</em></button>';
        }).join('');
      const album = App.data.ALBUMS.find(function (a) { return a.id === tab; });
      const reward = document.querySelector('[data-collection-reward]');
      if (album) {
        const owned = inventoryCount(album);
        const done = owned === album.slots.length;
        reward.className = 'reward-card' + (done ? ' is-won' : '');
        reward.innerHTML = done
          ? '<b>SURPRISE UNLOCKED</b><span>' + album.reward.text + (album.reward.code ? ' / CODE ' + album.reward.code : '') + '</span>'
          : '<b>COLLECT ALL ' + album.slots.length + ' → ' + album.reward.text + '</b>';
      } else {
        reward.className = 'reward-card';
        reward.innerHTML = '';      // the whole collection: no box (a category tab shows its own reward)
      }
      document.querySelector('[data-card-grid]').innerHTML = tabCards().map(function (card, i) {
        return tileHtml(card, i, inventory.indexOf(card.slot) !== -1);
      }).join('');
    },

    // The sheet that slides up: the menu, a product, or a card in big.
    sheet() {
      const state = App.state.get('sheet');
      const sheet = document.querySelector('[data-sheet-root]');
      const body = document.querySelector('[data-sheet-body]');
      const panel = sheet.querySelector('.sheet-panel');
      sheet.hidden = !state.kind;
      panel.className = 'sheet-panel' + (state.kind ? ' sheet-' + state.kind : '');
      if (!state.kind) { body.innerHTML = ''; return; }
      if (App.community.sheet(state, body, function (title) { show('sheet-title', title); })) {
        // a player or the card to send: drawn by community.js
      } else if (state.kind === 'menu') {
        show('sheet-title', 'MENU');
        body.innerHTML = '<ul class="sheet-links">' +
          ['RUNWAY|pages/runaway', 'BLOG|pages/blog', 'EVENT|pages/event', 'STUDIO|pages/studio'].map(function (item) {
            const parts = item.split('|');
            return '<li><a href="https://marierohana.com/' + parts[1] + '" target="_blank" rel="noopener">' + parts[0] + '<span aria-hidden="true">&rarr;</span></a></li>';
          }).join('') +
          '<li><button type="button" data-action="reset-demo">RESTART DEMO<span aria-hidden="true">&#8635;</span></button></li></ul>' +
          '<p class="sheet-clock" data-show="clock">' + App.state.get('clock') + '</p>';
      } else if (state.kind === 'product') {
        const product = App.data.SHOP.find(function (p) { return p.group === state.id; });
        const index = App.state.get('shopVariants')[product.group] || 0;
        const card = product.variants[index];
        const sizes = App.state.get('shopSizes');
        const asks = card.sizes.length > 1 && !card.soldout;
        show('sheet-title', product.name);
        body.innerHTML = '<div class="sheet-product"><div class="packshot"><img src="' + card.img + '" alt="' + card.name + '" /></div>' +
          '<h3 class="name">' + card.name + '</h3>' + priceLine(card) +
          (product.variants.length > 1 ? '<div class="dots-row" role="group" aria-label="Colour">' + product.variants.map(function (variant, i) {
            return '<button class="dot-button" type="button" data-action="shop-variant" data-group="' + product.group + '" data-i="' + i + '" aria-label="' + variant.name + '" aria-pressed="' + (i === index) + '">' +
              (product.variants.every(function (v) { return v.c === variant.c; })
                ? '<img class="thumb' + (i === index ? ' is-current' : '') + '" src="' + variant.img + '" alt="" />'
                : '<span class="dot' + (i === index ? ' is-current' : '') + '" style="--dot: var(--swatch-' + variant.c + ')"></span>') + '</button>';
          }).join('') + '</div>' : '') +
          (asks ? sizesHtml(card.sizes, sizes[product.group], 'shop-size', 'data-group="' + product.group + '"') : '') +
          '<div class="sheet-actions"><button class="button button-primary" type="button" data-action="shop-add" data-group="' + product.group + '"' + (card.soldout ? ' disabled' : '') + '>' +
          (card.soldout ? 'SOLD OUT' : 'ADD TO BAG') + '</button>' +
          '<button class="button" type="button" data-action="try-on" data-slot="' + card.slot + '" data-place="' + KIND_PLACE[card.kind] + '">TRY ON MY AVATAR</button></div></div>';
      } else if (state.kind === 'card') {
        const list = tabCards();
        const inventory = App.state.get('inventory');
        const start = Math.max(0, list.findIndex(function (c) { return c.slot === state.id; }));
        show('sheet-title', 'CARD');
        body.innerHTML = '<p class="pager-count" data-pager-count>' + (start + 1) + ' / ' + list.length + '</p><div class="pager" data-pager>' +
          list.map(function (card, i) { return slideHtml(card, i, list.length, inventory.indexOf(card.slot) !== -1); }).join('') + '</div>';
        const pager = body.querySelector('[data-pager]');
        pager.scrollLeft = start * pager.clientWidth;
      }
      document.querySelector('#sheet-title').focus({ preventScroll: true });
    },

    // The outline of the tab bar: a flat bar with a round notch under the active tab, cradling its bubble.
    tabbarShape() {
      const bar = document.querySelector('[data-tabbar]');
      const current = bar.querySelector('.tab[aria-current]');
      const w = bar.clientWidth;
      const h = bar.clientHeight;
      if (!current || !w || !h) return;
      const cx = current.offsetLeft + current.offsetWidth / 2;
      const Y = 10;
      const R = 33;
      const f = function (n) { return Math.round(n * 10) / 10; };
      const px = 0.866 * R;
      const py = Y - 8 + 0.5 * R;
      const reach = R + 28;
      const L = Math.max(0, cx - reach);
      const Rr = Math.min(w, cx + reach);
      const d = 'M0,' + Y + ' H' + f(L) + ' C' + f(Math.max(L, cx - reach + 14)) + ',' + Y + ' ' + f(Math.max(L, cx - px - 11)) + ',' + f(Y + 2) + ' ' + f(cx - px) + ',' + f(py) +
        ' A' + R + ',' + R + ' 0 0 0 ' + f(cx + px) + ',' + f(py) + ' C' + f(Math.min(Rr, cx + px + 11)) + ',' + f(Y + 2) + ' ' + f(Math.min(Rr, cx + reach - 14)) + ',' + Y + ' ' + f(Rr) + ',' + Y +
        ' H' + w + ' V' + h + ' H0 Z';
      bar.querySelector('[data-tabbar-bg]').style.clipPath = "path('" + d + "')";
    },

    // The tab bar: where you are, and whether it shows at all (not during the intro, nor on a revealed card).
    tabs() {
      const screen = App.state.get('screen');
      const tab = { home: 'home', collection: 'collection', packs: 'packs', reveal: 'packs', tryon: 'tryon', lobby: 'lobby', winner: 'lobby' }[screen];
      const hidden = App.state.get('gate') || ['welcome', 'spawn', 'name', 'size', 'reveal', 'blank'].includes(screen) || (screen === 'tryon' && introPhase());
      document.querySelector('[data-tabbar]').hidden = hidden;
      document.querySelector('.phone').classList.toggle('no-tabs', hidden);
      document.querySelectorAll('.tab').forEach(function (button) {
        if (button.dataset.tab === tab) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
      });
      // the dip of the bar follows the active tab
      const bar = document.querySelector('[data-tabbar]');
      const current = bar.querySelector('.tab[aria-current]');
      if (current && !hidden) {
        bar.style.setProperty('--x', current.offsetLeft + current.offsetWidth / 2 + 'px');
        App.render.tabbarShape();
      }
      const spent = App.state.get('history').lastDate === App.utils.today();
      document.querySelector('.tab[data-tab="packs"]').classList.toggle('has-news', !spent && App.state.get('zipped'));
    },

    toast() {
      show('toast', App.state.get('toast'));
    },

    clock() {
      show('clock', App.state.get('clock'));
    },

    countdown() {
      show('countdown', App.state.get('countdown'));
      App.render.drop();
    }
  };
})();
