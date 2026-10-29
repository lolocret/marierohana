// clock.js: the live New York / Paris time in the footer, and the countdown to the next booster.

(function () {
  window.App = window.App || {};

  const NEW_YORK = 'America/New_York';
  const PARIS = 'Europe/Paris';

  function time(zone, now) {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    }).format(now);
  }

  function tick() {
    const now = new Date();
    const date = new Intl.DateTimeFormat('en-US', {
      timeZone: NEW_YORK,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);
    App.state.set('clock', date + ', ' + time(NEW_YORK, now) + ' (NY) / ' + time(PARIS, now) + ' (FR)');

    // One booster per day: the next one opens at local midnight.
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const left = Math.floor((midnight - now) / 1000);
    const pad = App.utils.pad;
    App.state.set('countdown', pad(Math.floor(left / 3600)) + ':' + pad(Math.floor((left % 3600) / 60)) + ':' + pad(left % 60));
  }

  App.clock = {
    // Time of day in a city's time zone, like the footer of the brand's site: 13:47:02
    timeIn: time,

    start() {
      tick();
      setInterval(tick, 1000);
    }
  };
})();
