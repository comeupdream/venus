/* =============================================================================
 * venera.js — VENERA.EXE. Drop a probe from 65 km, land it, keep it alive.
 *
 * The physics is the point: gravity 8.87 m/s², atmospheric density
 * ρ(h) ≈ 65·e^(-h/15900) kg/m³ — thin at the cloud deck, soup at the surface.
 * A free-falling probe lands at ~8 m/s with no chute at all, which is why the
 * real Venera landers cut theirs on the way down. Discovering that is the
 * game. Then the surface phase: 462 °C cooks you; transmit science while
 * you still can. VENERA-13 survived 127 minutes. You will not.
 * ===========================================================================*/

(function () {
  'use strict';

  var h = window.VENUSKIT.h;
  var G = 8.87, RHO0 = 65, SCALE_H = 15900;
  var BALLISTIC = 0.008, CHUTE = 0.32;      /* Cd·A/m, chuteless vs chuted */

  window.VENUSAPPS = window.VENUSAPPS || {};
  window.VENUSAPPS.venera = {
    icon: '🛰', title: 'VENERA.EXE', w: 720, h: 560,
    mount: function (node) {
      node.appendChild(h(
        '<div class="app">' +
          '<div class="app-head"><span class="h-title">DESCENT MODULE</span>' +
            '<span class="spacer"></span><span class="h-sub" data-f="phase">READY</span></div>' +
          '<div class="stage"><canvas tabindex="0"></canvas>' +
            '<div class="hint">SPACE / CLICK — CHUTE · LAND UNDER 10 M/S</div></div>' +
          '<div class="strip">' +
            '<button class="genbtn" data-a="act">DROP</button>' +
            '<span class="readout" data-f="alt">ALT 65.0 KM</span>' +
            '<span class="readout" data-f="vel">VEL 0 M/S</span>' +
            '<span class="readout" data-f="temp" style="min-width:90px">HULL 20°C</span>' +
          '</div>' +
          '<div class="app-foot"><span>VENERA-13 SURVIVED 127 MIN ON THE SURFACE. YOU WILL NOT.</span>' +
            '<span class="spacer"></span><span data-f="best">—</span></div>' +
        '</div>'
      ));

      var cv = node.querySelector('canvas'), ctx = cv.getContext('2d');
      var f = {};
      node.querySelectorAll('[data-f]').forEach(function (n) { f[n.dataset.f] = n; });
      var btn = node.querySelector('[data-a="act"]');

      var best = 0;
      try { best = +localStorage.getItem('venus-venera-best') || 0; } catch (e) {}
      showBest();
      function showBest() { f.best.textContent = best ? 'BEST ' + best.toFixed(0) + ' PTS' : ''; }

      /* state: 'ready' | 'fall' | 'surface' | 'dead' | 'done' */
      var st, alt, vel, hull, chute, chuteRipped, score, surfT, heat, transmitting;

      function reset() {
        st = 'ready'; alt = 65000; vel = 0; hull = 20; chute = false; chuteRipped = false;
        score = 0; surfT = 0; heat = 30; transmitting = false;
        btn.textContent = 'DROP';
        f.phase.textContent = 'READY';
      }
      reset();

      function act() {
        if (st === 'ready') { st = 'fall'; btn.textContent = 'CHUTE'; f.phase.textContent = 'DESCENT'; }
        else if (st === 'fall') {
          if (!chuteRipped) {
            chute = !chute;
            /* deploy too fast in thin air and it shreds */
            if (chute && vel > 250 && alt > 52000) { chute = false; chuteRipped = true; f.phase.textContent = 'CHUTE SHREDDED'; }
            else btn.textContent = chute ? 'CUT CHUTE' : 'CHUTE';
          }
        } else if (st === 'surface') { transmitting = !transmitting; btn.textContent = transmitting ? 'COOLING' : 'TRANSMIT'; }
        else reset();
      }
      btn.addEventListener('click', act);
      cv.addEventListener('pointerdown', function () { cv.focus(); act(); });
      node.firstChild.setAttribute('tabindex', '0');
      node.firstChild.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); act(); }
      });

      function resize() {
        var r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
        cv.width = Math.max(1, r.width * dpr); cv.height = Math.max(1, r.height * dpr);
      }
      resize(); addEventListener('resize', resize);

      var stop = window.VENUSKIT.loop(function (dt) {
        if (!cv.offsetParent) return;
        var s = dt / 1000;

        if (st === 'fall') {
          var rho = RHO0 * Math.exp(-alt / SCALE_H);
          var drag = 0.5 * rho * vel * vel * (chute ? CHUTE : BALLISTIC);
          vel += (G - drag) * s * 12;                 /* 12x time so a run is ~90s */
          if (vel < 0) vel = 0;
          alt -= vel * s * 12;
          /* aero heating in the fast thin phase + ambient soak lower down */
          var ambient = 462 - Math.max(0, alt) / 62000 * 507;
          hull += (rho * Math.pow(vel, 3) * 4e-6 + (ambient - hull) * 0.004) * s * 12;
          if (hull > 380) { st = 'dead'; f.phase.textContent = 'BURNED UP'; btn.textContent = 'RETRY'; }
          if (alt <= 0) {
            alt = 0;
            if (vel <= 10) { st = 'surface'; f.phase.textContent = 'TOUCHDOWN ✓'; btn.textContent = 'TRANSMIT'; heat = 30; }
            else { st = 'dead'; f.phase.textContent = 'IMPACT AT ' + vel.toFixed(0) + ' M/S'; btn.textContent = 'RETRY'; }
          }
        } else if (st === 'surface') {
          surfT += s;
          heat += (transmitting ? 1.15 : 0.55) * s;
          if (transmitting) score += 14 * s;
          if (heat >= 100) {
            st = 'done'; btn.textContent = 'AGAIN';
            var total = Math.round(score + surfT);
            f.phase.textContent = 'ELECTRONICS DEAD · ' + surfT.toFixed(0) + 'S · ' + total + ' PTS';
            if (total > best) { best = total; try { localStorage.setItem('venus-venera-best', String(best)); } catch (e) {} showBest(); }
          }
        }

        f.alt.textContent = 'ALT ' + (alt / 1000).toFixed(1) + ' KM';
        f.vel.textContent = 'VEL ' + vel.toFixed(0) + ' M/S';
        f.temp.textContent = st === 'surface' || st === 'done'
          ? 'CORE ' + heat.toFixed(0) + '°C' : 'HULL ' + hull.toFixed(0) + '°C';
        f.temp.style.color = (st === 'surface' ? heat > 80 : hull > 300) ? 'var(--ember)' : 'var(--gold)';

        draw();
      });

      function draw() {
        var W = cv.width, H = cv.height;
        /* sky gradient shifts from cloud-deck gold to furnace floor */
        var k = 1 - Math.min(1, alt / 65000);
        var g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, mix('#241a0a', '#3a1004', k));
        g.addColorStop(1, mix('#4a3517', '#7a2a08', k));
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

        /* cloud bands drift past during descent */
        ctx.globalAlpha = 0.16;
        for (var i = 0; i < 7; i++) {
          var y = ((i * 137 + (65000 - alt) * 0.02) % (H + 80)) - 40;
          ctx.fillStyle = i % 2 ? '#f4e04d' : '#ffc83d';
          ctx.fillRect(0, y, W, 14 + (i % 3) * 8);
        }
        ctx.globalAlpha = 1;

        /* altimeter tape */
        ctx.strokeStyle = 'rgba(176,154,110,.5)'; ctx.fillStyle = 'rgba(176,154,110,.8)';
        ctx.font = '10px ui-monospace,monospace'; ctx.textAlign = 'right';
        for (var a = 0; a <= 65; a += 5) {
          var ty = H * 0.1 + (65 - a) / 65 * H * 0.75;
          ctx.beginPath(); ctx.moveTo(W - 8, ty); ctx.lineTo(W - 22, ty); ctx.stroke();
          ctx.fillText(a + '', W - 26, ty + 3);
        }

        /* surface rises into view at the end */
        if (alt < 8000) {
          var sy = H - (8000 - alt) / 8000 * H * 0.22;
          ctx.fillStyle = '#6a4210';
          ctx.beginPath(); ctx.moveTo(0, H);
          for (var x = 0; x <= W; x += W / 24) {
            var n = Math.sin(x * 0.013 + 7) * 0.5 + Math.sin(x * 0.031) * 0.5;
            ctx.lineTo(x, sy + n * H * 0.03);
          }
          ctx.lineTo(W, H); ctx.fill();
        }

        /* the probe */
        var px = W / 2, py = st === 'surface' || st === 'done' ? H * 0.78 : H * 0.34;
        if (chute) {
          ctx.strokeStyle = '#cdb07c'; ctx.beginPath();
          ctx.moveTo(px - 26, py - 44); ctx.lineTo(px, py - 6); ctx.moveTo(px + 26, py - 44); ctx.lineTo(px, py - 6); ctx.stroke();
          ctx.fillStyle = '#ffc83d';
          ctx.beginPath(); ctx.arc(px, py - 46, 30, Math.PI, 0); ctx.fill();
        }
        ctx.fillStyle = st === 'dead' ? '#3a1004' : '#ffc83d';
        ctx.beginPath(); ctx.arc(px, py, 13, 0, 7); ctx.fill();
        ctx.fillStyle = '#ffe9a8'; ctx.beginPath(); ctx.arc(px - 4, py - 4, 4, 0, 7); ctx.fill();
        ctx.strokeStyle = '#b8862a'; ctx.beginPath();
        ctx.moveTo(px - 9, py + 10); ctx.lineTo(px - 14, py + 20);
        ctx.moveTo(px + 9, py + 10); ctx.lineTo(px + 14, py + 20); ctx.stroke();
        if (transmitting) {
          ctx.strokeStyle = 'rgba(244,224,77,.7)';
          ctx.beginPath(); ctx.arc(px, py - 16, 8 + (Date.now() % 600) / 60, -2.4, -0.7); ctx.stroke();
        }

        if (st === 'ready') overlay('CLICK TO DROP', '65 KM · CO2 ATMOSPHERE · GOOD LUCK');
        if (st === 'dead') overlay('PROBE LOST', 'CLICK TO RETRY');
        if (st === 'done') overlay('MISSION COMPLETE', Math.round(score + surfT) + ' PTS · CLICK FOR ANOTHER');

        function overlay(a, b) {
          ctx.fillStyle = 'rgba(10,7,2,.55)'; ctx.fillRect(0, 0, W, H);
          ctx.textAlign = 'center'; ctx.fillStyle = '#ffe9a8';
          ctx.font = '900 ' + (W * 0.04) + 'px ui-sans-serif,system-ui';
          ctx.fillText(a, W / 2, H * 0.46);
          ctx.fillStyle = '#b09a6e'; ctx.font = (W * 0.016) + 'px ui-monospace,monospace';
          ctx.fillText(b, W / 2, H * 0.53);
        }
      }

      function mix(a, b, t) {
        var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
        var r = ((pa >> 16) + (((pb >> 16) - (pa >> 16)) * t)) | 0;
        var g2 = (((pa >> 8) & 255) + ((((pb >> 8) & 255) - ((pa >> 8) & 255)) * t)) | 0;
        var bl = ((pa & 255) + (((pb & 255) - (pa & 255)) * t)) | 0;
        return 'rgb(' + r + ',' + g2 + ',' + bl + ')';
      }

      return stop;
    }
  };
})();
