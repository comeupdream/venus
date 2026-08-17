/* =============================================================================
 * cabar.js — the conversion strip. The one job a coin site has.
 *
 * A slim OS-styled bar pinned above the desktop: the CA (tap to copy), BUY
 * (PancakeSwap with the token pre-filled), CHART, SCAN, and TG/X the moment
 * js/coin.js knows the links. Always visible, desktop and mobile — nobody
 * should ever have to hunt for the contract.
 * ===========================================================================*/

(function () {
  'use strict';

  var C = window.VENUSCOIN;
  var bar = document.createElement('div');
  bar.id = 'cabar';

  var shortCa = C.ca.slice(0, 6) + '…' + C.ca.slice(-4);

  var html =
    '<span class="cb-brand" aria-hidden="true">◈</span>' +
    '<button class="cb-ca" title="Copy contract address">' +
      '<span class="cb-addr">' + shortCa + '</span><span class="cb-copy">COPY</span></button>' +
    '<span class="cb-flex"></span>' +
    '<a class="cb-btn cb-buy" href="' + C.buyUrl + '" target="_blank" rel="noopener">BUY ▸</a>' +
    '<a class="cb-btn" href="' + C.chartUrl + '" target="_blank" rel="noopener">CHART</a>' +
    '<a class="cb-btn cb-scan" href="' + C.scanUrl + '" target="_blank" rel="noopener">SCAN</a>';
  if (C.tg) html += '<a class="cb-btn" href="' + C.tg + '" target="_blank" rel="noopener">TG</a>';
  if (C.x) html += '<a class="cb-btn" href="' + C.x + '" target="_blank" rel="noopener">𝕏</a>';
  bar.innerHTML = html;
  document.body.appendChild(bar);

  bar.querySelector('.cb-ca').addEventListener('click', function () {
    var b = bar.querySelector('.cb-copy');
    var done = function () {
      b.textContent = '✓ COPIED';
      setTimeout(function () { b.textContent = 'COPY'; }, 1400);
    };
    if (window.VENUSACH) window.VENUSACH.unlock('ca_copy');
    if (navigator.clipboard) navigator.clipboard.writeText(C.ca).then(done, function () {});
    else { /* pre-clipboard-API fallback */
      var t = document.createElement('textarea');
      t.value = C.ca; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); done(); } catch (e) {}
      t.remove();
    }
  });
})();
