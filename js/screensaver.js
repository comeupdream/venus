/* =============================================================================
 * screensaver.js — the most 9x feature possible
 *
 * Three minutes idle and the OS dims into a starfield with the VENUS wordmark
 * bouncing DVD-logo style, changing hue on every wall it kisses (within the
 * gold family — this is still Venus). Any input wakes it. VDOS `saver` starts
 * it on demand. Never auto-starts under prefers-reduced-motion.
 * ===========================================================================*/

window.VENUSSAVER = (function () {
  'use strict';

  var IDLE_MS = 180000;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cv = null, running = false, stopFn = null, idleTimer = null;

  var TINTS = ['#ffc83d', '#f4e04d', '#ff7a2f', '#ffe9a8', '#cdb07c', '#b8862a'];

  function start() {
    if (running) return;
    running = true;

    cv = document.createElement('canvas');
    cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:9500;cursor:none;background:#050301';
    document.body.appendChild(cv);
    var ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = cv.width = Math.round(innerWidth * dpr);
    var H = cv.height = Math.round(innerHeight * dpr);

    /* drifting stars, cheap and plentiful */
    var stars = [], i;
    for (i = 0; i < 140; i++) {
      stars.push({ x: Math.random() * W, y: Math.random() * H,
                   z: 0.3 + Math.random() * 0.7, tw: Math.random() * 6.28 });
    }

    /* the wordmark */
    var fs = Math.round(Math.min(W, H) * 0.075);
    ctx.font = '900 ' + fs + 'px ui-sans-serif, system-ui, sans-serif';
    var tw = ctx.measureText('VENUS').width, th = fs;
    var bx = Math.random() * (W - tw), by = th + Math.random() * (H - th * 2);
    var vx = W * 0.00012, vy = W * 0.0001, tint = 0, t = 0;

    var last = performance.now(), alive = true;
    (function frame(now) {
      if (!alive) return;
      requestAnimationFrame(frame);
      var dt = Math.min(64, now - last); last = now; t += dt * 0.001;

      ctx.fillStyle = '#050301';
      ctx.fillRect(0, 0, W, H);

      for (i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.x -= dt * 0.012 * s.z;
        if (s.x < 0) s.x += W;
        ctx.globalAlpha = s.z * (0.5 + 0.5 * Math.sin(t * 2 + s.tw));
        ctx.fillStyle = '#e8e2d2';
        ctx.fillRect(s.x, s.y, 1.3 * dpr, 1.3 * dpr);
      }
      ctx.globalAlpha = 1;

      if (!reduce) {
        bx += vx * dt; by += vy * dt;
        if (bx <= 0 || bx + tw >= W) { vx = -vx; tint = (tint + 1) % TINTS.length; bx = Math.max(0, Math.min(W - tw, bx)); }
        if (by - th <= 0 || by >= H) { vy = -vy; tint = (tint + 1) % TINTS.length; by = Math.max(th, Math.min(H, by)); }
      }
      /* the brand wordmark: white racing italic, dark outline, tinted glow */
      ctx.save();
      ctx.translate(bx, by);
      ctx.transform(1, 0, -0.16, 1, 0, 0);
      ctx.font = 'italic 900 ' + fs + 'px "Arial Black", ui-sans-serif, system-ui, sans-serif';
      ctx.lineWidth = Math.max(2, fs * 0.05);
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#241a0a';
      ctx.shadowColor = TINTS[tint]; ctx.shadowBlur = 26 * dpr;
      ctx.strokeText('VENUS', 0, 0);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.fillText('VENUS', 0, 0);
      ctx.restore();
      ctx.font = (fs * 0.18) + 'px ui-monospace, monospace';
      ctx.fillStyle = 'rgba(176,154,110,.8)';
      ctx.fillText('4 6 2 ° C   A N D   D R E A M I N G', bx + 4, by + fs * 0.36);
    })(last);

    stopFn = function () {
      alive = false;
      if (cv) { cv.remove(); cv = null; }
      running = false;
      arm();
    };

    /* first input wakes it — capture phase so nothing under it reacts */
    setTimeout(function () {
      ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) {
        addEventListener(ev, wake, { capture: true, once: false });
      });
    }, 400);
  }

  var wakeArmed = false;
  function wake(e) {
    if (!running) return;
    e.stopPropagation(); e.preventDefault();
    ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) {
      removeEventListener(ev, wake, { capture: true });
    });
    stopFn && stopFn();
  }

  /* ---- idle detection ---- */
  function arm() {
    clearTimeout(idleTimer);
    if (reduce) return;                        /* never auto-start */
    idleTimer = setTimeout(start, IDLE_MS);
  }
  /* re-arm at most once a second — clearTimeout/setTimeout churn on every
     pointermove is pointless work at mouse-move frequency */
  var lastArm = 0;
  ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) {
    addEventListener(ev, function () {
      if (running) return;
      var n = Date.now();
      if (n - lastArm > 1000) { lastArm = n; arm(); }
    }, { passive: true });
  });
  arm();

  return { start: start, stop: function () { stopFn && stopFn(); } };
})();
