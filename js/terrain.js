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
    var stars = Starfield(0x5EED, 110);
    var iw = 0, ih = 0, img = null, buf = null, data = null;
    /* Start the camera northwest of the Sapas dome (map y 0.62) looking at it,
       the way PIA00107 was framed, then drift slowly in. */
    var camZ = 0.62 * MAP + 100;
    var yaw = 0, targetYaw = 0, pitch = 0, targetPitch = 0;

    /* All of these are in MAP CELLS, including the vertical ones — the
       heightmap is normalised 0..1, so it is multiplied by VEXAG into the same
       space as the horizontal sampling or the planet comes out flat. */
    var HORIZON = 0.75;      /* fraction of the frame that is sky — matches
                                HORIZON_FRAC so both modes share the same
                                bottom-quarter land composition */
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

      /* stars into the sky, occluded by the terrain y-buffer */
      stars.update(dt);
      stars.plot(data, iw, ih, buf, !reduce);

      ctx.putImageData(img, 0, 0);
    }

    function look(nx, ny) {                  /* -1..1 pointer parallax */
      targetYaw = nx * 0.22;
      targetPitch = ny * 0.05;
    }

    return { resize: resize, frame: frame, look: look };
  }

  /* ---- starfield ----------------------------------------------------------
     Lives in the black 75% above the horizon, in both wallpaper modes. Same
     seeded-noise discipline as everything else: deterministic positions, slow
     drift (near stars drift faster), sinusoidal twinkle, and a haze fade
     toward the horizon — Venus's atmosphere would eat the low stars first. */
  function Starfield(seed, count) {
    var rnd = mulberry32(seed);
    var stars = [];
    for (var i = 0; i < count; i++) {
      stars.push({
        x: rnd(), y: rnd(),               /* fractions of the sky region */
        z: 0.3 + rnd() * 0.7,             /* depth → brightness and speed */
        tw: rnd() * 6.283,                /* twinkle phase */
        ts: 0.3 + rnd() * 1.0             /* twinkle rate, Hz-ish */
      });
    }
    var t = 0;
    return {
      update: function (dt) {
        t += dt * 0.001;
        for (var i = 0; i < stars.length; i++) {
          var s = stars[i];
          s.x += dt * 0.0000042 * s.z;    /* a full crossing takes ~an hour */
          if (s.x >= 1) s.x -= 1;
        }
      },
      /** hi-res pass (photo mode): paint into a 2D context, sky = 0..skyPx */
      paint: function (ctx, W, skyPx, twinkle) {
        for (var i = 0; i < stars.length; i++) {
          var s = stars[i];
          var a = s.z * (twinkle ? (0.55 + 0.45 * Math.sin(t * s.ts * 6.283 + s.tw)) : 0.8);
          a *= 0.35 + 0.65 * (1 - s.y);   /* haze: dimmer near the horizon */
          if (a <= 0.05) continue;
          var r = s.z > 0.85 ? 2 : 1;
          ctx.globalAlpha = Math.min(1, a);
          ctx.fillStyle = s.z > 0.92 ? '#fff6d8' : '#e8e2d2';
          ctx.fillRect(s.x * W, s.y * skyPx, r, r);
        }
        ctx.globalAlpha = 1;
      },
      /** low-res pass (procedural mode): blend into the ImageData, occluded by
       *  the terrain y-buffer so ridges block stars like ridges should */
      plot: function (data, iw, ih, buf, twinkle) {
        for (var i = 0; i < stars.length; i++) {
          var s = stars[i];
          var px = (s.x * iw) | 0;
          var py = (s.y * ih * 0.72) | 0;
          if (px < 0 || px >= iw || py >= buf[px]) continue;
          var a = s.z * (twinkle ? (0.55 + 0.45 * Math.sin(t * s.ts * 6.283 + s.tw)) : 0.8);
          a *= 0.35 + 0.65 * (1 - s.y);
          if (a <= 0.05) continue;
          var o = (py * iw + px) * 4;
          data[o]     += (232 - data[o]) * a;
          data[o + 1] += (226 - data[o + 1]) * a;
          data[o + 2] += (210 - data[o + 2]) * a;
        }
      }
    };
  }

  /* ---- public: mount onto a canvas, or defer to the real photograph ------- */

  /* Composition contract, shared by both modes: the land occupies the bottom
     quarter of the viewport, everything above the horizon is black sky. */
  var HORIZON_FRAC = 0.75;

  function mount(canvas, opts) {
    opts = opts || {};
    var seed = opts.seed || 20260816;
    var onMode = opts.onMode || function () {};

    /* If a plate is present it wins — it is the real surface, after all.
       Try the documented name in each format the user might drop. */
    var candidates = opts.photo ? [opts.photo] :
      ['assets/hero-terrain.jpg', 'assets/hero-terrain.webp', 'assets/hero-terrain.png'];
    (function probeNext(i) {
      if (i >= candidates.length) { useProcedural(canvas, seed); onMode('procedural'); return; }
      var probe = new Image();
      probe.onload = function () { usePhoto(canvas, probe); onMode('photo'); };
      probe.onerror = function () { probeNext(i + 1); };
      probe.src = candidates[i];
    })(0);
  }

  /** Find where the terrain starts in the plate: scan a thumbnail top-down.
   *  Two lines come back — `first`, the row where ANY terrain appears (the
   *  peak tips), and `main`, the row where the ground truly begins (>30% of
   *  the row lit). The image is drawn from `first` so no summit gets cropped;
   *  `main` is what gets pinned to the 75% line. Detecting beats hardcoding —
   *  whichever Magellan variant gets dropped in, the horizon lands exactly. */
  function findHorizon(image) {
    var sw = 64, shh = Math.max(16, Math.round(sw * image.height / image.width));
    var c = document.createElement('canvas');
    c.width = sw; c.height = shh;
    var x = c.getContext('2d');
    x.drawImage(image, 0, 0, sw, shh);
    var first = -1, main = -1;
    try {
      var d = x.getImageData(0, 0, sw, shh).data;
      for (var y = 0; y < shh && main < 0; y++) {
        var lit = 0;
        for (var i = 0; i < sw; i++) {
          var o = (y * sw + i) * 4;
          if (d[o] + d[o + 1] + d[o + 2] > 72) lit++;
        }
        if (lit > 2 && first < 0) first = y;
        if (lit > sw * 0.3) main = y;
      }
    } catch (e) { /* tainted canvas (odd file:// setups) — fall through */ }
    if (main < 0) { main = Math.round(shh * 0.12); }   /* PIA00107's fraction */
    if (first < 0 || first > main) first = main;
    return { first: first / shh, main: main / shh };
  }

  function usePhoto(canvas, image) {
    var ctx = canvas.getContext('2d', { alpha: false });
    var hz = findHorizon(image);
    var landFrac = Math.max(0.05, 1 - hz.main);
    var stars = Starfield(0x5EED, 150);
    var W = 0, H = 0;

    /* The plate never changes between frames — only the stars do. Rescaling
       the full-resolution webp onto a 2x-DPR fullscreen canvas 30 times a
       second was the page's single biggest steady cost (the audit clocked the
       page dropping to half-rate on it). So the scaled composition is baked
       ONCE per resize into an offscreen canvas, and the frame loop does a
       1:1 blit — cheap — under a sky repaint. */
    var land = null, landTop = 0;

    function resize() {
      var w = canvas.clientWidth || window.innerWidth;
      var h = canvas.clientHeight || window.innerHeight;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = W = Math.round(w * dpr);
      canvas.height = H = Math.round(h * dpr);

      /* Cover the width; if the plate is so wide its land would come up short
         of the bottom quarter, scale up and crop the sides instead. The
         plate's main horizon is pinned to the 75% line and the foreground
         below the viewport is cropped away. Source-crop starts at the first
         terrain row so no summit is lost; the black gaps in that peak band
         occlude stars exactly like mountains should. */
      var s = Math.max(
        W / image.width,
        ((1 - HORIZON_FRAC) * H) / (landFrac * image.height)
      );
      var sy = hz.first * image.height;
      var dw = image.width * s;
      var dx = (W - dw) / 2;
      landTop = Math.round(H * HORIZON_FRAC - (hz.main - hz.first) * image.height * s);

      land = document.createElement('canvas');
      land.width = W;
      land.height = Math.max(1, H - landTop);
      land.getContext('2d').drawImage(
        image, 0, sy, image.width, image.height - sy,
        dx, 0, dw, (image.height - sy) * s);
    }

    function draw(twinkle) {
      ctx.fillStyle = '#050301';
      ctx.fillRect(0, 0, W, landTop);
      stars.paint(ctx, W, H * HORIZON_FRAC, twinkle);
      ctx.drawImage(land, 0, landTop);
    }

    resize();
    if (reduce) {
      draw(false);
      addEventListener('resize', function () { resize(); draw(false); });
      return;
    }
    addEventListener('resize', resize);
    var last = performance.now(), acc = 0;
    (function loop(now) {
      requestAnimationFrame(loop);
      var dt = Math.min(64, now - last); last = now; acc += dt;
      if (acc < 33) return;
      /* skip work when hidden — tab in background or SPACE view on top */
      if (document.hidden || !canvas.offsetParent) { acc = 0; return; }
      stars.update(acc); acc = 0;
      draw(true);
    })(last);
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
      /* skip work when hidden — tab in background or SPACE view on top */
      if (document.hidden || !canvas.offsetParent) { acc = 0; return; }
      r.frame(acc); acc = 0;
    })(last);
  }

  return { mount: mount, buildMap: buildMap };
})();
