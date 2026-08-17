/* =============================================================================
 * transit.js — TRANSIT 2117. Countdown to the next transit of Venus across
 * the Sun: 2117-12-11. The 2004/2012 pair was the last any living person
 * will see. Transits come in pairs 8 years apart, separated by 105.5 or
 * 121.5 years; the 1761/1769 pair gave humanity its first real measure of
 * the astronomical unit.
 * ===========================================================================*/

(function () {
  'use strict';

  var h = window.VENUSKIT.h;
  var TARGET = Date.UTC(2117, 11, 11, 2, 48, 0);   /* mid-transit, approx */

  window.VENUSAPPS = window.VENUSAPPS || {};
  window.VENUSAPPS.transit = {
    icon: '⊙', title: 'TRANSIT 2117', w: 560, h: 560, desktop: false,
    mount: function (node) {
      node.appendChild(h(
        '<div class="app">' +
          '<div class="app-head"><span class="h-title">NEXT TRANSIT OF VENUS</span>' +
            '<span class="spacer"></span><span class="h-sub">DEC 10–11 · 2117</span></div>' +
          '<div class="app-body">' +
            '<div class="card wide" style="text-align:center;padding:18px">' +
              '<div style="font-family:var(--mono);font-size:10px;letter-spacing:.26em;color:var(--dim)">T MINUS</div>' +
              '<div class="vmark" data-f="cd" style="font-size:30px;margin:8px 0 2px;display:inline-block">—</div>' +
            '</div>' +
            '<canvas class="well" style="margin-top:12px;height:190px"></canvas>' +
            '<p class="prose" style="font-size:11px;color:var(--faint);margin-top:6px">NOT TO SCALE. VENUS IS ' +
              '~1/32 OF THE SOLAR DISC. IT WAS STILL ENOUGH TO MEASURE THE SOLAR SYSTEM.</p>' +
            '<div class="card wide" style="margin-top:10px">' +
              '<div class="row" style="display:flex;gap:8px;align-items:center">' +
                '<span style="font-size:12px;color:var(--dim)">Born in</span>' +
                '<input data-f="yr" type="number" min="1900" max="2117" value="2000" style="width:88px">' +
                '<span data-f="verdict" style="font-family:var(--mono);font-size:11px;color:var(--gold)"></span>' +
              '</div>' +
            '</div>' +
            '<div class="prose" style="margin-top:12px"><p>Previous transits: 1874 · 1882 · 2004 · 2012. ' +
            'They come in pairs eight years apart, a century-and-change between pairs. The 2012 transit was ' +
            'the last one any person now alive is guaranteed to have had the chance to see.</p></div>' +
          '</div>' +
        '</div>'
      ));

      var cd = node.querySelector('[data-f="cd"]');
      var cv = node.querySelector('canvas'), ctx = cv.getContext('2d');
      var yr = node.querySelector('[data-f="yr"]');
      var verdict = node.querySelector('[data-f="verdict"]');

      function judge() {
        var age = 2117 - (+yr.value || 2000);
        verdict.textContent = age <= 105 ? 'YOU WOULD BE ' + age + '. SEE YOU THERE.'
                                         : 'YOU WOULD BE ' + age + '. TELL YOUR GRANDCHILDREN.';
      }
      yr.addEventListener('input', judge); judge();

      var acc = 0;
      var stop = window.VENUSKIT.loop(function (dt) {
        acc += dt; if (acc < 250) return; acc = 0;
        if (!cv.offsetParent) return;

        var ms = TARGET - Date.now();
        var days = Math.floor(ms / 86400000);
        var rem = ms - days * 86400000;
        var hh = Math.floor(rem / 3600000), mm = Math.floor(rem % 3600000 / 60000), ss = Math.floor(rem % 60000 / 1000);
        cd.textContent = days.toLocaleString() + 'd ' +
          String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0');

        /* the crossing, on a 60s loop */
        var r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
        cv.width = r.width * dpr; cv.height = r.height * dpr;
        var W = cv.width, H = cv.height;
        ctx.fillStyle = '#04070f'; ctx.fillRect(0, 0, W, H);
        var sr = H * 0.42, sx = W / 2, sy = H / 2;
        var g = ctx.createRadialGradient(sx, sy, sr * 0.2, sx, sy, sr);
        g.addColorStop(0, '#ffe9a8'); g.addColorStop(0.85, '#ffc83d'); g.addColorStop(1, '#ff7a2f');
        ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 7); ctx.fillStyle = g; ctx.fill();

        var t = (Date.now() % 60000) / 60000;
        var vx = sx - sr * 1.3 + t * sr * 2.6;
        var vy = sy + sr * 0.42;
        var vr = sr / 32;
        /* the black-drop smear near the limb */
        var dEdge = Math.abs(Math.hypot(vx - sx, vy - sy) - sr);
        if (dEdge < vr * 4 && Math.hypot(vx - sx, vy - sy) < sr + vr * 2) {
          ctx.fillStyle = 'rgba(4,7,15,.6)';
          ctx.beginPath(); ctx.ellipse(vx, vy, vr * 2.4, vr * 1.2, 0, 0, 7); ctx.fill();
        }
        if (Math.hypot(vx - sx, vy - sy) < sr + vr) {
          ctx.fillStyle = '#04070f';
          ctx.beginPath(); ctx.arc(vx, vy, vr, 0, 7); ctx.fill();
        }
      });
      return stop;
    }
  };
})();
