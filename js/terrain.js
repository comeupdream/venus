/* =============================================================================
 * terrain.js — THE HERO / WALLPAPER
 *
 * A procedural stand-in for Magellan PIA00107 (the 3-D perspective view of
 * Sapas Mons, Atla Regio). Ridged fractal noise -> heightmap -> shaded in the
 * Venera-derived gold the Magellan renders use -> drawn with a back-to-front
 * scanline projector, the same technique the 1992 flyover videos used.
 *
 * Why procedural rather than the plate itself: the site has to keep working
 * with zero binary assets, and "the hero regenerates" is the brief. If you
 * drop the real photograph at assets/hero-terrain.jpg it takes over
 * automatically — see boot() below. NASA/JPL imagery is public domain; credit
 * it in the footer either way.
 *
 * Sits under the OS as the desktop wallpaper, exactly as HOFFMAN-TACTICAL's
 * desktop carries the orca poster behind its icons.
 * ===========================================================================*/

window.TERRAIN = (function () {
  'use strict';

  var MAP = 512;                 /* heightmap is MAP x MAP, wraps in both axes */

  /* Vertical exaggeration, in map cells from datum to highest peak. Shared by
     the shading bake and the projector so the lighting matches the geometry —
     JPL exaggerated the Magellan flyovers 10x for the same reason. */
  var VEXAG = 15;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- seeded value noise ------------------------------------------------ */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function smooth(t) { return t * t * (3 - 2 * t); }

  /** One octave of wrapping value noise on a `size` grid, sampled bilinearly. */
  function lattice(size, rnd) {
    var g = new Float32Array(size * size);
    for (var i = 0; i < g.length; i++) g[i] = rnd();
    return function (x, y) {
      x *= size; y *= size;
      var x0 = Math.floor(x), y0 = Math.floor(y);
      var fx = smooth(x - x0), fy = smooth(y - y0);
      var xa = ((x0 % size) + size) % size, xb = (xa + 1) % size;
      var ya = ((y0 % size) + size) % size, yb = (ya + 1) % size;
      var n00 = g[ya * size + xa], n10 = g[ya * size + xb];
      var n01 = g[yb * size + xa], n11 = g[yb * size + xb];
      return (n00 * (1 - fx) + n10 * fx) * (1 - fy) + (n01 * (1 - fx) + n11 * fx) * fy;
    };
  }

  /* ---- heightmap: ridged fBm, then a few shield volcanoes stamped on top --- */
  var height = null, shade = null;

  function buildMap(seed) {
    var rnd = mulberry32(seed);
    var octaves = [lattice(4, rnd), lattice(8, rnd), lattice(16, rnd),
                   lattice(32, rnd), lattice(64, rnd), lattice(128, rnd)];
    height = new Float32Array(MAP * MAP);

    var x, y, o, amp, freq, n, r, h, i, max = 0, min = 1e9;
    for (y = 0; y < MAP; y++) {
      for (x = 0; x < MAP; x++) {
        h = 0; amp = 1; freq = 1;
        for (o = 0; o < octaves.length; o++) {
          n = octaves[o](x / MAP * freq, y / MAP * freq);
          r = 1 - Math.abs(2 * n - 1);      /* ridged: sharp crests, flat plains */
          /* 0.58 decay rather than 0.5 keeps real roughness in the small
             octaves — at 0.48 the fine detail vanishes under the domes below
             and the whole surface renders as one flat sheet of gold */
          h += r * r * amp;
          amp *= 0.58; freq *= 2;
        }
        height[y * MAP + x] = h;
        if (h > max) max = h;
        if (h < min) min = h;
      }
    }
    /* normalise the noise BEFORE stamping the volcanoes, so the domes cannot
       swamp the detail and get divided back out of existence */
    var span = (max - min) || 1;
    for (i = 0; i < height.length; i++) height[i] = (height[i] - min) / span * 0.42;

    /* Atla Regio is defined by its shield volcanoes — Sapas in front, Maat on
       the horizon. Broad, low, gently domed: exactly what a radial falloff
       raised to a high power gives you. */
    var domes = [
      { x: 0.50, y: 0.62, r: 0.30, h: 0.62 },   /* Sapas Mons, foreground */
      { x: 0.63, y: 0.16, r: 0.15, h: 0.85 },   /* Maat Mons, on the horizon */
      { x: 0.18, y: 0.22, r: 0.13, h: 0.44 },
      { x: 0.86, y: 0.30, r: 0.11, h: 0.40 }
    ];
    for (var d = 0; d < domes.length; d++) {
      var D = domes[d];
      for (y = 0; y < MAP; y++) {
        for (x = 0; x < MAP; x++) {
          var dx = wrapDist(x / MAP, D.x), dy = wrapDist(y / MAP, D.y);
          var t = Math.hypot(dx, dy) / D.r;
          if (t < 1) {
            /* smoothstep flank, then a gentle summit — shield volcanoes are
               broad and low, not cones */
            var f = Math.pow(1 - t, 2.4);
            height[y * MAP + x] += D.h * 0.58 * f;
          }
        }
      }
    }

    /* renormalise, then bake Lambert shading once so the frame loop is pure
       lookups. The gradient has to be taken on the EXAGGERATED height (h *
       VEXAG per cell) or every slope comes out ~100x too shallow and the
       planet renders as a flat wall of gold. */
    max = 0;
    for (i = 0; i < height.length; i++) if (height[i] > max) max = height[i];
    for (i = 0; i < height.length; i++) height[i] /= max;

    /* light from the upper left, as in the JPL renders */
    var lx = -0.58, ly = -0.55, lz = 0.60;
    var ln = Math.hypot(lx, ly, lz); lx /= ln; ly /= ln; lz /= ln;

    shade = new Float32Array(MAP * MAP);
    for (y = 0; y < MAP; y++) {
      for (x = 0; x < MAP; x++) {
        var hl = height[y * MAP + ((x - 1 + MAP) % MAP)];
        var hr = height[y * MAP + ((x + 1) % MAP)];
        var hu = height[((y - 1 + MAP) % MAP) * MAP + x];
        var hd = height[((y + 1) % MAP) * MAP + x];
        var gx = (hr - hl) * 0.5 * VEXAG;
        var gy = (hd - hu) * 0.5 * VEXAG;
        /* surface normal of z = h(x,y) is (-dh/dx, -dh/dy, 1), normalised */
        var nl = Math.hypot(gx, gy, 1);
        var lam = (-gx * lx - gy * ly + lz) / nl;
        shade[y * MAP + x] = Math.max(0.20, Math.min(1.5, 0.34 + 1.05 * Math.max(0, lam)));
      }
    }
  }
  function wrapDist(a, b) { var d = Math.abs(a - b); return d > 0.5 ? 1 - d : d; }

  /* ---- palette: sampled off the Venera-tinted Magellan plates -------------- */
  var RAMP = [
    [0.00, 0x3d, 0x22, 0x06],
    [0.18, 0x7a, 0x47, 0x0c],
    [0.38, 0xb0, 0x6d, 0x14],
    [0.58, 0xd6, 0x96, 0x1e],
    [0.76, 0xef, 0xba, 0x3a],
    [0.90, 0xf7, 0xd6, 0x70],
    [1.00, 0xff, 0xef, 0xbe]
  ];
  function ramp(t) {
    for (var i = 1; i < RAMP.length; i++) {
      if (t <= RAMP[i][0]) {
        var a = RAMP[i - 1], b = RAMP[i];
        var f = (t - a[0]) / (b[0] - a[0] || 1);
        return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f];
      }
    }
    var l = RAMP[RAMP.length - 1];
    return [l[1], l[2], l[3]];
  }

  /* ---- the scanline projector -------------------------------------------- */
  function Renderer(canvas) {
    var ctx = canvas.getContext('2d', { alpha: false });
    var iw = 0, ih = 0, img = null, buf = null, data = null;
    /* Start the camera northwest of the Sapas dome (map y 0.62) looking at it,
       the way PIA00107 was framed, then drift slowly in. */
    var camZ = 0.62 * MAP + 100;
    var yaw = 0, targetYaw = 0, pitch = 0, targetPitch = 0;

    /* All of these are in MAP CELLS, including the vertical ones — the
       heightmap is normalised 0..1, so it is multiplied by VEXAG into the same
       space as the horizontal sampling or the planet comes out flat. */
    var HORIZON = 0.34;      /* fraction of the frame that is sky */
    var RELIEF = VEXAG;      /* map cells from datum to highest peak */
    var CAM_H = 12.5;        /* camera altitude above datum */
    var DEPTH = 190;         /* furthest z drawn, in map cells */
    var SCALE = 0.95;        /* half-width of the frustum per unit depth */
    var LENS = 1.15;         /* vertical projection gain */

    function resize() {
      var w = canvas.clientWidth || window.innerWidth;
      var h = canvas.clientHeight || window.innerHeight;
      /* render small, upscale — the Magellan plates are soft anyway */
      iw = Math.max(160, Math.min(440, Math.round(w / 2.8)));
      ih = Math.max(100, Math.round(iw * h / w));
      canvas.width = iw; canvas.height = ih;
      img = ctx.createImageData(iw, ih);
      data = img.data;
      buf = new Int32Array(iw);
    }

    function frame(dt) {
      if (!height) return;
      yaw += (targetYaw - yaw) * 0.05;
      pitch += (targetPitch - pitch) * 0.05;
      if (!reduce) camZ += dt * 0.0035;     /* slow push toward the volcano */

      /* sky: the Magellan plates render it as pure black */
      var i, p = 0;
      for (i = 0; i < iw * ih; i++) { data[p++] = 4; data[p++] = 3; data[p++] = 1; data[p++] = 255; }

      var horizonY = Math.round(ih * (HORIZON + pitch));
      for (i = 0; i < iw; i++) buf[i] = ih;

      var sy = Math.sin(yaw), cy = Math.cos(yaw);

      /* March NEAR to FAR against the y-buffer (the Comanche/voxel-space
         order). Each slice fills only the band it newly exposes above what is
         already painted, so nearer ground correctly occludes what is behind
         it and every slice contributes its own sample. Marching far-to-near
         with this same test would let only the peaks through and flood the
         whole foreground from one far sample. */
      var z = 7, dz = 0.32;

      while (z < DEPTH) {
        /* the two ends of this depth slice, rotated by yaw */
        var halfW = z * SCALE;
        var plx = (-halfW * cy) - (z * sy), ply = (halfW * sy) - (z * cy);
        var prx = (halfW * cy) - (z * sy), pry = (-halfW * sy) - (z * cy);
        var stepX = (prx - plx) / iw, stepY = (pry - ply) / iw;

        var yScale = ih * LENS / z;
        var zFog = Math.min(1, z / (DEPTH * 0.82));
        var haze = zFog * zFog;

        var mx = plx, my = ply;
        for (i = 0; i < iw; i++) {
          /* Bilinear, not nearest. Near the camera a single map cell can span
             a hundred screen columns; sampling it as a step function turns the
             foreground into a wall of cubes. */
          var fx = mx, fy = my + camZ;
          var x0 = Math.floor(fx), y0 = Math.floor(fy);
          var tx = fx - x0, ty = fy - y0;
          var ax = ((x0 % MAP) + MAP) % MAP, bx = (ax + 1) % MAP;
          var ay = ((y0 % MAP) + MAP) % MAP, by = (ay + 1) % MAP;
          var r0 = ay * MAP, r1 = by * MAP;
          var hgt = (height[r0 + ax] * (1 - tx) + height[r0 + bx] * tx) * (1 - ty) +
                    (height[r1 + ax] * (1 - tx) + height[r1 + bx] * tx) * ty;

          var screenY = Math.round(horizonY + (CAM_H - hgt * RELIEF) * yScale);
          if (screenY < buf[i]) {
            /* colour reads off elevation, but lit slopes are pushed up the
               ramp too — that is what gives the JPL plates their bright
               crests against dark lee sides */
            var s = (shade[r0 + ax] * (1 - tx) + shade[r0 + bx] * tx) * (1 - ty) +
                    (shade[r1 + ax] * (1 - tx) + shade[r1 + bx] * tx) * ty;
            var c = ramp(Math.min(1, hgt * 0.72 + (s - 0.34) * 0.30));
            /* haze toward the horizon, warm not grey — thick CO2 does that */
            var r = c[0] * s * (1 - haze) + 0x6b * haze;
            var g = c[1] * s * (1 - haze) + 0x3f * haze;
            var b = c[2] * s * (1 - haze) + 0x0a * haze;

            var y0 = Math.max(screenY, 0), y1 = Math.min(buf[i], ih);
            for (var y = y0; y < y1; y++) {
              var o = (y * iw + i) * 4;
              data[o] = r; data[o + 1] = g; data[o + 2] = b; data[o + 3] = 255;
            }
            buf[i] = screenY;
          }
          mx += stepX; my += stepY;
        }
        z += dz;
        dz *= 1.014;                         /* coarser far away — cheap LOD */
      }

      ctx.putImageData(img, 0, 0);
    }

    function look(nx, ny) {                  /* -1..1 pointer parallax */
      targetYaw = nx * 0.22;
      targetPitch = ny * 0.05;
    }

    return { resize: resize, frame: frame, look: look };
  }

  /* ---- public: mount onto a canvas, or defer to the real photograph ------- */
  function mount(canvas, opts) {
    opts = opts || {};
    var seed = opts.seed || 20260816;
    var photo = opts.photo || 'assets/hero-terrain.jpg';
    var onMode = opts.onMode || function () {};

    /* If the plate is present it wins — it is the real surface, after all. */
    var probe = new Image();
    probe.onload = function () { usePhoto(canvas, probe); onMode('photo'); };
    probe.onerror = function () { useProcedural(canvas, seed); onMode('procedural'); };
    probe.src = photo;
  }

  function usePhoto(canvas, image) {
    var ctx = canvas.getContext('2d', { alpha: false });
    function paint() {
      var w = canvas.clientWidth || window.innerWidth;
      var h = canvas.clientHeight || window.innerHeight;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      var s = Math.max(canvas.width / image.width, canvas.height / image.height);
      var dw = image.width * s, dh = image.height * s;
      ctx.fillStyle = '#0a0702'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, (canvas.width - dw) / 2, (canvas.height - dh) * 0.62, dw, dh);
    }
    paint();
    addEventListener('resize', paint);
  }

  function useProcedural(canvas, seed) {
    buildMap(seed);
    var r = Renderer(canvas);
    r.resize();
    addEventListener('resize', r.resize);
    addEventListener('pointermove', function (e) {
      r.look((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
    }, { passive: true });

    if (reduce) { r.frame(0); return; }

    /* 30fps is plenty for a wallpaper and leaves the main thread to the OS */
    var last = performance.now(), acc = 0;
    (function loop(now) {
      requestAnimationFrame(loop);
      var dt = Math.min(64, now - last); last = now; acc += dt;
      if (acc < 33) return;
      acc = 0;
      if (!document.hidden) r.frame(dt);
    })(last);
  }

  return { mount: mount, buildMap: buildMap };
})();
