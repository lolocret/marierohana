// data.js: the catalogue. Every image is a local file in assets/ (no dependency on marierohana.com).
// Names are glued in one word, like the brand's product titles.

(function () {
  window.App = window.App || {};

  const P = 'assets/products/';
  const R = 'assets/runway/';
  const Z = 'assets/zip/';

  // Dot and silhouette colours come from css/tokens.css (--swatch-*).
  const BELT_COLORS = ['green', 'yellow', 'orange', 'red', 'pink', 'purple', 'turquoise', 'grey', 'black'];
  const BELT_RARE = ['red', 'purple', 'black'];
  const HOODIE_SWATCHES = ['black', 'turquoise', 'pink', 'grey', 'red'];

  // Every card that exists: the real products of the shop (with their variants), and the RUNWAY content.
  // COMMON = a product on sale. RARE = a special colour, the sold-out BIGZIP, or a runway picture.
  // LEGENDARY = a runway look. `slot` is the place of the card in the collection (the 3 albums).
  const CARDS = [];

  BELT_COLORS.forEach(function (c) {
    CARDS.push({
      group: 'gunbelt', slot: 'belt-' + c, variant: (c === 'turquoise' ? 'BLUE' : c.toUpperCase()), name: (c === 'turquoise' ? 'BLUE' : c.toUpperCase()) + ' GUNBELT', kind: 'belt', buy: true, price: 85,
      c, swatches: BELT_COLORS, img: P + 'belt-' + c + '.png', rarity: BELT_RARE.includes(c) ? 'rare' : 'common', meta: ''
    });
  });

  // [slot name, swatch, picture, name on marierohana.com (the title of the product page changes with the colour)]
  [['BLACKBLACK', 'black', 'hoodie-black.png', 'BLACKBLACK'], ['GREYGREY', 'grey', 'hoodie-grey.png', 'GREYGREY'], ['GREYBLUE', 'turquoise', 'hoodie-turquoise.png', 'GREYTEAL'],
    ['BLACKPINK', 'pink', 'hoodie-pink.png', 'BLACKPINK'], ['REDGREEN', 'red', 'hoodie-rust.png', 'REDGREEN'], ['LILMARCEL', 'black', 'hoodie-lilmarcel.jpg', 'LILMARCEL']].forEach(function (h) {
    CARDS.push({
      group: 'bigzip', slot: 'bigzip-' + h[0].toLowerCase(), variant: h[3], name: h[3] + ' BIGZIP HOODIE', kind: 'hoodie', buy: true, price: 180,
      c: h[1], swatches: HOODIE_SWATCHES, img: P + h[2], rarity: 'rare', meta: ''
    });
  });

  [['LILMARCEL SOUVENIR TEE', 'tee1.png', 'common'], ['BLOODY ZIPPER TEE', 'tee2.png', 'rare'],
    ['BLOODY APPLE TEE', 'tee3.png', 'rare'], ['I LOVE PARIS SOUVENIR TEE', 'tee4.png', 'common']].forEach(function (t, i) {
    CARDS.push({ group: 'tee', slot: 'tee-' + (i + 1), variant: t[0].replace(' SOUVENIR', '').replace(' TEE', ''), name: t[0], kind: 'tee', buy: true, price: 70, c: 'black', swatches: ['black'], img: P + t[1], rarity: t[2], meta: '' });
  });

  [['black', 'BLACK', 'jog-black.png'], ['grey', 'GREY', 'jog-grey.png']].forEach(function (j) {
    CARDS.push({ group: 'jog', slot: 'jog-' + j[0], variant: j[1], name: 'SPIRAL JOGGING ' + j[1], kind: 'jog', buy: true, price: 180, c: j[0], swatches: ['black', 'grey'], img: P + j[2], rarity: 'common', meta: '' });
  });

  // RUNWAY: shows of the brand. Not for sale: only to collect.
  [['NUKETOWN LOOK 01', 'RUNWAY S/S26 / UNDERGROUND PARKING', 'nuketown-1.jpg', 'legendary'],
    ['NUKETOWN BACKSTAGE', 'RUNWAY S/S26 / SPOTLIGHTS', 'nuketown-2.jpg', 'rare'],
    ['NUKETOWN LOOK 03', 'RUNWAY S/S26 / UNDERGROUND PARKING', 'nuketown-3.jpg', 'rare'],
    ['WHITEUMBRELLA LOOK', 'RUNWAY F/W27 / COURTYARD', 'stonehaven-1.jpg', 'legendary'],
    ['STONEHAVEN FROM ABOVE', 'RUNWAY F/W27 / BACKSTAGE', 'stonehaven-2.jpg', 'rare'],
    ['STONEHAVEN LOOK 03', 'RUNWAY F/W27 / COURTYARD', 'stonehaven-3.jpg', 'rare']].forEach(function (r, i) {
    CARDS.push({ group: 'runway', slot: 'runway-' + (i + 1), name: r[0], kind: 'eye', buy: false, c: 'black', rarity: r[3], meta: r[1], img: R + r[2], photo: true });
  });

  // SPECIAL: the gift of the contest. Not in any drop: it is given to the winner of BEST FIT OTD.
  CARDS.push({ group: 'special', slot: 'special-bestfit', name: 'BEST FIT OTD', kind: 'eye', buy: false, c: 'black', rarity: 'legendary', meta: 'SPECIAL CARD / 1 OF 1', img: 'assets/special/bestfit.png', photo: true });

  // The sizes of the real shop: tees 1 to 5, joggings S/M or L/XL, the Gunbelt has only one size.
  const SIZES = { gunbelt: ['1'], special: [], tee: ['1', '2', '3', '4', '5'], jog: ['S/M', 'L/XL'], bigzip: ['XS', 'S', 'M', 'L', 'XL'], runway: [] };
  CARDS.forEach(function (card) { card.sizes = SIZES[card.group]; });

  // The five groups of the collection: 9 + 6 + 4 + 2 + 6 = 27 cards. Complete one and you win its reward.
  const ALBUMS = [
    { id: 'gunbelt', plural: 'GUNBELTS', name: 'GUNBELT', reward: { percent: 20, code: 'RM-GUNBELT-20', text: '20% OFF YOUR ORDER' } },
    { id: 'bigzip', plural: 'BIGZIP HOODIES', name: 'BIGZIP', reward: { percent: 30, code: 'RM-BIGZIP-30', text: '30% OFF YOUR ORDER' } },
    { id: 'tee', plural: 'TEES', name: 'TEE', reward: { percent: 15, code: 'RM-TEE-15', text: '15% OFF YOUR ORDER' } },
    { id: 'jog', plural: 'JOGGINGS', name: 'JOGGING', reward: { percent: 15, code: 'RM-JOGGING-15', text: '15% OFF YOUR ORDER' } },
    { id: 'runway', plural: 'RUNWAY LOOKS', name: 'RUNWAY', reward: { percent: 0, code: '', text: 'AN INVITATION TO THE NEXT RM$ RUNWAY' } },
    { id: 'special', plural: 'SPECIAL', name: 'SPECIAL', reward: { percent: 0, code: '', text: 'PRIORITY ACCESS TO THE NEXT DROP' } }
  ].map(function (album) {
    album.slots = CARDS.filter(function (card) { return card.group === album.id; });
    return album;
  });
  const TOTAL = CARDS.filter(function (card) { return card.slot; }).length;

  // The supply drop is always the BIGZIP hoodie; its colour changes every day. The colour of the zip
  // announces how rare the cards inside are.
  // `rare` and `legendary` are the chances (0 to 1) that a card is rare or legendary.
  const BOOSTERS = [
    { name: 'BLACKBLACK', zip: 'black', rare: 0.2, legendary: 0.03 },
    { name: 'GREYGREY', zip: 'grey', rare: 0.2, legendary: 0.03 },
    { name: 'GREYBLUE', zip: 'turquoise', rare: 0.35, legendary: 0.06 },
    { name: 'BLACKPINK', zip: 'pink', rare: 0.35, legendary: 0.06 },
    { name: 'REDGREEN', zip: 'red', rare: 0.5, legendary: 0.15 },
    { name: 'LILMARCEL', zip: 'black', rare: 0.3, legendary: 0.08 },
    // two more packs: no hoodie behind them, only the pack (a nude latex one, a white one with blood)
    { name: 'NUDE', zip: 'grey', rare: 0.4, legendary: 0.1, gate: false },
    { name: 'STONEHAVEN', zip: 'grey', rare: 0.45, legendary: 0.12, gate: false }
  ].map(function (booster) {
    const file = booster.name.toLowerCase();
    return Object.assign(booster, {
      dark: booster.name !== 'GREYGREY' && booster.name !== 'GREYBLUE', // light text on dark fabric
      // the knit and the zip of the pack (assets/pack): a black, grey or striped knit, and a zip of the colour
      pack: { BLACKBLACK: ['black', 'black'], GREYGREY: ['grey', 'grey'], GREYBLUE: ['grey', 'blue'], BLACKPINK: ['black', 'pink'], REDGREEN: ['black', 'red'], LILMARCEL: ['stripe', 'black'], NUDE: ['latex', 'nude'], STONEHAVEN: ['white', 'white'] }[booster.name],
      // how its pack opens: a BIGZIP has a zip, the white knit is cut, the latex is burnt
      open: { STONEHAVEN: 'cut', NUDE: 'burn' }[booster.name] || 'zip',
      fabric: Z + 'fabric-' + file + '.jpg', // the front of the hoodie, zoomed on the zip
      teeth: Z + 'teeth-' + file + '.png', // the real teeth and tape of the BIGZIP, to repeat
      pull: Z + 'pull-' + file + '.png' // the slider with its ring
    });
  });

  // Sizes in pixels of the zip pictures above (they all come from the same photo shoot).
  const ZIP = {
    fabricW: 900, fabricH: 1310,
    apexY: 91, // where the zip opens when the slider is at the top
    stopY: 1180, // where the slider stops, at the bottom of the zip
    pullW: 156, pullH: 322, pullApexX: 76, pullApexY: 91, // the slider, and the point of it that opens the zip
    teethW: 96, teethH: 192
  };

  // Cities of the players in the log, with their time zone and the label used in the brand's footer.
  const CITIES = {
    PARIS: { zone: 'Europe/Paris', label: 'FR' },
    'NEW YORK': { zone: 'America/New_York', label: 'NY' },
    TOKYO: { zone: 'Asia/Tokyo', label: 'TKY' },
    LONDON: { zone: 'Europe/London', label: 'LDN' },
    MILAN: { zone: 'Europe/Rome', label: 'MIL' },
    LYON: { zone: 'Europe/Paris', label: 'FR' }
  };

  // The 4 products of the shop. Their variants are the cards of the same group.
  const SHOP = [
    { group: 'tee', category: 'T-SHIRT', name: '2026TEE', href: 'https://marierohana.com/products/zipper-tee' },
    { group: 'bigzip', category: 'JACKET', name: 'BIG ZIPPER HOODIE', href: 'https://marierohana.com/products/big-zipper-hoodie-black' },
    { group: 'jog', category: 'TRAINING', name: 'SPIRAL JOGGING', href: 'https://marierohana.com/products/spiral-jogging-black' },
    { group: 'gunbelt', category: 'BELT', name: 'SILICONE GUNBELT', href: 'https://marierohana.com/products/belt01' }
  ].map(function (product) {
    product.variants = CARDS.filter(function (card) { return card.group === product.group; });
    return product;
  });

  // Drawn silhouettes, shown if a photo does not load.
  const SILHOUETTES = {
    tee: '<path d="M30 22 L44 12 Q50 20 56 12 L70 22 L84 36 L70 44 L70 88 L30 88 L30 44 L16 36 Z"/>',
    hoodie: '<path d="M30 24 Q34 6 50 6 Q66 6 70 24 L84 40 L71 46 L71 90 L29 90 L29 46 L16 40 Z"/><path d="M50 24 L50 90" fill="none"/>',
    jog: '<path d="M30 10 L70 10 L74 90 L56 90 L50 38 L44 90 L26 90 Z"/>',
    belt: '<path d="M6 40 L94 40 L94 52 L6 52 Z"/><path d="M60 52 L80 52 L76 82 L62 82 Z"/>',
    eye: '<path d="M10 50 Q50 10 90 50 Q50 90 10 50 Z"/><circle cx="50" cy="50" r="13"/>',
    star: '<path d="M50 8 L61 38 L94 40 L68 60 L77 92 L50 74 L23 92 L32 60 L6 40 L39 38 Z"/>'
  };

  // EDIT HERE: the intro pictures that exist in assets/. Add a name when you drop the file in the folder:
  // 'm' for assets/avatar_m.png, 'f_blackblack' for assets/fit_f_blackblack.png (avatar + product).
  const INTRO_FILES = ['f', 'm'];

  // The pages that explain the experience, before the first choice.
  const LEARN = [
    { title: 'how it works', art: [P + 'tee2.png', P + 'hoodie-pink.png', P + 'belt-turquoise.png'], text: 'RM$ IS A GAME. EVERY PIECE YOU OWN BECOMES A CARD. YOUR CARDS BUILD YOUR COLLECTION.' },
    { title: 'buy a piece, get its card', art: [P + 'hoodie-black.png'], text: 'ADD A PIECE TO YOUR BAG. WHEN YOU BUY IT, ITS CARD GOES INTO YOUR COLLECTION AND ONTO YOUR AVATAR.' },
    { title: 'complete a category', art: [P + 'belt-red.png', P + 'belt-yellow.png', P + 'belt-green.png'], text: 'COLLECT EVERY CARD OF A CATEGORY, LIKE THE 9 GUNBELTS, TO UNLOCK A SURPRISE: A DISCOUNT ON IT. NOW, LET\'S LOOK AROUND.' }
  ];

  // The guide: on each screen, the parts to light up, and what to say about them (a CSS selector each).
  // The guide is short: two lines on the home page, one on the drops. Nothing else is explained.
  const COACH = {
    home: [
      { target: '.booster-card', text: 'YOUR DAILY DROP: UNZIP ONE EVERY DAY, WIN ONE CARD. (TAP TO CONTINUE)' },
      { target: '.booster-card .button', text: 'READY? TAP OPEN DROP.', act: 'open-boosters' }
    ],
    packs: [
      { target: '.pack-card.is-focus', text: 'SLIDE YOUR FINGER ALONG THE ZIP TO OPEN IT.', pass: true }
    ]
  };

  // The fitting room: where each kind of piece goes on each avatar, in pixels of the avatar picture
  // (assets/avatar_f.png, avatar_m.png). tee, jacket: top edge and width. belt: centre and width.
  // bottom: from the waist (top) to the ankles (bottom), never wider than `cap`.
  const FIT = {
    f: { w: 600, h: 1380, cx: 300, tee: { top: 248, width: 320 }, jacket: { top: 215, width: 430 }, bottom: { top: 590, bottom: 1285, cap: 420 }, belt: { cy: 625, width: 200 } },
    m: { w: 600, h: 1556, cx: 300, tee: { top: 272, width: 390 }, jacket: { top: 238, width: 545 }, bottom: { top: 630, bottom: 1465, cap: 520 }, belt: { cy: 665, width: 230 } }
  };
  // width / height of each cut-out piece (assets/fit/<slot>.png)
  const FIT_PIECES = {"belt-black": 0.718, "belt-green": 0.816, "belt-grey": 0.836, "belt-orange": 0.89, "belt-pink": 0.85, "belt-purple": 0.901, "belt-red": 0.691, "belt-turquoise": 0.761, "belt-yellow": 0.859, "bigzip-blackblack": 0.789, "bigzip-greygrey": 0.787, "bigzip-greyblue": 0.784, "bigzip-blackpink": 0.789, "bigzip-redgreen": 0.789, "bigzip-lilmarcel": 0.79, "tee-1": 0.883, "tee-2": 0.879, "tee-3": 0.879, "tee-4": 0.881, "jog-black": 0.529, "jog-grey": 0.52};

  // average colour of each piece: the back of the garment in the 3D fitting room
  const FIT_COLORS = {"belt-black": "#424242", "belt-green": "#85eb64", "belt-grey": "#b8b8ba", "belt-orange": "#f7922b", "belt-pink": "#ff64b9", "belt-purple": "#9456ad", "belt-red": "#a00a18", "belt-turquoise": "#4fb3ae", "belt-yellow": "#ffdc43", "bigzip-blackblack": "#1c1c1e", "bigzip-blackpink": "#1c1c1e", "bigzip-greyblue": "#b4b4b6", "bigzip-greygrey": "#b4b4b6", "bigzip-lilmarcel": "#101012", "bigzip-redgreen": "#1c1c1e", "jog-black": "#191b1d", "jog-grey": "#b6b4b7", "tee-1": "#171517", "tee-2": "#191212", "tee-3": "#151212", "tee-4": "#171716"};

  // EDIT HERE: real 3D garments, one file per piece in assets/models/garments/<slot>_<f|m>.glb (see HABILLAGE-3D.md).
  // Add the slot name here once its files are in the folder: e.g. 'bigzip-blackpink'. Until then the simple built-in shapes are used.
  const GARMENT_FILES = [];

  App.data = { GARMENT_FILES, FIT_COLORS, FIT, FIT_PIECES, LEARN, COACH, INTRO_FILES, CARDS, ALBUMS, TOTAL, BOOSTERS, HOODIE_SWATCHES, ZIP, CITIES, SHOP, SILHOUETTES };
})();
