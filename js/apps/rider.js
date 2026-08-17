/* =============================================================================
 * rider.js — CLOUD RIDER. One button, 360 km/h tailwind, the 55 km deck.
 * Hold to climb, release to sink. Virga kills, eddies shove, vents boost.
 * One sky per day — the seed is the date, so every run tonight is the same
 * deck everyone else is flying.
 * ===========================================================================*/

(function () {
  'use strict';

  var h = window.VENUSKIT.h;

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  window.VENUSAPPS = window.VENUSAPPS || {};
  window.VENUSAPPS.rider = {
    icon: '🪁', title: 'CLOUD RIDER', w: 760, h: 540,
    mount: function (node) {
      var d = new Date();
      var seedStr = '' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');

      node.appendChild(h(
        '<div class="app">' +
          '<div class="app-head"><span class="h-title">SUPERROTATION GLIDER</span>' +
            '<span class="spacer"></span><span class="h-sub" data-f="stat">HOLD TO RIDE</span></div>' +
          '<div class="stage"><canvas tabindex="0"></canvas>' +
            '<div class="hint">HOLD POINTER / SPACE — LIFT · 48 KM = HEAT · 70 KM = STALL</div></div>' +
          '<div class="app-foot"><span>DECK OF ' + seedStr + '</span><span class="spacer"></span>' +
            '<button class="ghost" data-a="share" style="padding:2px 8px;font-size:10px">SHARE CARD</button>' +
            '<span data-f="dist">0.0 KM</span><span data-f="best">—</span></div>' +
        '</div>'
      ));

      var cv = node.querySelector('canvas'), ctx = cv.getContext('2d');
      var f = {};
      node.querySelectorAll('[data-f]').forEach(function (n) { f[n.dataset.f] = n; });

      var best = 0;
      try { best = +localStorage.getItem('venus-rider-best') || 0; } catch (e) {}
      showBest();
      function showBest() { f.best.textContent = best ? 'BEST ' + best.toFixed(1) + ' KM' : ''; }

      /* world gen: one obstacle per ~140px band, typed by the daily PRNG */
      var rnd, obs, py, vy, dist, speed, heat, state, hold, W = 0, H = 0, dpr = 1;

      function reset() {
        rnd = mulberry32(+seedStr);
        obs = [];
        var x = 900;
        for (var i = 0; i < 2000; i++) {
          var r = rnd(), type = r < 0.5 ? 'virga' : r < 0.8 ? 'eddy' : 'vent';
          obs.push({ x: x, y: 0.12 + rnd() * 0.72, type: type, w: 26 + rnd() * 30, h2: 0.2 + rnd() * 0.45, spin: rnd() * 7 });
          x += 120 + rnd() * 160;
        }
        py = 0.5; vy = 0; dist = 0; speed = 160; heat = 0; state = 'ready'; hold = false;
        f.stat.textContent = 'HOLD TO RIDE';
      }
      reset();

      var root = node.firstChild;
      function down() { if (state === 'ready') state = 'fly'; if (state === 'dead') { reset(); state = 'fly'; } hold = true; cv.focus(); }
      function up() { hold = false; }
      cv.addEventListener('pointerdown', down);
      addEventListener('pointerup', up);
      root.setAttribute('tabindex', '0');
      root.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); down(); } });
      root.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'ArrowUp') up(); });

      function resize() {
        var r = cv.getBoundingClientRect();
        dpr = Math.min(devicePixelRatio || 1, 2);
        W = cv.width = Math.max(1, r.width * dpr);
        H = cv.height = Math.max(1, r.height * dpr);
      }
      resize(); addEventListener('resize', resize);

      var stop = window.VENUSKIT.loop(function (dt) {
        if (!cv.offsetParent) return;
        var s = Math.min(0.05, dt / 1000);

        if (state === 'fly') {
          speed = Math.min(400, speed + s * 4);
          dist += speed * s;
          vy += (hold ? -2.6 : 2.0) * s;
          vy = Math.max(-1.1, Math.min(1.3, vy));
          py += vy * s;
          if (py < 0.04) { py = 0.04; vy = 0.35; }          /* 70 km: stall, shoved down */
          if (py > 0.96) py = 0.96;
          heat = py > 0.82 ? heat + s / 2.5 : Math.max(0, heat - s / 2);
          if (heat >= 1) die('COOKED IN THE HAZE');

          for (var i = 0; i < obs.length; i++) {
            var o = obs[i];
            var sx = o.x - dist;
            if (sx < -80) continue;
            if (sx > W / dpr) break;
            var ox = sx * dpr, oy = o.y * H;
            var pxx = W * 0.24, pyy = py * H;
            if (o.type === 'virga') {
              if (Math.abs(ox - pxx) < o.w * dpr / 2 + 9 * dpr && pyy > oy - 6 * dpr && pyy < oy + o.h2 * H) die('ACID VIRGA');
            } else if (o.type === 'eddy') {
              if (Math.hypot(ox - pxx, oy - pyy) < 34 * dpr) vy += (o.spin % 2 ? 1 : -1) * s * 9;
            } else {
              if (Math.abs(ox - pxx) < 30 * dpr && pyy > oy) vy -= s * 7;
            }
          }
          f.dist.textContent = (dist / 100).toFixed(1) + ' KM';
        }

        draw(s);
      });

      function die(why) {
        state = 'dead';
        var km = dist / 100;
        f.stat.textContent = 'LOST IN THE DECK AT ' + km.toFixed(1) + ' KM — ' + why;
        if (km > best) { best = km; try { localStorage.setItem('venus-rider-best', String(km)); } catch (e) {} showBest(); }
      }

      var t = 0;
      function draw(s) {
        t += s;
        var g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#1d1508'); g.addColorStop(0.8, '#3a2408'); g.addColorStop(1, '#4a1a04');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

        /* three parallax band layers */
        for (var L = 0; L < 3; L++) {
          var sp = [0.3, 0.6, 1][L], al = [0.1, 0.14, 0.2][L];
          ctx.globalAlpha = al; ctx.fillStyle = L === 2 ? '#f4e04d' : '#ffc83d';
          for (var i = 0; i < 5; i++) {
            var yy = (i * 0.22 + 0.06 + L * 0.05) * H;
            var xoff = -(dist * sp * dpr) % (W * 0.7);
            for (var xx = xoff - W * 0.7; xx < W; xx += W * 0.7) {
              ctx.beginPath();
              ctx.ellipse(xx + W * 0.35, yy + Math.sin(t * 0.4 + i + L) * 6 * dpr, W * 0.3, 11 * dpr + L * 4 * dpr, 0, 0, 7);
              ctx.fill();
            }
          }
        }
        ctx.globalAlpha = 1;

        /* obstacles */
        for (var j = 0; j < obs.length; j++) {
          var o = obs[j];
          var sx = (o.x - dist) * dpr;
          if (sx < -100 * dpr || sx > W + 100) continue;
          var oy = o.y * H;
          if (o.type === 'virga') {
            ctx.fillStyle = 'rgba(194,65,12,.4)';
            ctx.fillRect(sx - o.w * dpr / 2, oy, o.w * dpr, o.h2 * H);
            ctx.fillStyle = 'rgba(255,122,47,.5)';
            for (var k2 = 0; k2 < 4; k2++) {
              var drip = ((t * 60 + k2 * 37) % (o.h2 * H / dpr)) * dpr;
              ctx.fillRect(sx - o.w * dpr / 2 + k2 * o.w * dpr / 4 + 3, oy + drip, 2 * dpr, 8 * dpr);
            }
          } else if (o.type === 'eddy') {
            ctx.strokeStyle = 'rgba(205,176,124,.55)';
            ctx.beginPath(); ctx.arc(sx, oy, 24 * dpr, t * (o.spin % 2 ? 2 : -2), t * (o.spin % 2 ? 2 : -2) + 4.6); ctx.stroke();
            ctx.beginPath(); ctx.arc(sx, oy, 14 * dpr, -t * 2.6, -t * 2.6 + 4.2); ctx.stroke();
          } else {
            var gl = ctx.createLinearGradient(0, oy, 0, H);
            gl.addColorStop(0, 'rgba(244,224,77,.4)'); gl.addColorStop(1, 'rgba(244,224,77,0)');
            ctx.fillStyle = gl;
            ctx.fillRect(sx - 26 * dpr, oy, 52 * dpr, H - oy);
          }
        }

        /* altitude tape + heat */
        ctx.fillStyle = 'rgba(176,154,110,.7)'; ctx.font = (9 * dpr) + 'px ui-monospace,monospace'; ctx.textAlign = 'right';
        ctx.fillText('70', W - 6 * dpr, H * 0.05);
        ctx.fillText('55', W - 6 * dpr, H * 0.5);
        ctx.fillText('48', W - 6 * dpr, H * 0.97);
        if (heat > 0) {
          ctx.fillStyle = 'rgba(255,122,47,.85)';
          ctx.fillRect(0, H - 5 * dpr, W * heat, 5 * dpr);
        }

        /* the glider */
        var px = W * 0.24, pyy = py * H, ang = Math.max(-0.5, Math.min(0.6, vy * 0.5));
        ctx.save(); ctx.translate(px, pyy); ctx.rotate(ang);
        ctx.strokeStyle = 'rgba(255,200,61,.4)';
        ctx.beginPath(); ctx.moveTo(-34 * dpr, 2); ctx.lineTo(-10 * dpr, 0); ctx.stroke();
        ctx.fillStyle = state === 'dead' ? '#3a1004' : '#ffc83d';
        ctx.beginPath(); ctx.moveTo(14 * dpr, 0); ctx.lineTo(-10 * dpr, -7 * dpr); ctx.lineTo(-10 * dpr, 7 * dpr); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffe9a8'; ctx.fillRect(-2 * dpr, -2 * dpr, 4 * dpr, 4 * dpr);
        ctx.restore();

        if (state !== 'fly') {
          ctx.fillStyle = 'rgba(10,7,2,.5)'; ctx.fillRect(0, 0, W, H);
          ctx.textAlign = 'center'; ctx.fillStyle = '#ffe9a8';
          ctx.font = '900 ' + (W * 0.032) + 'px ui-sans-serif,system-ui';
          ctx.fillText(state === 'ready' ? 'HOLD TO RIDE THE SUPERROTATION' : 'THE WIND KEEPS IT', W / 2, H * 0.44);
          ctx.fillStyle = '#b09a6e'; ctx.font = (W * 0.015) + 'px ui-monospace,monospace';
          ctx.fillText(state === 'ready' ? '360 KM/H TAILWIND · ONE BUTTON' : 'HOLD TO FLY AGAIN', W / 2, H * 0.52);
        }
      }

      node.querySelector('[data-a="share"]').addEventListener('click', function () {
        window.VENUSSHARE.card({
          app: 'CLOUD RIDER · VENUS-OS', headline: (dist / 100).toFixed(1) + ' KM IN THE DECK',
          file: 'rider-' + seedStr,
          lines: ['DECK OF ' + seedStr + ' — SAME SKY FOR EVERYONE TODAY',
                  'BEST ' + Math.max(best, dist / 100).toFixed(1) + ' KM',
                  '360 KM/H TAILWIND. ONE BUTTON. GOOD LUCK.']
        });
      });
      return stop;
    }
  };
})();
