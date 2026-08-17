/* =============================================================================
 * coin.js — the one place the token's real-world facts live.
 * Everything that renders a coin fact reads it from here.
 * ===========================================================================*/

window.VENUSCOIN = (function () {
  var ca = '0x5460b5E88799D27bbdf8A210926C17Dec18d7777';
  return {
    ca: ca,
    chain: 'BNB Smart Chain (BEP-20)',
    chainSlug: 'bsc',
    kind: 'RWA — real-world-asset rewards token',
    rewards: 'XAUt (Tether Gold)',
    rewardsNote: 'one XAUt tracks one troy ounce of vaulted physical gold',

    /* the reward token's BSC contract — set it when published and the GOLD
       TRACKER switches from $VENUS transfers to real payout tracking */
    rewardsCa: null,
    rewardsDecimals: 6,
    venusDecimals: 18,

    /* XAUt on Ethereum — reference feed for the live gold price chip */
    goldRefCa: '0x68749665FF8D2d112Fa859AA293F07A622782F38',

    /* social — TG/X buttons appear everywhere the moment these are set */
    tg: null,
    x: null,

    buyUrl: 'https://pancakeswap.finance/swap?outputCurrency=' + ca + '&chainId=56',
    chartUrl: 'https://dexscreener.com/bsc/' + ca,
    scanUrl: 'https://bscscan.com/token/' + ca,
    holdersUrl: 'https://bscscan.com/token/' + ca + '#balances',

    api: 'https://api.dexscreener.com/latest/dex/tokens/',
    pairPage: 'https://dexscreener.com/bsc/',

    /* CORS-friendly public BSC RPCs, tried in order by the GOLD TRACKER */
    rpc: ['https://bsc-rpc.publicnode.com', 'https://bsc-dataseed.binance.org']
  };
})();

/* ---- shared market store ---------------------------------------------------
 * One fetch loop for the whole OS. A single DexScreener call carries both
 * tokens (comma-separated): the $VENUS pair (deepest BSC liquidity) and the
 * XAUt reference pair (deepest anywhere) for the gold price. Fails quiet.
 * --------------------------------------------------------------------------*/
window.VENUSMARKET = (function () {
  'use strict';
  var C = window.VENUSCOIN;
  var store = { last: null, gold: null, error: null, at: 0, listeners: [] };

  function deepest(pairs, baseAddr, chain) {
    var best = null, i;
    for (i = 0; i < (pairs || []).length; i++) {
      var p = pairs[i];
      if (chain && p.chainId !== chain) continue;
      if (baseAddr && (!p.baseToken || (p.baseToken.address || '').toLowerCase() !== baseAddr.toLowerCase())) continue;
      if (!best || (p.liquidity && p.liquidity.usd || 0) > (best.liquidity && best.liquidity.usd || 0)) best = p;
    }
    return best;
  }

  function refresh() {
    return fetch(C.api + C.ca + ',' + C.goldRefCa)
      .then(function (r) { return r.json(); })
      .then(function (j) {
        store.last = deepest(j.pairs, C.ca, C.chainSlug);
        store.gold = deepest(j.pairs, C.goldRefCa, null);
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
