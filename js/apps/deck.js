/* =============================================================================
 * deck.js — PAPER DECK · a paper-trading toy driven by weather
 *
 * The tape here is not a market. It is the cloud deck: the same fBm
 * turbulence family that CLOUD LAB paints is integrated into a random walk
 * and exponentiated into a "price" — p(t) = 100·exp(0.6·W), W a walk fed by
 * seeded fBm noise (mulberry32, fresh seed every session, RESEED at will).
 * You trade it with sim-credits (ⓥ). Nothing is quoted in currency, nothing
 * is live, and the banner says so permanently — same house rule as the
 * $VENUS token sheet: unfilled slots stay blank until they are true, and
 * fake numbers never dress up as real ones.
 *
 * One candle per second of runtime, OHLC from 8 sub-ticks, last ~120 kept.
 * Instruments: dragonfruit rack language; chassis: Tactical-OS.
 * ===========================================================================*/

window.VENUSAPPS = window.VENUSAPPS || {};

window.VENUSAPPS.deck = (function () {
  'use strict';

  var h = window.VENUSKIT.h, loop = window.VENUSKIT.loop;

  var GOLD = '#ffc83d', GOLD_HI = '#ffe9a8', SULFUR = '#f4e04d';
  var EMBER = '#ff7a2f', CHAMP = '#cdb07c', DIM = '#b09a6e', LINE = '#4a3517';

  var TICK_MS = 125;          /* 8 sub-ticks per candle, one candle per second */
  var TICKS_PER_CANDLE = 8;
  var MAX_CANDLES = 120;
  var START_CREDITS = 10000;

  var QUOTES = [
    'PAST WEATHER IS NOT INDICATIVE OF FUTURE WEATHER.',
    'THE DECK ROTATES IN 4 DAYS. YOUR THESIS MAY NOT LAST THAT LONG.',
    'ZERO FEES. ZERO SPREAD. ZERO MEANING.',
    'LIQUIDITY HERE IS A SULFURIC ACID AEROSOL.',
    'EVERY POSITION EVAPORATES AT 462 °C EVENTUALLY.',
    'THE ONLY INSIDER IS THE WIND.'
  ];

  /* ---- seeded PRNG: mulberry32, the standard tiny one ---- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function loadBest() {
    try { var v = +localStorage.getItem('venus-deck-best'); return v > 0 ? v : 0; }
    catch (e) { return 0; }
  }
  function saveBest(v) {
    try { localStorage.setItem('venus-deck-best', String(v)); } catch (e) {}
  }

  function fmt(v) {
    return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function mount(node) {
    node.appendChild(h(
      '<div class="app vdeck" tabindex="0" style="outline:none">' +
        '<div class="app-head">' +
          '<span class="h-title">PAPER DECK</span>' +
          '<span class="h-sub">WIND-DRIVEN SIM</span>' +
          '<span class="spacer"></span>' +
          '<button class="genbtn" data-a="seed">↯ RESEED</button>' +
        '</div>' +
        '<div class="app-body">' +
          '<div class="notice"><span class="ni">⚠</span><span><b>SIMULATION</b> — ' +
            'this chart is weather, not markets. The tape is generated from ' +
            'cloud-deck turbulence noise. No real prices, no real money.</span></div>' +
          '<canvas class="well vdeck-chart"></canvas>' +
          '<div class="vdeck-bar">' +
            '<button class="primary vdeck-trade" data-a="trade">BUY</button>' +
            '<span class="vdeck-stat"><label>LAST</label><b data-f="last">—</b></span>' +
            '<span class="vdeck-stat"><label>POS</label><b data-f="pos">FLAT</b></span>' +
            '<span class="vdeck-stat"><label>PNL</label><b data-f="pnl">—</b></span>' +
            '<span class="vdeck-stat"><label>EQUITY</label><b data-f="eq">—</b></span>' +
          '</div>' +
        '</div>' +
        '<div class="app-foot">' +
          '<span>candles <b data-f="candles">0</b></span>' +
          '<span>trades <b data-f="trades">0</b></span>' +
          '<span>win rate <b data-f="win">—</b></span>' +
          '<span>best <b data-f="best">—</b></span>' +
          '<span class="spacer" style="flex:1"></span>' +
          '<span data-f="quote"></span>' +
        '</div>' +
      '</div>'
    ));

    /* one injected style element, vdeck-prefixed, removed in teardown */
    var style = document.createElement('style');
    style.textContent =
      '.vdeck .app-body{display:flex;flex-direction:column;min-height:0}' +
      '.vdeck-chart{flex:1;min-height:160px}' +
      '.vdeck-bar{flex:none;display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-top:12px}' +
      '.vdeck-trade{min-width:96px}' +
      '.vdeck-stat{display:inline-flex;flex-direction:column;gap:2px}' +
      '.vdeck-stat label{font-family:var(--mono);font-size:9px;letter-spacing:.2em;color:var(--faint)}' +
      '.vdeck-stat b{font-family:var(--mono);font-size:12px;color:var(--text);font-weight:700}';
    document.head.appendChild(style);

    var root = node.querySelector('.app');
    var cv = node.querySelector('canvas');
    var ctx = cv.getContext('2d');
    var tradeBtn = node.querySelector('[data-a="trade"]');
    var f = {};
    node.querySelectorAll('[data-f]').forEach(function (n) { f[n.dataset.f] = n; });

    /* ---- the weather engine ---- */
    var seed, rng, W, tick, candles, cur;

    /* value noise over the tick axis, lattice values drawn deterministically
       from the seed — same seed, same weather, forever */
    function lat(i) { return mulberry32((seed ^ Math.imul(i, 0x9E3779B9)) | 0)(); }
    function vnoise(t) {
      var i = Math.floor(t), x = t - i, u = x * x * (3 - 2 * x);
      return lat(i) * (1 - u) + lat(i + 1) * u;
    }
    function fbm(t) {
      var v = 0, amp = 0.5, freq = 1, norm = 0;
      for (var o = 0; o < 4; o++) { v += vnoise(t * freq + o * 131) * amp; norm += amp; amp *= 0.5; freq *= 2; }
      return v / norm;   /* normalised to [0,1], mean ~0.5 */
    }
    function price() { return 100 * Math.exp(0.6 * W); }

    function subTick() {
      tick++;
      /* the walk: correlated fBm drift (the wind has moods) + a whisper of
         uncorrelated jitter so candles have texture */
      W += (fbm(tick * 0.05) - 0.5) * 0.10 + (rng() - 0.5) * 0.012;
      var p = price();
      if (!cur) cur = { o: p, h: p, l: p, c: p };
      else {
        if (p > cur.h) cur.h = p;
        if (p < cur.l) cur.l = p;
        cur.c = p;
      }
      if (tick % TICKS_PER_CANDLE === 0) {
        candles.push(cur);
        if (candles.length > MAX_CANDLES) candles.shift();
        made++;
        cur = null;
      }
      return p;
    }

    /* ---- the book ---- */
    var cash = START_CREDITS, units = 0, entry = 0;
    var trades = 0, wins = 0, closed = 0, made = 0;
    var best = loadBest(), hwm = START_CREDITS;
    if (best) f.best.textContent = fmt(best) + ' ⓥ';

    function last() { return cur ? cur.c : candles.length ? candles[candles.length - 1].c : 100; }
    function equity() { return cash + units * last(); }

    function trade() {
      var p = last();
      if (units === 0) {                       /* all-in — this is a toy, not a desk */
        units = cash / p; entry = p; cash = 0;
        trades++;
        tradeBtn.textContent = 'SELL';
        tradeBtn.style.background = EMBER; tradeBtn.style.borderColor = EMBER;
      } else {                                 /* all-out */
        cash = units * p;
        closed++; if (p > entry) wins++;
        units = 0; entry = 0;
        trades++;
        tradeBtn.textContent = 'BUY';
        tradeBtn.style.background = ''; tradeBtn.style.borderColor = '';
      }
      readouts();
    }

    function reseed() {
      if (units > 0) trade();                  /* forced flat: the wind changed */
      seed = (Math.random() * 0xffffffff) | 0;
      rng = mulberry32(seed);
      W = 0; tick = 0; candles = []; cur = null;
      /* pre-fill so the window opens onto history, not a blank well */
      for (var i = 0; i < (MAX_CANDLES - 10) * TICKS_PER_CANDLE; i++) subTick();
      readouts();
    }

    function readouts() {
      var p = last(), eq = equity();
      f.last.textContent = fmt(p) + ' ⓥ';
      f.eq.textContent = fmt(eq) + ' ⓥ';
      if (units > 0) {
        f.pos.textContent = 'LONG @ ' + fmt(entry);
        var pnl = (p - entry) * units;
        f.pnl.textContent = (pnl >= 0 ? '+' : '') + fmt(pnl) + ' ⓥ';
        f.pnl.style.color = pnl >= 0 ? GOLD : EMBER;
      } else {
        f.pos.textContent = 'FLAT';
        f.pnl.textContent = '—';
        f.pnl.style.color = '';
      }
      if (eq > hwm) hwm = eq;
      if (hwm > best && hwm > START_CREDITS) {
        best = hwm; saveBest(best);
        f.best.textContent = fmt(best) + ' ⓥ';
      }
      f.candles.textContent = String(made);
      f.trades.textContent = String(trades);
      f.win.textContent = closed ? Math.round(wins / closed * 100) + '%' : '—';
    }

    tradeBtn.addEventListener('click', trade);
    node.querySelector('[data-a="seed"]').addEventListener('click', reseed);
    root.addEventListener('keydown', function (e) {
      if (e.key === ' ') { e.preventDefault(); trade(); }
    });

    reseed();

    /* ---- the chart ---- */
    function fit() {
      var w = cv.clientWidth, ht = cv.clientHeight;
      if (!w || !ht) return null;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (cv.width !== (w * dpr | 0) || cv.height !== (ht * dpr | 0)) {
        cv.width = w * dpr | 0; cv.height = ht * dpr | 0;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w: w, h: ht };
    }

    function draw(size) {
      var w = size.w, ht = size.h;
      var padR = 46, padY = 10;
      var plotW = w - padR - 8, plotH = ht - padY * 2;
      ctx.clearRect(0, 0, w, ht);
      if (!candles.length) return;

      var lo = Infinity, hi = -Infinity;
      candles.forEach(function (c) { if (c.l < lo) lo = c.l; if (c.h > hi) hi = c.h; });
      if (cur) { if (cur.l < lo) lo = cur.l; if (cur.h > hi) hi = cur.h; }
      if (units > 0) { if (entry < lo) lo = entry; if (entry > hi) hi = entry; }
      var pad = (hi - lo) * 0.06 || 1; lo -= pad; hi += pad;
      function py(v) { return padY + (1 - (v - lo) / (hi - lo)) * plotH; }

      /* gridlines + right-side labels, 9px mono */
      ctx.font = '9px ui-monospace, monospace';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      for (var gi = 0; gi <= 4; gi++) {
        var gv = lo + (hi - lo) * gi / 4, gy = py(gv);
        ctx.strokeStyle = LINE; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(8, gy); ctx.lineTo(8 + plotW, gy); ctx.stroke();
        ctx.fillStyle = DIM;
        ctx.fillText(gv.toFixed(1), 8 + plotW + 5, gy);
      }

      /* average entry, dashed sulfur, when long */
      if (units > 0) {
        var eyp = py(entry);
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = SULFUR;
        ctx.beginPath(); ctx.moveTo(8, eyp); ctx.lineTo(8 + plotW, eyp); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = SULFUR;
        ctx.fillText(entry.toFixed(1), 8 + plotW + 5, eyp);
      }

      /* candles: gold-hi hollow up / ember filled down, champagne wicks */
      var all = cur ? candles.concat([cur]) : candles;
      var cw = plotW / MAX_CANDLES;
      var bw = Math.max(1, cw * 0.6);
      for (var i = 0; i < all.length; i++) {
        var c = all[i];
        var x = 8 + i * cw + cw / 2;
        ctx.strokeStyle = CHAMP; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, py(c.h)); ctx.lineTo(x, py(c.l)); ctx.stroke();
        var yo = py(c.o), yc = py(c.c);
        var top = Math.min(yo, yc), bh = Math.max(1, Math.abs(yc - yo));
        if (c.c >= c.o) {
          ctx.strokeStyle = GOLD_HI;
          ctx.strokeRect(x - bw / 2, top, bw, bh);
        } else {
          ctx.fillStyle = EMBER;
          ctx.fillRect(x - bw / 2, top, bw, bh);
        }
      }

      /* last-price tick, gold, on the axis */
      var lp = last(), ly = py(lp);
      ctx.fillStyle = GOLD;
      ctx.fillText(lp.toFixed(1), 8 + plotW + 5, ly);
    }

    /* ---- run ---- */
    var acc = 0, quoteAcc = 0, quoteIdx = 0;
    f.quote.textContent = QUOTES[0];

    var stop = loop(function (dt) {
      if (!cv.offsetParent) return;             /* minimised — the wind waits */
      acc += dt;
      var moved = false;
      while (acc >= TICK_MS) { acc -= TICK_MS; subTick(); moved = true; }
      if (moved) readouts();

      quoteAcc += dt;
      if (quoteAcc > 9000) {
        quoteAcc = 0;
        quoteIdx = (quoteIdx + 1) % QUOTES.length;
        f.quote.textContent = QUOTES[quoteIdx];
      }

      var size = fit();
      if (size) draw(size);
    });

    return function () {
      stop();
      if (style.parentNode) style.parentNode.removeChild(style);
    };
  }

  return { icon: '▤', title: 'PAPER DECK', w: 760, h: 560, mount: mount };
})();
