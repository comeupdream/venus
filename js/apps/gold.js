/* =============================================================================
 * gold.js — GOLD TRACKER. Paste a wallet, watch the metal arrive.
 *
 * No connect, no signing, no server: the app queries public BSC RPC nodes
 * directly (eth_getLogs on the ERC-20 Transfer topic filtered to your
 * address) and lists what landed. When js/coin.js gets the reward token's
 * BSC contract (rewardsCa) this tracks XAUt payouts; until then it tracks
 * $VENUS transfers so the machinery is live and verifiable today.
 * ===========================================================================*/

(function () {
  'use strict';

  var h = window.VENUSKIT.h;
  var C = window.VENUSCOIN;
  var TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  var CHUNK = 4999, CHUNKS = 8;          /* ~40k blocks ≈ last day-plus on BSC */
  var BLOCK_S = 3;

  function pad(addr) { return '0x' + addr.slice(2).toLowerCase().padStart(64, '0'); }

  /* dust-safe formatter: big numbers group, small ones keep their
     significant digits instead of rounding to a lying zero */
  function fmt(v) {
    if (!v) return '0';
    if (v >= 1) return v.toLocaleString(undefined, { maximumFractionDigits: 6 });
    return (+v.toPrecision(3)).toString();
  }

  function rpc(url, method, params) {
    return fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: method, params: params || [] })
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (j.error) throw new Error(j.error.message || 'rpc error');
      return j.result;
    });
  }

  /* try each configured node until one answers */
  function rpcAny(method, params, i) {
    i = i || 0;
    if (i >= C.rpc.length) return Promise.reject(new Error('all nodes unreachable'));
    return rpc(C.rpc[i], method, params).catch(function () { return rpcAny(method, params, i + 1); });
  }

  window.VENUSAPPS = window.VENUSAPPS || {};
  window.VENUSAPPS.gold = {
    icon: '🥇', title: 'GOLD TRACKER', w: 620, h: 560,
    mount: function (node) {
      var tracked = C.rewardsCa || C.ca;
      var trackedName = C.rewardsCa ? 'XAUt PAYOUTS' : '$VENUS TRANSFERS';
      var decimals = C.rewardsCa ? C.rewardsDecimals : C.venusDecimals;
      var unit = C.rewardsCa ? 'XAUt' : '$VENUS';

      node.appendChild(h(
        '<div class="app">' +
          '<div class="app-head"><span class="h-title">GOLD TRACKER · ' + trackedName + '</span>' +
            '<span class="spacer"></span><span class="h-sub">READS THE CHAIN DIRECTLY</span></div>' +
          '<div class="app-body">' +
            '<div class="card wide">' +
              '<div style="display:flex;gap:8px">' +
                '<input data-f="addr" type="text" placeholder="0x… your wallet" spellcheck="false" ' +
                  'style="flex:1;font-family:var(--mono);font-size:12px">' +
                '<button class="genbtn" data-a="scan">SCAN</button>' +
              '</div>' +
            '</div>' +
            '<div class="card wide" style="margin-top:12px;text-align:center;padding:18px">' +
              '<div style="font-family:var(--mono);font-size:10px;letter-spacing:.24em;color:var(--dim)">RECEIVED · RECENT WINDOW</div>' +
              '<div data-f="total" style="font-size:34px;font-weight:900;color:var(--gold);margin-top:6px">—</div>' +
              '<div data-f="sub" style="font-family:var(--mono);font-size:10px;color:var(--faint);margin-top:4px">' +
                'scans the last ~40,000 blocks (~1.4 days)</div>' +
            '</div>' +
            '<table class="spec" style="margin-top:12px"><tbody data-f="rows">' +
              '<tr><td colspan="3" style="color:var(--faint)">No scan yet.</td></tr>' +
            '</tbody></table>' +
            (C.rewardsCa ? '' :
              '<div class="notice" style="margin-top:12px"><span class="ni">◍</span><span>' +
              '<b>Tracking $VENUS transfers for now.</b> The moment the XAUt reward contract is ' +
              'published it goes into <code>js/coin.js</code> and this app tracks gold payouts.</span></div>') +
          '</div>' +
          '<div class="app-foot"><span data-f="stat">IDLE</span><span class="spacer"></span>' +
            '<span>PUBLIC RPC · NO CONNECT · NOTHING TO SIGN</span></div>' +
        '</div>'
      ));

      var f = {};
      node.querySelectorAll('[data-f]').forEach(function (n) { f[n.dataset.f] = n; });
      try { f.addr.value = localStorage.getItem('venus-gold-addr') || ''; } catch (e) {}

      var busy = false;
      function scan() {
        var addr = f.addr.value.trim();
        if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
          f.stat.textContent = 'THAT IS NOT A BSC ADDRESS'; return;
        }
        if (busy) return;
        busy = true;
        try { localStorage.setItem('venus-gold-addr', addr); } catch (e) {}
        if (window.VENUSACH) window.VENUSACH.unlock('goldscan');
        f.stat.textContent = 'ASKING THE CHAIN…';
        f.rows.innerHTML = '<tr><td colspan="3" style="color:var(--faint)">Scanning…</td></tr>';

        rpcAny('eth_blockNumber').then(function (hex) {
          var latest = parseInt(hex, 16);
          var jobs = [], i;
          for (i = 0; i < CHUNKS; i++) {
            var to = latest - i * (CHUNK + 1), from = Math.max(0, to - CHUNK);
            jobs.push(rpcAny('eth_getLogs', [{
              address: tracked,
              topics: [TRANSFER, null, pad(addr)],
              fromBlock: '0x' + from.toString(16),
              toBlock: '0x' + to.toString(16)
            }]).catch(function () { return []; }));
          }
          return Promise.all(jobs).then(function (parts) {
            var logs = [];
            parts.forEach(function (p) { logs = logs.concat(p || []); });
            render(logs, latest);
          });
        }).catch(function (e) {
          f.stat.textContent = 'RPC UNREACHABLE — TRY AGAIN IN A MINUTE';
          f.rows.innerHTML = '<tr><td colspan="3" style="color:var(--faint)">' +
            'Every public node declined. This happens; they are free.</td></tr>';
        }).then(function () { busy = false; });
      }

      function render(logs, latest) {
        logs.sort(function (a, b) { return parseInt(b.blockNumber, 16) - parseInt(a.blockNumber, 16); });
        var total = 0;
        logs.forEach(function (l) { total += parseInt(l.data, 16) / Math.pow(10, decimals); });
        f.total.textContent = fmt(total) + ' ' + unit;
        f.stat.textContent = logs.length
          ? logs.length + ' TRANSFER' + (logs.length > 1 ? 'S' : '') + ' FOUND'
          : 'NOTHING IN THE RECENT WINDOW — HOLD ON, THE PLANET IS SLOW';

        if (!logs.length) {
          f.rows.innerHTML = '<tr><td colspan="3" style="color:var(--faint)">No incoming ' + unit +
            ' transfers in the scanned window.</td></tr>';
          return;
        }
        f.rows.innerHTML = '';
        logs.slice(0, 12).forEach(function (l) {
          var blk = parseInt(l.blockNumber, 16);
          var ago = Math.max(0, Math.round((latest - blk) * BLOCK_S / 60));
          var amt = fmt(parseInt(l.data, 16) / Math.pow(10, decimals));
          var tr = document.createElement('tr');
          tr.innerHTML = '<th>~' + (ago < 60 ? ago + ' min ago' : (ago / 60).toFixed(1) + ' h ago') + '</th>' +
            '<td class="n">+' + amt + ' ' + unit + '</td>' +
            '<td class="n"><a href="https://bscscan.com/tx/' + l.transactionHash +
            '" target="_blank" rel="noopener" style="color:var(--gold)">tx ↗</a></td>';
          f.rows.appendChild(tr);
        });
      }

      node.querySelector('[data-a="scan"]').addEventListener('click', scan);
      f.addr.addEventListener('keydown', function (e) { if (e.key === 'Enter') scan(); });
      return null;
    }
  };
})();
