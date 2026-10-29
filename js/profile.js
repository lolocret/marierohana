// profile.js: the product chooses. The hoodie of the day is a BIGZIP; only the colour of its zip changes, at random,
// and the 3 boosters of the day are three other colours.

(function () {
  window.App = window.App || {};

  App.profile = {
    // Picks the hoodie that closes the site, and starts the gate state.
    choose(gateHoodie) {
      const shuffled = App.data.BOOSTERS.slice().sort(function () { return Math.random() - 0.5; });
      // only the BIGZIP hoodies can close the app (the others have no hoodie picture)
      const hoodie = shuffled.find(function (booster) { return booster.gate !== false; });
      if (gateHoodie) App.booster.start(hoodie);
    }
  };
})();
