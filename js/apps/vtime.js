/* =============================================================================
 * vtime.js — VENUS TIME. The planet where the day outlasts the year and the
 * sun rises in the west. Sidereal day 243.025 d (retrograde), SOLAR day
 * 116.75 d, year 224.701 d.
 * ===========================================================================*/

(function () {
  'use strict';

  var h = window.VENUSKIT.h;
  var SOLAR = 116.75, SIDEREAL = 243.025, YEAR = 224.701;
  var J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);

  window.VENUSAPPS = window.VENUSAPPS || {};
  window.VENUSAPPS.vtime = {
    icon: '⧗', title: 'VENUS TIME', w: 480, h: 540, desktop: false,
    mount: function (node) {
      node.appendChild(h(
        '<div class="app">' +
          '<div class="app-head"><span class="h-title">VENUS TIME</span>' +
            '<span class="spacer"></span><span class="h-sub">1 DAY &gt; 1 YEAR</span></div>' +
          '<div class="app-body">' +
            '<div class="card wide" style="text-align:center;padding:16px">' +
              '<div style="font-family:var(--mono);font-size:10px;letter-spacing:.24em;color:var(--dim)">VENUS SOLAR DAYS SINCE J2000</div>' +
              '<div data-f="sols" style="font-size:30px;font-weight:900;color:var(--gold);margin-top:6px">—</div>' +
            '</div>' +
            '<div class="card wide" style="margin-top:12px">' +
              '<div style="display:flex;gap:10px;align-items:center;margin-bottom:10px">' +
                '<span style="font-size:12px;color:var(--dim)">Your birthday</span>' +
                '<input data-f="bd" type="date" value="2000-01-01"></div>' +
              '<table class="spec">' +
                '<tr><th>Age in Venus solar days</th><td class="n" data-f="asol">—</td></tr>' +
                '<tr><th>Age in Venus sidereal days</th><td class="n" data-f="asid">—</td></tr>' +
                '<tr><th>Age in Venus years</th><td class="n" data-f="ayr">—</td></tr>' +
                '<tr><th>Next Venus-year birthday</th><td class="n" data-f="next">—</td></tr>' +
              '</table>' +
            '</div>' +
            '<div class="prose" style="margin-top:12px"><p>The <strong>sidereal</strong> day — one true rotation, ' +
            '243.025 Earth days — is longer than the 224.7-day year, and it spins <strong>backwards</strong>. ' +
            'Combine the two and a <strong>solar</strong> day (noon to noon) works out to 116.75 Earth days, ' +
            'with the sun rising in the west. Two sunrises per year. Neither is worth waiting up for: ' +
            'you cannot see the sun from the surface anyway.</p></div>' +
          '</div>' +
          '<div class="app-foot"><span>SIDEREAL 243.025 D · SOLAR 116.75 D · YEAR 224.701 D</span></div>' +
        '</div>'
      ));

      var f = {};
      node.querySelectorAll('[data-f]').forEach(function (n) { f[n.dataset.f] = n; });

      function birthday() {
        var bd = new Date(f.bd.value + 'T00:00:00Z');
        if (isNaN(bd)) return;
        var days = (Date.now() - bd.getTime()) / 86400000;
        f.asol.textContent = (days / SOLAR).toFixed(2);
        f.asid.textContent = (days / SIDEREAL).toFixed(2);
        f.ayr.textContent = (days / YEAR).toFixed(2);
        var nextN = Math.ceil(days / YEAR);
        var next = new Date(bd.getTime() + nextN * YEAR * 86400000);
        f.next.textContent = next.toISOString().slice(0, 10) + ' (V-YEAR ' + nextN + ')';
      }
      f.bd.addEventListener('input', birthday);
      birthday();

      var acc = 0;
      var stop = window.VENUSKIT.loop(function (dt) {
        acc += dt; if (acc < 1000) return; acc = 0;
        f.sols.textContent = ((Date.now() - J2000) / 86400000 / SOLAR).toFixed(4);
      });
      return stop;
    }
  };
})();
