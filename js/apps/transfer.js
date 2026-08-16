/* =============================================================================
 * transfer.js — TRANSFER · the Hohmann-window game
 *
 * The PHASE dial (venus-phase.js) shows you where Venus is. This app makes
 * you act on it: launch a probe from Earth and hit Venus, using the exact
 * same J2000 mean elements and the exact same circular-coplanar model. If
 * the two files ever disagree about where Venus is, one of them is lying.
 *
 * THE PHYSICS, DERIVED IN FULL (all of it lives in the constants below):
 *
 *   Hohmann transfer between circular orbits r_E and r_V is half of an
 *   ellipse with aphelion at Earth and perihelion at Venus:
 *
 *       a_t = (a_E + a_V) / 2 = (1.00000261 + 0.72333566) / 2 ≈ 0.8617 AU
 *       e_t = (a_E − a_V) / (a_E + a_V)                       ≈ 0.1605
 *
 *   Kepler III gives the mean motion on that ellipse from Earth's own,
 *   with no gravitational constant needed:  n ∝ a^(−3/2), so
 *
 *       n_t = n_E · (a_E / a_t)^(3/2)      n_E = 35999.372…°/cy / 36525 d
 *
 *   The transfer is exactly half an orbit (aphelion → perihelion, 180° of
 *   mean anomaly), so  t_transfer = 180° / n_t ≈ 146.08 days.
 *
 *   During those days Venus sweeps  n_V · t_transfer ≈ 234.0° while the
 *   probe sweeps 180°, so at launch Venus must TRAIL Earth by
 *
 *       φ* = 180° − n_V · t_transfer ≈ −54.0°
 *
 *   That is the launch window. The relative rate n_V − n_E brings the
 *   geometry back every 360°/(n_V − n_E) = 583.92 days — the synodic
 *   period, the same number VENUSPHASE.SYNODIC carries.
 *
 * The probe is propagated honestly: mean anomaly → Kepler's equation
 * (E − e·sinE = M) by Newton iteration → true anomaly → polar position.
 * No spline faking it. Chassis: Tactical-OS; instruments: dragonfruit.
 * ===========================================================================*/

window.VENUSAPPS = window.VENUSAPPS || {};

window.VENUSAPPS.transfer = (function () {
  'use strict';

  var h = window.VENUSKIT.h, loop = window.VENUSKIT.loop;

  /* ---- identical constants to venus-phase.js (J2000 mean elements, Standish) ---- */
  var J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
  var DAY = 86400000;
  var DEG = Math.PI / 180;
  var EARTH = { a: 1.00000261, L0: 100.46457166, dL: 35999.37244981 };
  var VENUS = { a: 0.72333566, L0: 181.97909950, dL: 58517.81538729 };

  /* ---- everything below is DERIVED, never typed in by hand ---- */
  var N_E = EARTH.dL / 36525;                            /* deg/day, Earth      */
  var N_V = VENUS.dL / 36525;                            /* deg/day, Venus      */
  var A_T = (EARTH.a + VENUS.a) / 2;                     /* transfer semi-major */
  var E_T = (EARTH.a - VENUS.a) / (EARTH.a + VENUS.a);   /* transfer eccentricity */
  var N_T = N_E * Math.pow(EARTH.a / A_T, 1.5);          /* deg/day on ellipse  */
  var T_TRANSFER = 180 / N_T;                            /* ≈ 146.08 days       */
  var IDEAL_PHASE = norm180(180 - N_V * T_TRANSFER);     /* ≈ −54.0° (Venus trails) */
  var SYNODIC = window.VENUSPHASE.SYNODIC;               /* 583.92 d — shared truth */

  var HIT_AU = 0.01;            /* insertion corridor: miss by less than this */
  var KM_PER_AU = 1.496e8;

  var GOLD = '#ffc83d', GOLD_HI = '#ffe9a8', GOLD_DEEP = '#b8862a';
  var SULFUR = '#f4e04d', EMBER = '#ff7a2f', CHAMP = '#cdb07c';
  var DIM = '#b09a6e', FAINT = '#7a6640', LINE = '#4a3517';

  function norm360(d) { return ((d % 360) + 360) % 360; }
  function norm180(d) { d = norm360(d); return d > 180 ? d - 360 : d; }

  function planetLon(P, ms) {
    var T = (ms - J2000) / DAY / 36525;
    return norm360(P.L0 + P.dL * T);
  }

  /** Probe state on the transfer ellipse, t days after launch.
   *  Launched at aphelion (M = π), perihelion at theta0 + 180°.
   *  Kepler's equation solved by Newton — 6 iterations is overkill at e=0.16. */
  function probeState(theta0, tDays) {
    var M = Math.PI + N_T * DEG * tDays;
    var E = M;
    for (var i = 0; i < 6; i++) {
      E -= (E - E_T * Math.sin(E) - M) / (1 - E_T * Math.cos(E));
    }
    var r = A_T * (1 - E_T * Math.cos(E));
    var nu = Math.atan2(Math.sqrt(1 - E_T * E_T) * Math.sin(E), Math.cos(E) - E_T);
    var lon = (theta0 + 180) * DEG + nu;   /* longitude of perihelion + true anomaly */
    return { x: r * Math.cos(lon), y: r * Math.sin(lon) };
  }

  function loadBest() {
    try { var v = +localStorage.getItem('venus-transfer-best'); return v > 0 ? v : 0; }
    catch (e) { return 0; }
  }
  function saveBest(v) {
    try { localStorage.setItem('venus-transfer-best', String(v)); } catch (e) {}
  }

  function mount(node) {
    node.appendChild(h(
      '<div class="app" tabindex="0" style="outline:none">' +
        '<div class="app-head">' +
          '<span class="h-title">TRANSFER · EARTH → VENUS</span>' +
          '<span class="h-sub" data-f="status">AWAITING LAUNCH</span>' +
          '<span class="spacer"></span>' +
          '<button class="genbtn" data-a="launch">☄ LAUNCH</button>' +
        '</div>' +
        '<div class="stage"><canvas></canvas>' +
          '<div class="hint">SPACE TO LAUNCH · WAIT FOR THE WINDOW MARKER · ← → WARP</div>' +
        '</div>' +
        '<div class="strip">' +
          '<label for="twarp">WARP</label>' +
          '<input id="twarp" type="range" min="1" max="60" value="8" aria-label="Time warp, days per second">' +
          '<span class="readout" data-f="warp"></span>' +
        '</div>' +
        '<div class="app-foot">' +
          '<span>windows recur every <b>' + SYNODIC + ' d</b> — which is why Venus missions bunch up</span>' +
          '<span>transfer <b>' + T_TRANSFER.toFixed(1) + ' d</b></span>' +
          '<span>best <b data-f="best">—</b></span>' +
        '</div>' +
      '</div>'
    ));

    var root = node.querySelector('.app');
    var cv = node.querySelector('canvas');
    var ctx = cv.getContext('2d');
    var warpR = node.querySelector('#twarp');
    var f = {};
    node.querySelectorAll('[data-f]').forEach(function (n) { f[n.dataset.f] = n; });

    /* ---- sim state: real clock at mount, then warped ---- */
    var simMs = Date.now();
    var warp = +warpR.value;                /* sim days per real second */
    var probes = [];                        /* { theta0, t0, state, closest, trail } */
    var launched = 0;
    var best = loadBest();
    var trailE = [], trailV = [], lastTrailMs = 0;

    if (best) f.best.textContent = 'SCORE ' + best;

    function setWarp() {
      warp = +warpR.value;
      f.warp.textContent = warp + ' D / SEC';
    }
    warpR.addEventListener('input', setWarp);
    setWarp();

    function status(msg, color) {
      f.status.textContent = msg;
      f.status.style.color = color || '';
    }

    function launch() {
      var le = planetLon(EARTH, simMs);
      var phi = norm180(planetLon(VENUS, simMs) - le);
      launched++;
      probes.push({
        theta0: le, t0: simMs, state: 'coast',
        closest: Infinity, trail: []
      });
      if (probes.length > 10) probes.shift();      /* the Sun keeps only so much debris */
      status('PROBE ' + launched + ' AWAY · Δφ ' +
        norm180(phi - IDEAL_PHASE).toFixed(1) + '°', GOLD);
    }

    node.querySelector('[data-a="launch"]').addEventListener('click', launch);
    root.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'l' || e.key === 'L') { e.preventDefault(); launch(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); warpR.value = Math.max(1, warp - 2); setWarp(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); warpR.value = Math.min(60, warp + 2); setWarp(); }
    });

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

    /* AU → screen; y flipped so prograde runs counter-clockwise, as charted */
    function sx(cx, scale, x) { return cx + x * scale; }
    function sy(cy, scale, y) { return cy - y * scale; }

    function dot(cx, cy, r, color) {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fillStyle = color; ctx.fill();
    }
    function poly(points, cx, cy, scale, color, alpha) {
      if (points.length < 2) return;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(sx(cx, scale, points[0][0]), sy(cy, scale, points[0][1]));
      for (var i = 1; i < points.length; i++) {
        ctx.lineTo(sx(cx, scale, points[i][0]), sy(cy, scale, points[i][1]));
      }
      ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke();
      ctx.globalAlpha = 1;
    }

    return loop(function (dt) {
      if (!cv.offsetParent) return;               /* minimised — burn nothing */
      var size = fit();
      if (!size) return;

      simMs += dt / 1000 * warp * DAY;

      var le = planetLon(EARTH, simMs), lv = planetLon(VENUS, simMs);
      var ex = EARTH.a * Math.cos(le * DEG), ey = EARTH.a * Math.sin(le * DEG);
      var vx = VENUS.a * Math.cos(lv * DEG), vy = VENUS.a * Math.sin(lv * DEG);
      var phi = norm180(lv - le);
      var offWindow = Math.abs(norm180(phi - IDEAL_PHASE));
      /* countdown: relative longitude gains at n_V − n_E deg/day */
      var daysToWindow = norm360(IDEAL_PHASE - phi) / (N_V - N_E);

      /* breadcrumb trails, one point every ~3 sim days */
      if (Math.abs(simMs - lastTrailMs) > 3 * DAY) {
        lastTrailMs = simMs;
        trailE.push([ex, ey]); if (trailE.length > 60) trailE.shift();
        trailV.push([vx, vy]); if (trailV.length > 60) trailV.shift();
      }

      /* ---- probe physics ---- */
      probes.forEach(function (pr) {
        var t = (simMs - pr.t0) / DAY;
        var p = probeState(pr.theta0, t);
        pr.x = p.x; pr.y = p.y;
        if (pr.trail.length === 0 ||
            Math.hypot(p.x - pr.trail[pr.trail.length - 1][0],
                       p.y - pr.trail[pr.trail.length - 1][1]) > 0.012) {
          pr.trail.push([p.x, p.y]); if (pr.trail.length > 140) pr.trail.shift();
        }
        if (pr.state !== 'coast') return;
        var miss = Math.hypot(p.x - vx, p.y - vy);
        if (miss < pr.closest) pr.closest = miss;
        if (miss < HIT_AU) {
          pr.state = 'hit';
          /* score by miss distance: dead centre 1000, corridor edge 0 */
          var score = Math.round((HIT_AU - miss) / HIT_AU * 1000);
          pr.score = score;
          if (score > best) { best = score; saveBest(best); f.best.textContent = 'SCORE ' + best; }
          status('ORBIT INSERTION ✓ · MISS ' +
            Math.round(miss * KM_PER_AU).toLocaleString('en-US') + ' KM · SCORE ' + score, SULFUR);
        } else if (t > T_TRANSFER * 1.3) {
          pr.state = 'debris';   /* still on its ellipse, forever; just not ours */
          status('HELIOCENTRIC DEBRIS. TRY THE NEXT WINDOW.', EMBER);
        }
      });

      /* ---- draw ---- */
      var w = size.w, ht = size.h;
      var cx = w / 2, cy = ht / 2;
      var scale = (Math.min(w, ht) / 2 - 20) / 1.06;
      ctx.clearRect(0, 0, w, ht);

      /* sun */
      var g = ctx.createRadialGradient(cx, cy, 1, cx, cy, 26);
      g.addColorStop(0, GOLD_HI); g.addColorStop(0.25, GOLD); g.addColorStop(1, 'rgba(255,200,61,0)');
      ctx.beginPath(); ctx.arc(cx, cy, 26, 0, 7); ctx.fillStyle = g; ctx.fill();
      dot(cx, cy, 4.5, GOLD_HI);

      /* orbit rings */
      ctx.strokeStyle = LINE; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, EARTH.a * scale, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, VENUS.a * scale, 0, 7); ctx.stroke();

      /* the window marker: where Venus must be, right now, for a launch to
         connect. When the sulfur dot slides into this ring — go. */
      var mLon = (le + IDEAL_PHASE) * DEG;
      var mx = sx(cx, scale, VENUS.a * Math.cos(mLon));
      var my = sy(cy, scale, VENUS.a * Math.sin(mLon));
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.arc(mx, my, 8, 0, 7);
      ctx.strokeStyle = offWindow < 3 ? SULFUR : FAINT; ctx.lineWidth = 1; ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = offWindow < 3 ? SULFUR : FAINT;
      ctx.font = '9px ui-monospace, monospace'; ctx.textAlign = 'center';
      ctx.fillText('WINDOW', mx, my - 12);

      /* trails, then planets */
      poly(trailE, cx, cy, scale, CHAMP, 0.28);
      poly(trailV, cx, cy, scale, SULFUR, 0.28);

      var pex = sx(cx, scale, ex), pey = sy(cy, scale, ey);
      var pvx = sx(cx, scale, vx), pvy = sy(cy, scale, vy);
      dot(pex, pey, 5, CHAMP);
      dot(pvx, pvy, 4.5, SULFUR);
      ctx.fillStyle = DIM; ctx.font = '9px ui-monospace, monospace';
      ctx.fillText('EARTH', pex, pey - 9);
      ctx.fillText('VENUS', pvx, pvy - 9);

      /* probes */
      probes.forEach(function (pr) {
        var col = pr.state === 'hit' ? SULFUR : pr.state === 'debris' ? DIM : EMBER;
        poly(pr.trail, cx, cy, scale, col, pr.state === 'debris' ? 0.18 : 0.45);
        if (pr.state === 'hit') {
          /* parked: ride along with Venus, wear a little orbit ring */
          ctx.beginPath(); ctx.arc(pvx, pvy, 9, 0, 7);
          ctx.strokeStyle = SULFUR; ctx.lineWidth = 1; ctx.stroke();
        } else {
          dot(sx(cx, scale, pr.x), sy(cy, scale, pr.y), pr.state === 'debris' ? 2 : 3, col);
        }
      });

      /* ---- HUD: the instrument cluster ---- */
      ctx.textAlign = 'left';
      ctx.font = '10px ui-monospace, monospace';
      var hy = 18;
      function row(label, val, color) {
        ctx.fillStyle = FAINT; ctx.fillText(label, 12, hy);
        ctx.fillStyle = color || GOLD; ctx.fillText(val, 108, hy);
        hy += 15;
      }
      row('SIM DATE', new Date(simMs).toISOString().slice(0, 10), CHAMP);
      row('PHASE ∠', (phi >= 0 ? '+' : '') + phi.toFixed(1) + '°');
      row('IDEAL ∠', IDEAL_PHASE.toFixed(1) + '°', DIM);
      row('NEXT WINDOW', offWindow < 3 ? 'OPEN — LAUNCH' : 'IN ~' + Math.round(daysToWindow) + ' D',
          offWindow < 3 ? SULFUR : GOLD);
      row('IN FLIGHT', String(probes.filter(function (p) { return p.state === 'coast'; }).length), DIM);
    });
  }

  return { icon: '☄', title: 'TRANSFER', w: 720, h: 580, mount: mount };
})();
