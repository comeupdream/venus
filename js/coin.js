/* =============================================================================
 * coin.js — the one place the token's real-world facts live.
 * Everything that renders a coin fact reads it from here.
 * ===========================================================================*/

window.VENUSCOIN = {
  ca: '0x5460b5E88799D27bbdf8A210926C17Dec18d7777',
  chain: 'BNB Smart Chain (BEP-20)',
  chainSlug: 'bsc',
  kind: 'RWA — real-world-asset rewards token',
  rewards: 'XAUt (Tether Gold)',
  rewardsNote: 'one XAUt tracks one troy ounce of vaulted physical gold',
  api: 'https://api.dexscreener.com/latest/dex/tokens/',
  pairPage: 'https://dexscreener.com/bsc/'
};

/* ---- shared market store ---------------------------------------------------
 * One fetch loop for the whole OS (tray + MARKET app read the same data).
 * DexScreener's public API is CORS-open and keyless; we take the deepest
 * BSC pair by liquidity. Fails quiet: no pair or no network just means
 * `last` stays null and the UI says so.
 * --------------------------------------------------------------------------*/
window.VENUSMARKET = (function () {
  'use strict';
  var store = { last: null, error: null, at: 0, listeners: [] };

  function pick(pairs) {
    var best = null, i;
    for (i = 0; i < (pairs || []).length; i++) {
      var p = pairs[i];
      if (p.chainId !== window.VENUSCOIN.chainSlug) continue;
      if (!best || (p.liquidity && p.liquidity.usd || 0) > (best.liquidity && best.liquidity.usd || 0)) best = p;
    }
    return best;
  }

  function refresh() {
    return fetch(window.VENUSCOIN.api + window.VENUSCOIN.ca)
      .then(function (r) { return r.json(); })
      .then(function (j) {
        store.last = pick(j.pairs);
        store.error = store.last ? null : 'NO PAIR INDEXED YET';
        store.at = Date.now();
        store.listeners.forEach(function (f) { f(store); });
        return store;
      })
      .catch(function () {
        store.error = 'FEED UNREACHABLE';
        store.at = Date.now();
        store.listeners.forEach(function (f) { f(store); });
        return store;
      });
  }

  refresh();
  setInterval(function () { if (!document.hidden) refresh(); }, 90000);

  return {
    refresh: refresh,
    get: function () { return store; },
    onUpdate: function (f) { store.listeners.push(f); }
  };
})();
