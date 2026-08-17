/* =============================================================================
 * orbits.js — ORBITS. The solar system as a live instrument: six planets on
 * their J2000 mean elements (same model as the phase dial), time warp both
 * directions, trails, and a click-to-inspect card. Venus wears the gold.
 *
 * Circular coplanar orbits — right for a dashboard, wrong for a lander.
 * The Earth–Venus line lights up near inferior conjunction, which is the
 * geometry the phase dial and TRANSFER are both built on.
 * ===========================================================================*/

(function () {
  'use strict';

  var h = window.VENUSKIT.h;
  var DEG = Math.PI / 180, J2000 = Date.UTC(2000, 0, 1, 12);

  var PLANETS = [
    { key: 'mercury', name: 'MERCURY', a: 0.38710, L0: 252.25032, dL: 149472.67411, r: 2.4, col: '#b09a6e' },
    { key: 'venus',   name: 'VENUS',   a: 0.72334, L0: 181.97910, dL: 58517.81539,  r: 6.0, col: '#ffc83d' },
    { key: 'earth',   name: 'EARTH',   a: 1.00000, L0: 100.46457, dL: 35999.37245,  r: 6.1, col: '#7fb2ff' },
    { key: 'mars',    name: 'MARS',    a: 1.52371, L0: -4.55343,  dL: 19140.30268,  r: 3.4, col: '#ff7a2f' },
    { key: 'jupiter', name: 'JUPITER', a: 5.20289, L0: 34.39644,  dL: 3034.74612,   r: 13,  col: '#cdb07c' },
    { key: 'saturn',  name: 'SATURN',  a: 9.53668, L0: 49.95424,  dL: 1222.49362,   r: 11,  col: '#f4e04d' }
  ];

  function lon(p, t) {   /* heliocentric longitude, rad, at ms-epoch t */
    var T = (t - J2000) / 86400000 / 36525;
    return (((p.L0 + p.dL * T) % 360) + 360) % 360 * DEG;
  }

  window.VENUSAPPS = window.VENUSAPPS || {};
  window.VENUSAPPS.orbits = {
    icon: '☉', title: 'ORBITS', w: 700, h: 620,
    mount: function (node) {
      node.appendChild(h(
        '<div class="app">' +
          '<div class="app-head"><span class="h-title">INNER SYSTEM · LIVE</span>' +
            '<span class="spacer"></span>' +
            '<button class="ghost" data-a="scope">+ OUTER</button>' +
            '<button class="ghost" data-a="today">TODAY</button></div>' +
          '<div class="stage"><canvas></canvas>' +
            '<div class="hint">CLICK A PLANET · DRAG THE WARP SLIDER · GOLD LINE = EARTH–VENUS</div></div>' +
          '<div class="strip">' +
            '<label>WARP</label>' +
            '<input type="range" data-k="warp" min="-100" max="100" value="12" aria-label="Time warp">' +
            '<span class="readout" data-f="warp">—</span>' +
            '<span class="readout" data-f="date" style="min-width:108px">—</span>' +
          '</div>' +
          '<div class="app-foot"><span data-f="sel">CLICK A PLANET FOR ITS SHEET</span>' +
            '<span class="spacer"></span><span data-f="conj">—</span></div>' +
        '</div>'
      ));

      var cv = node.querySelector('canvas'), ctx = cv.getContext('2d');
      var f = {};
      node.querySelectorAll('[data-f]').forEach(function (n) { f[n.dataset.f] = n; });
      var warpEl = node.querySelector('[data-k="warp"]');

      var simT = Date.now(), warp = 0, outer = false, sel = 1;  /* Venus preselected */
      var trails = [];
      PLANETS.forEach(function () { trails.push([]); });

      function setWarp() {
        var v = +warpEl.value;
        warp = Math.sign(v) * Math.pow(Math.abs(v) / 100, 3) * 3.65e10; /* up to ±365 d/s, cubic feel */
        var dps = warp / 86400000;
        f.warp.textContent = Math.abs(dps) < 0.05 ? 'PAUSED' :
          (dps > 0 ? '+' : '−') + Math.abs(dps).toFixed(1) + ' D/S';
      }
      warpEl.addEventListener('input', setWarp); setWarp();

      node.querySelector('[data-a="today"]').addEventListener('click', function () {
        simT = Date.now(); trails.forEach(function (t) { t.length = 0; });
      });
      var scopeBtn = node.querySelector('[data-a="scope"]');
      scopeBtn.addEventListener('click', function () {
        outer = !outer;
        scopeBtn.textContent = outer ? '− INNER' : '+ OUTER';
        trails.forEach(function (t) { t.length = 0; });
      });

      function resize() {
        var r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
        cv.width = Math.max(1, r.width * dpr); cv.height = Math.max(1, r.height * dpr);
      }
      resize(); addEventListener('resize', resize);

      /* radius mapping: linear for the inner four, gentle sqrt when outer on */
      function rMap(a, R) {
        if (!outer) return a / 1.62 * R;
        return Math.sqrt(a / 9.8) * R;
      }

      cv.addEventListener('pointerdown', function (e) {
        var r = cv.getBoundingClientRect(), dpr = cv.width / r.width;
        var mx = (e.clientX - r.left) * dpr, my = (e.clientY - r.top) * dpr;
        var W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
        var R = Math.min(W, H) * 0.46;
        var bestD = 24 * dpr, hit = -1;
        PLANETS.forEach(function (p, i) {
          if (!outer && i > 3) return;
          var L = lon(p, simT), rr = rMap(p.a, R);
          var px = cx + Math.cos(L) * rr, py = cy - Math.sin(L) * rr;
          var d = Math.hypot(mx - px, my - py);
          if (d < bestD) { bestD = d; hit = i; }
        });
        if (hit >= 0) { sel = hit; sheet(); }
      });

      function sheet() {
        var p = PLANETS[sel];
        var period = 360 / p.dL * 36525;
        var Lp = lon(p, simT), Le = lon(PLANETS[2], simT);
        var dx = p.a * Math.cos(Lp) - Math.cos(Le), dy = p.a * Math.sin(Lp) - Math.sin(Le);
        f.sel.innerHTML = '<b style="color:' + p.col + '">' + p.name + '</b> · a ' + p.a.toFixed(3) +
          ' AU · period ' + period.toFixed(1) + ' d · from Earth ' + Math.hypot(dx, dy).toFixed(3) + ' AU';
      }
      sheet();

      var acc = 0;
      var stop = window.VENUSKIT.loop(function (dt) {
        if (!cv.offsetParent) return;
        acc += dt; if (acc < 33) return;
        simT += warp * (acc / 1000); acc = 0;

        var W = cv.width, H = cv.height, cx = W / 2, cy = H / 2;
        var R = Math.min(W, H) * 0.46;
        var dpr2 = Math.min(devicePixelRatio || 1, 2);

        ctx.fillStyle = '#050301'; ctx.fillRect(0, 0, W, H);

        /* faint stars */
        for (var s = 0; s < 60; s++) {
          var q = Math.sin(s * 127.1) * 43758.5453; q -= Math.floor(q);
          var q2 = Math.sin(s * 311.7) * 43758.5453; q2 -= Math.floor(q2);
          ctx.globalAlpha = 0.12 + (s % 4) * 0.07;
          ctx.fillStyle = '#e8e2d2';
          ctx.fillRect(q * W, q2 * H, 1.2 * dpr2, 1.2 * dpr2);
        }
        ctx.globalAlpha = 1;

        /* sun */
        var sg = ctx.createRadialGradient(cx, cy, 1, cx, cy, 22 * dpr2);
        sg.addColorStop(0, '#fff6c9'); sg.addColorStop(0.4, '#ffc83d'); sg.addColorStop(1, 'rgba(255,122,47,0)');
        ctx.fillStyle = sg;
        ctx.beginPath(); ctx.arc(cx, cy, 22 * dpr2, 0, 7); ctx.fill();

        var pos = [];
        PLANETS.forEach(function (p, i) {
          if (!outer && i > 3) { pos.push(null); return; }
          var rr = rMap(p.a, R);
          ctx.strokeStyle = 'rgba(74,53,23,.8)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 7); ctx.stroke();

          var L = lon(p, simT);
          var px = cx + Math.cos(L) * rr, py = cy - Math.sin(L) * rr;
          pos.push([px, py]);

          var tr = trails[i];
          tr.push([px, py]);
          if (tr.length > 90) tr.shift();
          for (var ti = 1; ti < tr.length; ti++) {
            ctx.globalAlpha = ti / tr.length * 0.35;
            ctx.strokeStyle = p.col;
            ctx.beginPath(); ctx.moveTo(tr[ti - 1][0], tr[ti - 1][1]); ctx.lineTo(tr[ti][0], tr[ti][1]); ctx.stroke();
          }
          ctx.globalAlpha = 1;

          var pr = p.r * dpr2 * (i === sel ? 1.25 : 1);
          if (i === 1) {  /* Venus gets the glow */
            ctx.shadowColor = '#ffc83d'; ctx.shadowBlur = 14 * dpr2;
          }
          ctx.fillStyle = p.col;
          ctx.beginPath(); ctx.arc(px, py, pr, 0, 7); ctx.fill();
          ctx.shadowBlur = 0;
          if (i === sel) {
            ctx.strokeStyle = 'rgba(255,233,168,.8)';
            ctx.beginPath(); ctx.arc(px, py, pr + 4 * dpr2, 0, 7); ctx.stroke();
          }
          ctx.fillStyle = 'rgba(245,236,216,.6)';
          ctx.font = (9 * dpr2) + 'px ui-monospace,monospace'; ctx.textAlign = 'center';
          ctx.fillText(p.name, px, py - pr - 6 * dpr2);
        });

        /* Earth–Venus line, brightening toward inferior conjunction */
        var pv = pos[1], pe = pos[2];
        if (pv && pe) {
          var Lv = lon(PLANETS[1], simT), Le2 = lon(PLANETS[2], simT);
          var dAng = Math.abs((((Lv - Le2) / DEG % 360) + 540) % 360 - 180);  /* 180 = conjunction-ish metric */
          var closeness = 1 - Math.min(1, Math.abs(180 - dAng) / 60);
          ctx.globalAlpha = 0.15 + closeness * 0.6;
          ctx.strokeStyle = '#ffc83d';
          ctx.setLineDash([4 * dpr2, 4 * dpr2]);
          ctx.beginPath(); ctx.moveTo(pe[0], pe[1]); ctx.lineTo(pv[0], pv[1]); ctx.stroke();
          ctx.setLineDash([]); ctx.globalAlpha = 1;

          var days = ((360 - (((Lv - Le2) / DEG) % 360 + 360) % 360) % 360) / (360 / 583.92);
          f.conj.textContent = 'INFERIOR CONJUNCTION IN ~' + Math.round(days) + ' D';
        }

        f.date.textContent = new Date(simT).toISOString().slice(0, 10);
        sheet();
      });
      return stop;
    }
  };
})();
