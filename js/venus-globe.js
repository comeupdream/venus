/* =============================================================================
 * venus-globe.js — THE FIELD-STRIP
 *
 * Ported from INFINITEPARALLEL js/rig.js and js/rifle.js (which in turn came
 * from PAMAX-TACTICAL's cadlab). Same engine, same controls, same contract:
 * pure canvas, no libraries. Projection, explode, hover-pick and the callout
 * leader lines are the originals; only the geometry changed — the rifle's
 * extruded profiles and cylinders become concentric wireframe shells, and the
 * field-strip that pulled a rifle apart now pulls a planet apart.
 *
 * Drag to rotate. The STRIP slider separates the shells. Hover a shell for its
 * callout. Click to pin it.
 * ===========================================================================*/

window.VENUSGLOBE = (function () {
  'use strict';

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Radii are true fractions of Venus's 6,051.8 km radius, so the shell
     spacing you see is the real internal structure, not a nice-looking guess. */
  var SHELLS = [
    { key: 'cloud',  r: 1.115, color: '#f4e04d', label: 'CLOUD DECK',
      spec: 'H2SO4 · 48–70 km · 360 km/h' },
    { key: 'atmos',  r: 1.035, color: '#ffc83d', label: 'ATMOSPHERE',
      spec: '96.5% CO2 · 92 bar at datum' },
    { key: 'crust',  r: 1.000, color: '#ff7a2f', label: 'CRUST',
      spec: 'basalt · ~40 km · 462 °C' },
    { key: 'mantle', r: 0.845, color: '#b8862a', label: 'MANTLE',
      spec: 'silicate · ~2,800 km' },
    { key: 'core',   r: 0.528, color: '#ffe9a8', label: 'CORE',
      spec: 'Fe–Ni · ~3,200 km ⌀ · no dynamo' }
  ];

  function mount(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, dpr = 1;
    var dragX = -0.5, dragY = -0.26, dragging = false, lx = 0, ly = 0, moved = 0;
    var spin = 0, strip = 0, mx = -1, my = -1, hot = -1, pinned = -1;
    var parts = [];

    /* ---- geometry: a UV-sphere reduced to its wireframe ---- */
    function sphere(r, rings, meridians) {
      var v = [], e = [], i, j;
      for (i = 1; i < rings; i++) {
        var phi = Math.PI * i / rings, y = Math.cos(phi) * r, rr = Math.sin(phi) * r;
        var base = v.length;
        for (j = 0; j < meridians; j++) {
          var th = 2 * Math.PI * j / meridians;
          v.push([Math.cos(th) * rr, y, Math.sin(th) * rr]);
        }
        for (j = 0; j < meridians; j++) e.push([base + j, base + (j + 1) % meridians]);
      }
      /* meridians stitched through the latitude rings, pole to pole */
      var top = v.length; v.push([0, r, 0]);
      var bot = v.length; v.push([0, -r, 0]);
      for (j = 0; j < meridians; j++) {
        e.push([top, j]);
        for (i = 0; i < rings - 2; i++) e.push([i * meridians + j, (i + 1) * meridians + j]);
        e.push([(rings - 2) * meridians + j, bot]);
      }
      return { v: v, e: e };
    }

    /* Exploded positions along +X, spaced so adjacent shells CLEAR each other
       (centre distance = sum of the two radii + gap) — an exploded drawing
       where the parts still overlap is just a blurrier assembled drawing.
       The whole row is then centred, so the strip stays in frame at every
       slider position instead of marching off to the right. */
    var EX_GAP = 0.34;
    var EX_POS = (function () {
      var pos = new Array(SHELLS.length);
      pos[SHELLS.length - 1] = 0;                       /* core stays home */
      for (var i = SHELLS.length - 2; i >= 0; i--) {
        pos[i] = pos[i + 1] + SHELLS[i + 1].r + SHELLS[i].r + EX_GAP;
      }
      var lo = -SHELLS[SHELLS.length - 1].r;
      var hi = pos[0] + SHELLS[0].r;
      var mid = (lo + hi) / 2;
      return { x: pos.map(function (p) { return p - mid; }), span: hi - lo };
    })();

    function build() {
      parts = SHELLS.map(function (s, i) {
        /* fewer wires on the inner shells so the core does not turn to mush */
        var detail = 1 - i * 0.11;
        var g = sphere(s.r, Math.max(6, Math.round(14 * detail)), Math.max(8, Math.round(20 * detail)));
        return {
          v: g.v, e: g.e, color: s.color, label: s.label, spec: s.spec, key: s.key,
          ex: [EX_POS.x[i], 0, 0],
          c: [0, 0, 0]
        };
      });
    }

    function resize() {
      var r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = Math.max(1, Math.round(W * dpr));
      canvas.height = Math.max(1, Math.round(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    var rotY = function (p, c, s) { return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; };
    var rotX = function (p, c, s) { return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; };

    function draw() {
      if (!W) resize();
      ctx.clearRect(0, 0, W, H);

      var ay = dragX + spin, ax = dragY;
      var cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);

      /* `fov` is the on-screen size of one unit radius at the datum plane;
         multiplying it by `dist` makes the perspective divide land at that
         size instead of shrinking everything by 1/dist. Assembled, one shell
         fills the frame; fully stripped, the whole exploded row has to fit,
         so the two framings are computed separately and blended by the
         slider. */
      var dist = 5.2 + strip * 2.2;
      var fovAssembled = Math.min(W, H) * 0.40;
      var fovStripped = Math.min(W / (EX_POS.span + 1.6), H * 0.30);
      var fov = fovAssembled * (1 - strip) + fovStripped * strip;
      var zoom = fov * dist;
      var ox = W / 2;
      var oy = H / 2;

      /* The explode offset is applied AFTER rotation, in view space: the row
         of shells stays level on screen at any drag angle (each shell spins
         in place) instead of the whole lineup tilting and clipping the frame.
         rig.js exploded in model space because its monogram shards fly
         radially; a lineup wants a screen-space bench. */
      function project(p, off) {
        var q = rotX(rotY(p, cy, sy), cx, sx);
        var z = q[2] + dist;
        var k = zoom / Math.max(0.35, z);
        return [ox + (q[0] + off) * k, oy - q[1] * k, z];
      }

      /* outermost first, so the inner shells always read on top */
      var order = parts.map(function (_, i) { return { i: i }; });

      var nearest = -1, nearestD = 26;

      order.forEach(function (o) {
        var p = parts[o.i];
        var off = p.ex[0] * strip;
        var pts = p.v.map(function (vtx) { return project(vtx, off); });

        var active = (o.i === hot || o.i === pinned);
        ctx.lineWidth = active ? 1.5 : 1;

        for (var k = 0; k < p.e.length; k++) {
          var a = pts[p.e[k][0]], b = pts[p.e[k][1]];
          /* depth cue: wires on the far side of the shell dim out */
          var depth = (a[2] + b[2]) / 2;
          var t = Math.max(0, Math.min(1, (dist + 1.2 - depth) / 2.4));
          var alpha = (0.1 + t * 0.72) * (active ? 1 : 0.62);
          ctx.strokeStyle = hexA(p.color, alpha);
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
          ctx.stroke();
        }

        /* pick: nearest shell centre to the pointer */
        var c = project([0, 0, 0], off);
        p.screen = c;
        if (mx >= 0) {
          var d = Math.hypot(mx - c[0], my - c[1]);
          if (d < nearestD) { nearestD = d; nearest = o.i; }
        }
      });

      if (!dragging) hot = nearest;

      var show = pinned >= 0 ? pinned : hot;
      if (show >= 0 && parts[show].screen) callout(parts[show]);

      /* datum crosshair, straight out of the cadlab */
      ctx.strokeStyle = 'rgba(176,154,110,.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 9, H / 2); ctx.lineTo(W / 2 + 9, H / 2);
      ctx.moveTo(W / 2, H / 2 - 9); ctx.lineTo(W / 2, H / 2 + 9);
      ctx.stroke();
    }

    function callout(p) {
      var x = p.screen[0], y = p.screen[1];
      var right = x < W * 0.55;
      var lx2 = right ? x + 60 : x - 60;
      var ly2 = y - 42;

      ctx.strokeStyle = hexA(p.color, 0.85);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(lx2, ly2);
      ctx.lineTo(lx2 + (right ? 84 : -84), ly2);
      ctx.stroke();

      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 7);
      ctx.fillStyle = p.color; ctx.fill();

      ctx.textAlign = right ? 'left' : 'right';
      var tx = lx2 + (right ? 4 : -4);
      ctx.fillStyle = p.color;
      ctx.font = '700 11px ui-monospace, monospace';
      ctx.fillText(p.label, tx, ly2 - 6);
      ctx.fillStyle = 'rgba(245,236,216,.66)';
      ctx.font = '10px ui-monospace, monospace';
      ctx.fillText(p.spec, tx, ly2 + 12);
    }

    function hexA(hex, a) {
      var n = parseInt(hex.slice(1), 16);
      return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a.toFixed(3) + ')';
    }

    /* ---- input (rig.js pointer contract) ---- */
    canvas.addEventListener('pointerdown', function (e) {
      dragging = true; moved = 0; lx = e.clientX; ly = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', function (e) {
      var r = canvas.getBoundingClientRect();
      mx = e.clientX - r.left; my = e.clientY - r.top;
      if (!dragging) return;
      var dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      dragX += dx * 0.008;
      dragY = Math.max(-1.2, Math.min(1.2, dragY + dy * 0.006));
    });
    canvas.addEventListener('pointerup', function (e) {
      if (dragging && moved < 5) pinned = (hot >= 0 && pinned !== hot) ? hot : -1;
      dragging = false;
      try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* already gone */ }
    });
    canvas.addEventListener('pointerleave', function () { mx = my = -1; hot = -1; });

    build();
    resize();
    addEventListener('resize', resize);

    /* 30fps cap — ~1,200 stroked wires per frame is wasted at 144Hz — and a
       hard skip when the window is minimized or the canvas is display:none */
    var last = performance.now(), acc = 0;
    (function loop(now) {
      requestAnimationFrame(loop);
      var dt = Math.min(64, now - last); last = now; acc += dt;
      if (acc < 33) return;
      /* Venus rotates retrograde — so does this, and slowly. It is the
         slowest rotation in the solar system; the site should not lie. */
      if (!dragging && !reduce) spin -= acc * 0.00006;
      if (!document.hidden && canvas.offsetParent) draw();
      acc = 0;
    })(last);

    return {
      setStrip: function (v) { strip = Math.max(0, Math.min(1, v)); },
      shells: SHELLS,
      selected: function () { return pinned >= 0 ? SHELLS[pinned] : (hot >= 0 ? SHELLS[hot] : null); }
    };
  }

  return { mount: mount, SHELLS: SHELLS };
})();
