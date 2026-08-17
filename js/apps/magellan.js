/* =============================================================================
 * magellan.js — MAGELLAN.EXE. Radar-map an unmapped planet before the fuel
 * runs out. One planet per day (seed = date) — everyone maps the same world.
 * Hold to run the SAR; power regenerates while idle. Three anomalies hide in
 * the terrain. 80% mapped = mission complete.
 * ===========================================================================*/

(function () {
  'use strict';

  var h = window.VENUSKIT.h;
  var MW = 256, MH = 128;

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* the Magellan gold ramp from js/terrain.js */
  var RAMP = [[0, 61, 34, 6], [.18, 122, 71, 12], [.38, 176, 109, 20], [.58, 214, 150, 30],
              [.76, 239, 186, 58], [.9, 247, 214, 112], [1, 255, 239, 190]];
  function ramp(t) {
    for (var i = 1; i < RAMP.length; i++) if (t <= RAMP[i][0]) {
      var a = RAMP[i - 1], b = RAMP[i], f = (t - a[0]) / (b[0] - a[0] || 1);
      return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f];
    }
    var l = RAMP[RAMP.length - 1]; return [l[1], l[2], l[3]];
  }

  window.VENUSAPPS = window.VENUSAPPS || {};
  window.VENUSAPPS.magellan = {
    icon: '📡', title: 'MAGELLAN.EXE', w: 720, h: 560,
    mount: function (node) {
      var d = new Date();
      var seedStr = '' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');

      node.appendChild(h(
        '<div class="app">' +
          '<div class="app-head"><span class="h-title">SAR MAPPING PASS</span>' +
            '<span class="spacer"></span><span class="h-sub" data-f="stat">HOLD TO RADAR</span></div>' +
          '<div class="stage"><canvas tabindex="0"></canvas>' +
            '<div class="hint">HOLD POINTER / SPACE — RADAR · POWER REGENERATES IDLE</div></div>' +
          '<div class="strip">' +
            '<label>MAPPED</label><span class="readout" data-f="map" style="min-width:64px;text-align:left">0.0%</span>' +
            '<label>POWER</label><span class="readout" data-f="pow" style="min-width:52px;text-align:left">100</span>' +
            '<label>FUEL</label><span class="readout" data-f="fuel" style="min-width:52px;text-align:left">100</span>' +
          '</div>' +
          '<div class="app-foot"><span>SOL SEED ' + seedStr + ' — EVERYONE MAPS THIS PLANET TODAY</span>' +
            '<span class="spacer"></span>' +
            '<button class="ghost" data-a="share" style="padding:2px 8px;font-size:10px">SHARE CARD</button>' +
            '<span data-f="best">—</span></div>' +
        '</div>'
      ));

      var cv = node.querySelector('canvas'), ctx = cv.getContext('2d');
      var f = {};
      node.querySelectorAll('[data-f]').forEach(function (n) { f[n.dataset.f] = n; });

      /* daily heightmap: 4-octave ridged value noise */
      var rnd = mulberry32(+seedStr);
      var grids = [8, 16, 32, 64].map(function (sz) {
        var g = new Float32Array(sz * sz);
        for (var i = 0; i < g.length; i++) g[i] = rnd();
        return { sz: sz, g: g };
      });
      function noise(gr, x, y) {
        var sz = gr.sz; x *= sz; y *= sz;
        var x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
        fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
        var xa = ((x0 % sz) + sz) % sz, xb = (xa + 1) % sz, ya = ((y0 % sz) + sz) % sz, yb = (ya + 1) % sz;
        var q = gr.g;
        return (q[ya * sz + xa] * (1 - fx) + q[ya * sz + xb] * fx) * (1 - fy) +
               (q[yb * sz + xa] * (1 - fx) + q[yb * sz + xb] * fx) * fy;
      }
      var height = new Float32Array(MW * MH);
      var max = 0;
      for (var y = 0; y < MH; y++) for (var x = 0; x < MW; x++) {
        var v = 0, amp = 1;
        for (var o = 0; o < 4; o++) {
          var n = noise(grids[o], x / MW, y / MH);
          var r = 1 - Math.abs(2 * n - 1);
          v += r * r * amp; amp *= 0.55;
        }
        height[y * MW + x] = v; if (v > max) max = v;
      }
      for (var i = 0; i < height.length; i++) height[i] /= max;

      var ANOMALIES = [
        { x: (rnd() * MW) | 0, y: (rnd() * MH) | 0, label: 'CRASHED PROBE', found: false },
        { x: (rnd() * MW) | 0, y: (rnd() * MH) | 0, label: 'FRESH FLOW', found: false },
        { x: (rnd() * MW) | 0, y: (rnd() * MH) | 0, label: 'STRUCTURE (IMPOSSIBLE)', found: false }
      ];

      var seen = new Uint8Array(MW * MH);
      var orbX = 0, orbY = 8, radar = false, power = 100, fuel = 100, mapped = 0, over = false, ping = null;

      var best = 0;
      try { best = +localStorage.getItem('venus-magellan-best') || 0; } catch (e) {}
      f.best.textContent = best ? 'BEST ' + best.toFixed(1) + '%' : '';

      var root = node.firstChild;
      cv.addEventListener('pointerdown', function () { radar = true; cv.focus(); });
      addEventListener('pointerup', function () { radar = false; });
      root.setAttribute('tabindex', '0');
      root.addEventListener('keydown', function (e) { if (e.key === ' ') { e.preventDefault(); radar = true; } });
      root.addEventListener('keyup', function (e) { if (e.key === ' ') radar = false; });

      function resize() {
        var r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
        cv.width = Math.max(1, r.width * dpr); cv.height = Math.max(1, r.height * dpr);
      }
      resize(); addEventListener('resize', resize);

      var mapCv = document.createElement('canvas');
      mapCv.width = MW; mapCv.height = MH;
      var mctx = mapCv.getContext('2d');
      mctx.fillStyle = '#0a0702'; mctx.fillRect(0, 0, MW, MH);
      var img = mctx.getImageData(0, 0, MW, MH);

      function reveal(cx) {
        for (var dx = -3; dx <= 3; dx++) {
          var x = ((cx + dx) % MW + MW) % MW;
          var y0 = Math.max(0, orbY - 2), y1 = Math.min(MH - 1, orbY + 2);
          for (var yy = y0; yy <= y1; yy++) {
            var idx = yy * MW + x;
            if (seen[idx]) continue;
            seen[idx] = 1; mapped++;
            var c = ramp(height[idx]);
            var o = idx * 4;
            img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
            for (var a = 0; a < ANOMALIES.length; a++) {
              var an = ANOMALIES[a];
              if (!an.found && Math.abs(an.x - x) < 3 && Math.abs(an.y - yy) < 3) {
                an.found = true; mapped += MW * MH * 0.02;   /* +2% bonus */
                ping = { label: 'ANOMALY LOGGED: ' + an.label + ' (+2%)', t: Date.now() };
              }
            }
          }
        }
      }

      var stop = window.VENUSKIT.loop(function (dt) {
        if (!cv.offsetParent || over) return;
        var s = dt / 1000;

        orbX = (orbX + s * 22) % MW;
        if (orbX < s * 22) orbY = (orbY + 5) % MH;   /* drift a swath down per lap */

        if (radar && power > 0) {
          power = Math.max(0, power - s * 14);
          reveal(orbX | 0);
          mctx.putImageData(img, 0, 0);
        } else {
          power = Math.min(100, power + s * 7);
        }
        fuel -= s * 1.15;

        var pct = Math.min(100, mapped / (MW * MH) * 100);
        f.map.textContent = pct.toFixed(1) + '%';
        f.pow.textContent = power.toFixed(0);
        f.pow.style.color = power < 20 ? 'var(--ember)' : 'var(--gold)';
        f.fuel.textContent = Math.max(0, fuel).toFixed(0);
        f.fuel.style.color = fuel < 20 ? 'var(--ember)' : 'var(--gold)';

        if (fuel <= 0 || pct >= 100) {
          over = true;
          f.stat.textContent = pct >= 80 ? 'MISSION COMPLETE · ' + pct.toFixed(1) + '%' : 'FUEL SPENT · ' + pct.toFixed(1) + '%';
          if (pct > best) { best = pct; try { localStorage.setItem('venus-magellan-best', String(pct)); } catch (e) {} f.best.textContent = 'BEST ' + best.toFixed(1) + '%'; }
        }

        var W = cv.width, H = cv.height;
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#050301'; ctx.fillRect(0, 0, W, H);
        var mw = W * 0.94, mh = mw * MH / MW;
        if (mh > H * 0.9) { mh = H * 0.9; mw = mh * MW / MH; }
        var mx = (W - mw) / 2, my = (H - mh) / 2;
        ctx.drawImage(mapCv, mx, my, mw, mh);
        ctx.strokeStyle = 'rgba(184,134,42,.6)'; ctx.strokeRect(mx, my, mw, mh);

        /* orbiter + live swath */
        var ox = mx + orbX / MW * mw, oy = my + orbY / MH * mh;
        if (radar && power > 0) {
          ctx.fillStyle = 'rgba(244,224,77,.25)';
          ctx.fillRect(ox - mw / MW * 3.5, my, mw / MW * 7, mh);
        }
        ctx.fillStyle = '#ffe9a8';
        ctx.beginPath(); ctx.arc(ox, oy, 3.5, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(255,233,168,.5)';
        ctx.beginPath(); ctx.arc(ox, oy, 8, 0, 7); ctx.stroke();

        if (ping && Date.now() - ping.t < 2600) {
          ctx.textAlign = 'center'; ctx.fillStyle = '#f4e04d';
          ctx.font = '700 ' + (W * 0.018) + 'px ui-monospace,monospace';
          ctx.fillText(ping.label, W / 2, my + mh * 0.08);
        }
        if (over) {
          ctx.fillStyle = 'rgba(10,7,2,.5)'; ctx.fillRect(0, 0, W, H);
          ctx.textAlign = 'center'; ctx.fillStyle = '#ffe9a8';
          ctx.font = '900 ' + (W * 0.035) + 'px ui-sans-serif,system-ui';
          ctx.fillText(f.stat.textContent, W / 2, H / 2);
        }
      });

      node.querySelector('[data-a="share"]').addEventListener('click', function () {
        var pct = Math.min(100, mapped / (MW * MH) * 100);
        var found = ANOMALIES.filter(function (a) { return a.found; }).length;
        window.VENUSSHARE.card({
          app: 'MAGELLAN.EXE · VENUS-OS', headline: pct.toFixed(1) + '% MAPPED', file: 'magellan-' + seedStr,
          lines: ['SOL SEED ' + seedStr + ' — SAME PLANET FOR EVERYONE TODAY',
                  found + '/3 ANOMALIES LOGGED', 'BEAT IT.']
        });
      });
      return stop;
    }
  };
})();
