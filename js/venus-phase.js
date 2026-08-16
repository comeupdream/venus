/* =============================================================================
 * venus-phase.js — THE COMPLICATION
 *
 * Ported from knox-lux src/components/showcase/moonphase-3d.tsx (Avant
 * Meridian's procedural moonphase wristwatch) and re-aimed at Venus.
 *
 * The port is not cosmetic. The original computed a real lunar phase from the
 * synodic month and drew an honest terminator. Venus is the better subject:
 * its phases are the thing Galileo actually saw, and unlike the Moon its
 * apparent SIZE swings with phase too (a thin crescent Venus is six times
 * wider than a full one, because it is that much closer). Both are computed
 * here, so the dial breathes over the 584-day synodic cycle.
 *
 * Model: circular coplanar orbits from the J2000 mean elements. Eccentricity
 * (Venus 0.0068, Earth 0.0167) is ignored, which costs ~1% on the illuminated
 * fraction and a day or so on conjunction dates. That is the right accuracy
 * for a watch face and the wrong accuracy for an ephemeris — do not navigate
 * by it.
 *
 * Everything is pure: no libraries, no DOM, no three.js. The original's R3F
 * scene is re-expressed as 2D canvas so the whole site stays dependency-free
 * (INFINITEPARALLEL's rule — "pure canvas, no libs").
 * ===========================================================================*/

window.VENUSPHASE = (function () {
  'use strict';

  var J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);   /* JD 2451545.0 */
  var DAY = 86400000;
  var DEG = Math.PI / 180;

  /* mean orbital elements, J2000 (Standish) — longitude in deg, rate in deg/century */
  var EARTH = { a: 1.00000261, L0: 100.46457166, dL: 35999.37244981 };
  var VENUS = { a: 0.72333566, L0: 181.97909950, dL: 58517.81538729 };

  var SYNODIC = 583.92;          /* days, Earth–Venus synodic period */
  var SIDEREAL_DAY = 243.025;    /* days, Venus rotation — retrograde */
  var YEAR = 224.701;            /* days, Venus orbit. Its day is longer than its year. */

  function norm360(d) { return ((d % 360) + 360) % 360; }
  function norm180(d) { d = norm360(d); return d > 180 ? d - 360 : d; }

  /**
   * Geometry of the Sun–Earth–Venus triangle at `date`.
   * @returns {{
   *   illumination:number, phaseAngle:number, elongation:number,
   *   distanceAU:number, apparentArcsec:number, magnitude:number,
   *   evening:boolean, waxing:boolean, name:string, cycle:number
   * }}
   */
  function venusPhase(date) {
    date = date || new Date();
    var T = (date.getTime() - J2000) / DAY / 36525;   /* Julian centuries */

    var Le = norm360(EARTH.L0 + EARTH.dL * T) * DEG;
    var Lv = norm360(VENUS.L0 + VENUS.dL * T) * DEG;

    var ex = EARTH.a * Math.cos(Le), ey = EARTH.a * Math.sin(Le);
    var vx = VENUS.a * Math.cos(Lv), vy = VENUS.a * Math.sin(Lv);

    var re = EARTH.a, rv = VENUS.a;
    var dx = vx - ex, dy = vy - ey;
    var d = Math.hypot(dx, dy) || 1e-9;               /* Venus–Earth, AU */

    /* phase angle at Venus, between the Sun and the Earth */
    var cosA = (rv * rv + d * d - re * re) / (2 * rv * d);
    var alpha = Math.acos(Math.max(-1, Math.min(1, cosA)));
    var illumination = (1 + Math.cos(alpha)) / 2;

    /* elongation at Earth, between the Sun and Venus */
    var cosE = (re * re + d * d - rv * rv) / (2 * re * d);
    var elongation = Math.acos(Math.max(-1, Math.min(1, cosE))) / DEG;

    /* east of the Sun = evening star (sets after it); west = morning star */
    var lonV = Math.atan2(dy, dx) / DEG;
    var lonS = Math.atan2(-ey, -ex) / DEG;
    var evening = norm180(lonV - lonS) > 0;

    /* apparent disc: 16.92" at 1 AU (equatorial radius 6051.8 km) */
    var apparentArcsec = 2 * 8.46 / d;

    /* Hilton (2005) magnitude, valid for alpha < 163 deg */
    var aDeg = alpha / DEG;
    var magnitude = -4.47 + 5 * Math.log10(rv * d) +
      0.0103 * aDeg + 2.2e-4 * aDeg * aDeg + 6.2e-7 * aDeg * aDeg * aDeg;

    /* where we are in the 583.92-day synodic cycle; 0 = inferior conjunction,
       which is exactly when the two heliocentric longitudes coincide */
    var cycle = norm360((Lv - Le) / DEG) / 360;

    return {
      illumination: illumination,
      phaseAngle: aDeg,
      elongation: elongation,
      distanceAU: d,
      apparentArcsec: apparentArcsec,
      magnitude: magnitude,
      evening: evening,
      waxing: !evening,            /* as an observer sees it thicken */
      name: phaseName(illumination, evening),
      cycle: cycle
    };
  }

  /* Venus keeps the lunar vocabulary for the middle of the cycle and its own
     at the ends: it has no "new"/"full", it has conjunctions. */
  function phaseName(k, evening) {
    if (k < 0.02) return 'Inferior Conjunction';
    if (k > 0.98) return 'Superior Conjunction';
    if (k > 0.47 && k < 0.53) return 'Dichotomy';
    var side = evening ? 'Evening' : 'Morning';
    if (k < 0.47) return side + ' Crescent';
    return side + ' Gibbous';
  }

  /* ===========================================================================
   * THE DIAL — moonphase-3d.tsx's fluted case / navy dial / applied markers /
   * 6 o'clock aperture, redrawn in 2D. Sizes are fractions of the radius so it
   * renders identically at any DPR or canvas size.
   * =========================================================================*/

  var GOLD = '#ffc83d', GOLD_HI = '#ffe9a8', GOLD_DEEP = '#b8862a', BRASS = '#8a6f3e';
  var NAVY = '#101b33', NAVY_DEEP = '#070b14', CHAMP = '#cdb07c';
  var VENUS_LIT = '#f4e04d', VENUS_DARK = '#1a1206';

  function drawDial(canvas, phase, date) {
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var css = Math.min(canvas.clientWidth || 360, 460);
    if (css <= 0) return;

    canvas.width = css * dpr;
    canvas.height = css * dpr;
    canvas.style.height = css + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, css, css);

    var cx = css / 2, cy = css / 2, R = css / 2 - 4;

    /* ---- fluted bezel: 72 flutes, as in the original's <FlutedBezel/> ---- */
    var flutes = 72;
    for (var i = 0; i < flutes; i++) {
      var a0 = (i / flutes) * Math.PI * 2, a1 = ((i + 1) / flutes) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, R, a0, a1);
      ctx.arc(cx, cy, R * 0.895, a1, a0, true);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? GOLD_DEEP : GOLD;
      ctx.fill();
    }
    ring(ctx, cx, cy, R, BRASS, 1.5);
    ring(ctx, cx, cy, R * 0.895, GOLD_HI, 1);

    /* ---- dial ---- */
    var dR = R * 0.87;
    var g = ctx.createRadialGradient(cx - dR * 0.3, cy - dR * 0.35, dR * 0.05, cx, cy, dR);
    g.addColorStop(0, '#1a2b4d');
    g.addColorStop(0.62, NAVY);
    g.addColorStop(1, NAVY_DEEP);
    ctx.beginPath(); ctx.arc(cx, cy, dR, 0, 7); ctx.fillStyle = g; ctx.fill();

    /* ---- applied markers: batons at every hour, doubled at 12, none at 6 ---- */
    for (var h = 0; h < 12; h++) {
      if (h === 6) continue;                       /* the aperture lives at 6 */
      var a = (h / 12) * Math.PI * 2 - Math.PI / 2;
      if (h === 0) { baton(ctx, cx, cy, dR, a, -0.026); baton(ctx, cx, cy, dR, a, 0.026); }
      else baton(ctx, cx, cy, dR, a, 0);
    }

    /* ---- the complication aperture at 6 ---- */
    var apY = cy + dR * 0.40, apR = dR * 0.29;
    drawAperture(ctx, cx, apY, apR, phase);

    /* ---- signature ---- */
    ctx.fillStyle = CHAMP;
    ctx.textAlign = 'center';
    ctx.font = '700 ' + (dR * 0.075).toFixed(1) + 'px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('VENUS', cx, cy - dR * 0.34);
    ctx.fillStyle = 'rgba(205,176,124,.62)';
    ctx.font = (dR * 0.048).toFixed(1) + 'px ui-monospace, monospace';
    ctx.fillText('P H A S E   C O M P L I C A T I O N', cx, cy - dR * 0.24);

    /* ---- hands, tracking real local time ---- */
    var t = date || new Date();
    var sec = t.getSeconds() + t.getMilliseconds() / 1000;
    var min = t.getMinutes() + sec / 60;
    var hr = (t.getHours() % 12) + min / 60;
    var TAU = Math.PI * 2;
    hand(ctx, cx, cy, (hr / 12) * TAU - Math.PI / 2, dR * 0.50, dR * 0.030, GOLD);
    hand(ctx, cx, cy, (min / 60) * TAU - Math.PI / 2, dR * 0.72, dR * 0.021, GOLD);
    hand(ctx, cx, cy, (sec / 60) * TAU - Math.PI / 2, dR * 0.78, dR * 0.008, '#ff7a2f');
    ctx.beginPath(); ctx.arc(cx, cy, dR * 0.035, 0, 7); ctx.fillStyle = GOLD_HI; ctx.fill();
  }

  /** The aperture: star field, then Venus with an honest terminator.
   *  The original aimed a 3D shadow cap at the camera; in 2D the same geometry
   *  reduces to a limb semicircle plus a terminator half-ellipse whose signed
   *  x-radius is R(2k-1) — k=1 full, k=.5 straight edge, k=0 dark. */
  function drawAperture(ctx, cx, cy, R, phase) {
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.clip();

    var sky = ctx.createRadialGradient(cx, cy - R * 0.4, 1, cx, cy, R);
    sky.addColorStop(0, '#14224a'); sky.addColorStop(1, '#04070f');
    ctx.fillStyle = sky; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

    /* deterministic star field — same stars every render, no Math.random flicker */
    for (var i = 0; i < 26; i++) {
      var sx = cx + (hash(i * 2.17) * 2 - 1) * R;
      var sy = cy + (hash(i * 5.31 + 9) * 2 - 1) * R;
      ctx.globalAlpha = 0.25 + hash(i * 1.7) * 0.6;
      ctx.fillStyle = '#e8e2d2';
      ctx.fillRect(sx, sy, 1.2, 1.2);
    }
    ctx.globalAlpha = 1;

    /* Venus's apparent size swings with phase — crescents are near, so big.
       Mapped into the aperture rather than to scale, or full phase would vanish. */
    var k = Math.max(0, Math.min(1, phase.illumination));
    var vR = R * (0.52 - 0.26 * k);

    /* unlit disc */
    ctx.beginPath(); ctx.arc(cx, cy, vR, 0, 7);
    ctx.fillStyle = VENUS_DARK; ctx.fill();
    ctx.strokeStyle = 'rgba(244,224,77,.22)'; ctx.lineWidth = 0.75; ctx.stroke();

    /* lit crescent/gibbous */
    var litLeft = phase.evening;                 /* sunward side, by convention */
    var termR = vR * (2 * k - 1);
    ctx.beginPath();
    if (litLeft) {
      ctx.arc(cx, cy, vR, Math.PI / 2, -Math.PI / 2, false);
      ctx.ellipse(cx, cy, Math.abs(termR), vR, 0, -Math.PI / 2, Math.PI / 2, termR > 0);
    } else {
      ctx.arc(cx, cy, vR, -Math.PI / 2, Math.PI / 2, false);
      ctx.ellipse(cx, cy, Math.abs(termR), vR, 0, Math.PI / 2, -Math.PI / 2, termR > 0);
    }
    ctx.closePath();
    var lit = ctx.createRadialGradient(cx - vR * 0.3, cy - vR * 0.3, vR * 0.1, cx, cy, vR);
    lit.addColorStop(0, '#fff6c9'); lit.addColorStop(0.6, VENUS_LIT); lit.addColorStop(1, '#c9a227');
    ctx.fillStyle = lit; ctx.fill();

    ctx.restore();

    /* aperture chapter ring */
    ring(ctx, cx, cy, R, GOLD_DEEP, R * 0.075);
    ring(ctx, cx, cy, R * 0.96, GOLD_HI, 0.8);
  }

  /* ---- primitives ---- */
  function ring(ctx, cx, cy, r, color, w) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7);
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
  }
  function baton(ctx, cx, cy, dR, a, off) {
    var r0 = dR * 0.80, r1 = dR * 0.92, w = dR * 0.030;
    ctx.save();
    ctx.translate(cx + Math.cos(a + off) * (r0 + r1) / 2, cy + Math.sin(a + off) * (r0 + r1) / 2);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = GOLD; ctx.fillRect(-w / 2, -(r1 - r0) / 2, w, r1 - r0);
    ctx.fillStyle = GOLD_HI; ctx.fillRect(-w / 2, -(r1 - r0) / 2, w * 0.34, r1 - r0);
    ctx.restore();
  }
  function hand(ctx, cx, cy, a, len, w, color) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
    ctx.fillStyle = color;
    ctx.fillRect(-len * 0.16, -w / 2, len + len * 0.16, w);
    ctx.restore();
  }
  function hash(n) { var s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }

  return {
    venusPhase: venusPhase,
    drawDial: drawDial,
    SYNODIC: SYNODIC,
    SIDEREAL_DAY: SIDEREAL_DAY,
    YEAR: YEAR
  };
})();
