/* =============================================================================
 * market.js — MARKET: live pair data for the CA, straight from the browser.
 *
 * Reads the shared VENUSMARKET store (js/coin.js). Data is DexScreener's
 * public feed — attributed on screen, timestamped, and every number is
 * exactly what the feed said or an honest empty state. This app never
 * invents a figure.
 * ===========================================================================*/

(function () {
  'use strict';

  var h = window.VENUSKIT.h;

  function fmtUsd(n, opts) {
    if (n == null || isNaN(n)) return '—';
    n = +n;
    if (opts && opts.price) {
      if (n >= 1) return '$' + n.toFixed(4);
      var s = n.toPrecision(4);
      return '$' + (+s).toString();
    }
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + n.toFixed(0);
  }

  window.VENUSAPPS = window.VENUSAPPS || {};
  window.VENUSAPPS.market = {
    icon: '◈', title: 'MARKET', w: 560, h: 560,
    mount: function (node) {
      node.appendChild(h(
        '<div class="app">' +
          '<div class="app-head">' +
            '<span class="h-title">$VENUS · LIVE PAIR</span>' +
            '<span class="spacer"></span>' +
            '<button class="ghost" data-a="refresh">↻ REFRESH</button>' +
          '</div>' +
          '<div class="app-body">' +
            '<div class="card wide" data-r="main" style="text-align:center;padding:22px 12px">' +
              '<div style="font-family:var(--mono);font-size:10px;letter-spacing:.24em;color:var(--dim)">PRICE USD</div>' +
              '<div data-f="price" style="font-size:38px;font-weight:900;color:var(--gold);margin:6px 0 2px">—</div>' +
              '<div data-f="chg" style="font-family:var(--mono);font-size:13px;color:var(--dim)">—</div>' +
            '</div>' +
            '<table class="spec" style="margin-top:12px">' +
              '<tr><th>FDV</th><td class="n" data-f="fdv">—</td></tr>' +
              '<tr><th>Liquidity</th><td class="n" data-f="liq">—</td></tr>' +
              '<tr><th>Volume 24h</th><td class="n" data-f="vol">—</td></tr>' +
              '<tr><th>Buys / sells 24h</th><td class="n" data-f="txns">—</td></tr>' +
              '<tr><th>DEX</th><td class="n" data-f="dex">—</td></tr>' +
              '<tr><th>Chain</th><td class="n">BNB SMART CHAIN</td></tr>' +
            '</table>' +
            '<div class="notice" style="margin-top:14px"><span class="ni">◍</span><span data-f="status">' +
              'Fetching the pair…</span></div>' +
            '<p class="prose" style="font-size:11.5px;color:var(--faint)">Feed: DexScreener public API, ' +
              'polled every 90 s. Deepest-liquidity BSC pair for the contract. ' +
              '<a data-f="link" href="#" target="_blank" rel="noopener" style="color:var(--gold)">Open the pair ↗</a></p>' +
          '</div>' +
          '<div class="app-foot"><span data-f="at">—</span></div>' +
        '</div>'
      ));

      var f = {};
      node.querySelectorAll('[data-f]').forEach(function (n) { f[n.dataset.f] = n; });

      function render(store) {
        var p = store.last;
        if (!p) {
          f.status.innerHTML = '<b>' + (store.error || 'NO DATA') + '</b> — the sheet stays honest: ' +
            'no number is shown that the feed did not return.';
          f.at.textContent = store.at ? 'last attempt ' + new Date(store.at).toLocaleTimeString() : '—';
          return;
        }
        var chg = p.priceChange && p.priceChange.h24;
        f.price.textContent = fmtUsd(p.priceUsd, { price: true });
        f.chg.textContent = (chg == null ? '—' : (chg >= 0 ? '▲ +' : '▼ ') + chg + '% · 24H');
        f.chg.style.color = chg == null ? '' : (chg >= 0 ? 'var(--gold)' : 'var(--ember)');
        f.fdv.textContent = fmtUsd(p.fdv);
        f.liq.textContent = fmtUsd(p.liquidity && p.liquidity.usd);
        f.vol.textContent = fmtUsd(p.volume && p.volume.h24);
        f.txns.textContent = p.txns && p.txns.h24 ? p.txns.h24.buys + ' / ' + p.txns.h24.sells : '—';
        f.dex.textContent = (p.dexId || '—').toUpperCase();
        f.link.href = p.url || (window.VENUSCOIN.pairPage + p.pairAddress);
        f.status.innerHTML = 'Live · pair <b>' + (p.baseToken && p.baseToken.symbol || '?') + '/' +
          (p.quoteToken && p.quoteToken.symbol || '?') + '</b> via DexScreener.';
        f.at.textContent = 'updated ' + new Date(store.at).toLocaleTimeString();
      }

      render(window.VENUSMARKET.get());
      window.VENUSMARKET.onUpdate(render);
      node.querySelector('[data-a="refresh"]').addEventListener('click', function () {
        f.status.textContent = 'Refreshing…';
        window.VENUSMARKET.refresh();
      });
      return null;
    }
  };
})();
