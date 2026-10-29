// state.js: everything the app remembers, in one place.
// Read with App.state.get('key'). Change with App.state.set('key', value):
// set() announces the change so the page can redraw.

(function () {
  window.App = window.App || {};

  // EDIT HERE: the starting values of your app.
  const data = {
    screen: 'home',
    gate: true, // today's drop is closed behind the zipped hoodie until it is unzipped

    // unzip: the hoodie that is the booster
    hoodie: { name: '', zip: 'black' },
    unzipStarted: false,
    unzipStatus: 'RAISE YOUR HAND',
    fingerMode: false,
    fingerOffer: false,

    // the card of the pack you opened
    deck: [],
    input: 'tilt',

    // kept in the browser: what is in your bag, what you collected, the day of your last drop
    bag: [],
    inventory: [],
    player: { name: '', avatar: '' }, // who you are: set once, in the intro
    history: { lastDate: '' }, // the day of the last drop: one supply drop per day

    dupes: {}, // cards you won twice: gifts for the other players (kept)
    myVotes: 0, // votes the other players give to your posted fit (demo: they arrive one after the other)
    votes: {}, // the fits you voted for in BEST FIT OTD (not kept: every demo starts at 0)
    posted: null, // your fit in the contest (kept)
    shopVariants: {}, // the colour shown for each product of the shop
    shopSizes: {},
    onboarding: false, // true only between the choice of the name and the sizes: the first fitting room (no menu); never kept
    tour: true, // the guided demo: the first visit, with the intro and the guide
    sheet: { kind: '', id: '' }, // what slides up from the bottom: the menu, a product, a card
    collectionTab: 'all',
    collectionCard: '', // the latest card shown in the collection
    outfit: { jacket: '', tee: '', bottom: '', belt: '', backdrop: '' }, // what the avatar wears: the slot of the card in each place (kept)
    fitTab: 'jacket',
    outfitSizes: {}, // the size chosen for each piece to buy
    coach: { screen: '', i: -1 }, // the guide: which screen, which step
    coached: [], // the screens whose guide was already shown // the intro's fitting: size and product shown // the size chosen for each product of the shop

    // small messages and live text
    toast: '',
    clock: '',
    countdown: '',
    checkoutNote: ''
  };

  App.state = {
    get(key) {
      return data[key];
    },

    set(key, value) {
      data[key] = value;
      document.dispatchEvent(new CustomEvent('state-change', { detail: { key, value } }));
    }
  };
})();
