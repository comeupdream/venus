/* =============================================================================
 * os.js — VENUS-OS window manager
 *
 * Structure ported from HOFFMAN-TACTICAL public/retro.js (Tactical-OS 96):
 * boot -> desktop icons -> openApp/focusWin/closeWin/toggleMin/maxWin ->
 * pointer drag + 8-way resize -> taskbar buttons -> start menu -> shut down.
 * The contract is the original's; the payload is Venus.
 *
 * Apps register themselves in js/apps.js as window.VENUSAPPS = { key: {...} }.
 * Each entry: { icon, title, w, h, desktop?, menu?, mount(node) -> teardown? }
 * ===========================================================================*/

(function () {
  'use strict';

  var APPS = window.VENUSAPPS || {};
  var $ = function (s) { return document.querySelector(s); };
  var el = function (t, c) { var e = document.createElement(t); if (c) e.className = c; return e; };

  var desktop = $('#desktop');
  var wins = {};

  /* SVG icon from js/icons.js when one exists, the app's text glyph if not */
  function icoHTML(key, cfg) {
    var s = window.VENUSICONS && window.VENUSICONS[key];
    return s ? '<span class="svgi">' + s + '</span>'
             : '<span aria-hidden="true">' + cfg.icon + '</span>';
  }
  var zTop = 20;
  var drag = null, rsz = null;
  var booted = false;

  /* =========================================================================
   * WINDOWS
   * =======================================================================*/
  function openApp(key) {
    var cfg = APPS[key];
    if (!cfg) return;
    if (wins[key]) { if (wins[key].min) toggleMin(key); focusWin(key); return; }

    var mobile = window.matchMedia('(max-width: 720px)').matches;
    var w = Math.min(cfg.w || 640, window.innerWidth - 24);
    var h = Math.min(cfg.h || 440, window.innerHeight - 90);
    var n = Object.keys(wins).length;
    var left = mobile ? 0 : Math.max(12, Math.round((window.innerWidth - w) / 2) + (n % 5) * 26 - 52);
    var top = mobile ? 0 : Math.max(12, Math.round((window.innerHeight - h) / 2.4) + (n % 5) * 22 - 44);

    var node = el('div', 'win');
    node.style.cssText = 'left:' + left + 'px;top:' + top + 'px;width:' + w + 'px;height:' + h + 'px;z-index:' + (++zTop);
    node.setAttribute('role', 'dialog');
    node.setAttribute('aria-label', cfg.title);
    node.innerHTML =
      '<div class="tbar">' +
        '<span class="ti" aria-hidden="true">' + icoHTML(key, cfg) + '</span>' +
        '<span class="tt">' + cfg.title + '</span>' +
        '<button class="tb" data-a="min" title="Minimise" aria-label="Minimise">_</button>' +
        '<button class="tb" data-a="max" title="Maximise" aria-label="Maximise">□</button>' +
        '<button class="tb" data-a="close" title="Close" aria-label="Close">×</button>' +
      '</div>' +
      '<div class="wbody plain"></div>' +
      /* resize zones per HOFFMAN retro.js: se grip + s/e/w edges + sw corner.
         Deliberately NO top corners — they'd sit on the titlebar buttons and
         steal the close click. */
      '<i class="grip"></i>' +
      '<i class="rz s" data-d="s"></i><i class="rz e" data-d="e"></i>' +
      '<i class="rz w" data-d="w"></i><i class="rz sw" data-d="sw"></i>';

    desktop.appendChild(node);
    var body = node.querySelector('.wbody');
    var teardown = null;
    try { teardown = cfg.mount(body); } catch (err) {
      body.innerHTML = '<div class="app"><div class="app-body"><p class="prose">' +
        'This module failed to start.</p></div></div>';
      if (window.console) console.error('[venus-os] ' + key + ' failed to mount', err);
    }

    wins[key] = { node: node, min: false, max: false, teardown: teardown };

    node.addEventListener('pointerdown', function () { focusWin(key); }, true);
    node.querySelector('.tbar').addEventListener('pointerdown', function (e) {
      if (e.target.closest('.tb')) return;
      startDrag(e, key);
    });
    node.querySelector('.grip').addEventListener('pointerdown', function (e) { startResize(e, key, 'se'); });
    node.querySelectorAll('.rz').forEach(function (h) {
      h.addEventListener('pointerdown', function (e) {
        startResize(e, key, h.dataset.d);
      });
    });
    node.querySelectorAll('.tb').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var a = b.dataset.a;
        if (a === 'close') closeWin(key);
        else if (a === 'min') toggleMin(key);
        else maxWin(key);
      });
    });

    addTask(key);
    focusWin(key);
  }

  function focusWin(key) {
    Object.keys(wins).forEach(function (k) { wins[k].node.classList.toggle('blur', k !== key); });
    if (wins[key]) wins[key].node.style.zIndex = ++zTop;
    document.querySelectorAll('#tasks .task').forEach(function (t) {
      t.classList.toggle('active', t.dataset.k === key && wins[key] && !wins[key].min);
    });
  }

  function closeWin(key) {
    var o = wins[key];
    if (!o) return;
    if (typeof o.teardown === 'function') { try { o.teardown(); } catch (e) { /* nothing to undo */ } }
    o.node.remove();
    delete wins[key];
    document.querySelectorAll('#tasks .task').forEach(function (t) { if (t.dataset.k === key) t.remove(); });
    var rest = Object.keys(wins);
    if (rest.length) focusWin(rest[rest.length - 1]);
  }

  function toggleMin(key) {
    var o = wins[key];
    if (!o) return;
    o.min = !o.min;
    o.node.style.display = o.min ? 'none' : 'flex';
    if (!o.min) focusWin(key);
    else document.querySelectorAll('#tasks .task').forEach(function (t) {
      if (t.dataset.k === key) t.classList.remove('active');
    });
  }

  function maxWin(key) {
    var o = wins[key];
    if (!o) return;
    o.max = !o.max;
    o.node.classList.toggle('max', o.max);
    window.dispatchEvent(new Event('resize'));
  }

  function addTask(key) {
    var cfg = APPS[key];
    var t = el('button', 'task');
    t.dataset.k = key;
    t.innerHTML = icoHTML(key, cfg) + '<span>' + cfg.title + '</span>';
    t.addEventListener('click', function () {
      var o = wins[key];
      if (!o) return;
      if (o.min) toggleMin(key);
      else if (o.node.classList.contains('blur')) focusWin(key);
      else toggleMin(key);
    });
    $('#tasks').appendChild(t);
  }

  /* ---- drag / resize ---- */
  function startDrag(e, key) {
    var o = wins[key];
    if (!o || o.max || window.matchMedia('(max-width: 720px)').matches) return;
    var r = o.node.getBoundingClientRect();
    drag = { key: key, ox: e.clientX - r.left, oy: e.clientY - r.top };
    o.node.classList.add('dragging');
    document.body.classList.add('wm-drag');
  }
  function startResize(e, key, dir) {
    var o = wins[key];
    if (!o || o.max) return;
    e.stopPropagation();
    var r = o.node.getBoundingClientRect();
    rsz = { key: key, dir: dir, x: e.clientX, y: e.clientY, w: r.width, h: r.height, l: r.left, t: r.top };
    o.node.classList.add('dragging');
    document.body.classList.add('wm-drag');
  }

  /* Pointer events can fire several times per display frame; writing styles
     on each one forces redundant style/paint work and is exactly what makes a
     drag feel sticky. Coalesce: the handler only records the latest position
     (passive, so it never blocks scrolling/compositing) and one rAF applies
     it per frame. */
  var pendMove = null, moveRaf = 0;

  function applyMove() {
    moveRaf = 0;
    var e = pendMove;
    if (!e) return;
    if (drag) {
      var o = wins[drag.key];
      if (!o) return;
      var x = Math.max(-40, Math.min(window.innerWidth - 60, e.x - drag.ox));
      var y = Math.max(0, Math.min(window.innerHeight - 44, e.y - drag.oy));
      o.node.style.left = x + 'px';
      o.node.style.top = y + 'px';
    } else if (rsz) {
      var o2 = wins[rsz.key];
      if (!o2) return;
      var dx = e.x - rsz.x, dy = e.y - rsz.y;
      var w = rsz.w, h = rsz.h, l = rsz.l, t = rsz.t;
      if (rsz.dir.indexOf('e') > -1) w = rsz.w + dx;
      if (rsz.dir.indexOf('s') > -1) h = rsz.h + dy;
      if (rsz.dir.indexOf('w') > -1) { w = rsz.w - dx; l = rsz.l + dx; }
      if (rsz.dir.indexOf('n') > -1) { h = rsz.h - dy; t = rsz.t + dy; }
      w = Math.max(260, w); h = Math.max(140, h);
      o2.node.style.width = w + 'px';
      o2.node.style.height = h + 'px';
      o2.node.style.left = l + 'px';
      o2.node.style.top = t + 'px';
    }
  }

  addEventListener('pointermove', function (e) {
    if (!drag && !rsz) return;
    pendMove = { x: e.clientX, y: e.clientY };
    if (!moveRaf) moveRaf = requestAnimationFrame(applyMove);
  }, { passive: true });

  addEventListener('pointerup', function () {
    if (drag || rsz) {
      var o = wins[(drag || rsz).key];
      if (o) o.node.classList.remove('dragging');
      window.dispatchEvent(new Event('resize'));
    }
    drag = null; rsz = null; pendMove = null;
    document.body.classList.remove('wm-drag');
  });

  /* =========================================================================
   * DESKTOP ICONS
   * =======================================================================*/
  var ICONS = Object.keys(APPS).filter(function (k) { return APPS[k].desktop !== false; });

  /* columns fill top-to-bottom, sized to the viewport — a 20-app desktop
     should wrap into more columns, not run under the taskbar */
  var ICON_ROWS = Math.max(4, Math.floor((window.innerHeight - 54) / 92));

  ICONS.forEach(function (key, i) {
    var cfg = APPS[key];
    var d = el('button', 'dicon');
    var col = Math.floor(i / ICON_ROWS), row = i % ICON_ROWS;
    d.style.left = (18 + col * 104) + 'px';
    d.style.top = (18 + row * 92) + 'px';
    d.innerHTML = '<div class="gi" aria-hidden="true">' + icoHTML(key, cfg) + '</div><div class="lbl">' + cfg.title + '</div>';
    d.addEventListener('click', function () {
      document.querySelectorAll('.dicon').forEach(function (x) { x.classList.remove('sel'); });
      d.classList.add('sel');
    });
    d.addEventListener('dblclick', function () { openApp(key); });
    /* touch has no dblclick worth waiting for — one tap opens */
    d.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openApp(key); } });
    if (matchMedia('(pointer: coarse)').matches) {
      d.addEventListener('click', function () { openApp(key); });
    }
    desktop.appendChild(d);
  });

  desktop.addEventListener('pointerdown', function (e) {
    if (e.target === desktop || e.target.id === 'wallpaper') {
      document.querySelectorAll('.dicon').forEach(function (x) { x.classList.remove('sel'); });
      closeStart();
    }
  });

  /* =========================================================================
   * START MENU
   * =======================================================================*/
  var sm = $('#startmenu');
  var items = sm.querySelector('.items');
  Object.keys(APPS).filter(function (k) { return APPS[k].menu !== false; }).forEach(function (key) {
    var cfg = APPS[key];
    var m = el('button', 'mi');
    m.innerHTML = '<span class="mi-i" aria-hidden="true">' + icoHTML(key, cfg) + '</span><span>' + cfg.title + '</span>';
    m.addEventListener('click', function () { closeStart(); openApp(key); });
    items.appendChild(m);
  });
  items.appendChild(el('div', 'sep'));
  var shut = el('button', 'mi');
  shut.innerHTML = '<span class="mi-i" aria-hidden="true">⏻</span><span>Shut Down…</span>';
  shut.addEventListener('click', function () { closeStart(); shutDown(); });
  items.appendChild(shut);

  if (window.VENUSICONS && window.VENUSICONS.start) {
    $('#startbtn').innerHTML =
      '<span class="svgi" style="width:16px;height:16px">' + window.VENUSICONS.start + '</span> START';
  }

  function openStart() { sm.classList.add('on'); $('#startbtn').classList.add('on'); }
  function closeStart() { sm.classList.remove('on'); $('#startbtn').classList.remove('on'); }
  $('#startbtn').addEventListener('click', function (e) {
    e.stopPropagation();
    sm.classList.contains('on') ? closeStart() : openStart();
  });
  addEventListener('pointerdown', function (e) {
    if (!sm.contains(e.target) && !$('#startbtn').contains(e.target)) closeStart();
  });
  addEventListener('keydown', function (e) {
    if (!booted) { skipBoot(); return; }
    if (e.key === 'Escape') closeStart();
  });

  function shutDown() {
    var o = el('div');
    o.style.cssText = 'position:fixed;inset:0;z-index:9998;background:#0a0702;color:#ffc83d;' +
      'display:grid;place-items:center;text-align:center;font-family:var(--mono);font-size:14px;' +
      'letter-spacing:.2em;cursor:pointer;padding:24px;line-height:2';
    o.innerHTML = 'IT IS NOW SAFE TO LEAVE THE ATMOSPHERE<br>' +
      '<span style="color:#b09a6e;font-size:11px">92 bar · 462 °C · click to re-enter</span>';
    o.addEventListener('click', function () { location.reload(); });
    document.body.appendChild(o);
  }

  /* =========================================================================
   * TRAY — clock + live phase readout
   * =======================================================================*/
  var p2 = function (n) { return String(n).padStart(2, '0'); };
  function tickTray() {
    var d = new Date();
    $('#clock').textContent = p2(d.getHours()) + ':' + p2(d.getMinutes());
    if (window.VENUSPHASE) {
      var ph = window.VENUSPHASE.venusPhase(d);
      $('#trayphase').textContent = '☾ ' + (ph.illumination * 100).toFixed(1) + '% · ' + ph.name;
    }
    /* live price chips, only when the feed has pairs */
    if (window.VENUSMARKET) {
      var m = window.VENUSMARKET.get();
      var el2 = $('#trayprice');
      if (m.last && m.last.priceUsd && el2) {
        var chg = m.last.priceChange && m.last.priceChange.h24;
        el2.textContent = '$VENUS ' + (+(+m.last.priceUsd).toPrecision(4)) +
          (chg == null ? '' : ' ' + (chg >= 0 ? '▲' : '▼'));
        el2.style.color = chg == null || chg >= 0 ? 'var(--gold)' : 'var(--ember)';
      } else if (el2) el2.textContent = '';
      /* the thesis, restated on every screen: live gold */
      var el3 = $('#traygold');
      if (m.gold && m.gold.priceUsd && el3) {
        el3.textContent = 'AU $' + Math.round(+m.gold.priceUsd).toLocaleString() + '/oz';
      } else if (el3) el3.textContent = '';
    }
  }
  tickTray();
  setInterval(tickTray, 15000);
  if (window.VENUSMARKET) window.VENUSMARKET.onUpdate(tickTray);

  /* =========================================================================
   * BOOT — retro.js's typed POST, with a Venus entry sequence
   * =======================================================================*/
  var LINES = [
    'VENUS-OS  v1.0.0-scaffold        (c) 2026',
    '',
    'POST ......................... OK',
    'Atmospheric probe ............ NOMINAL',
    '  CO2 96.5%  N2 3.5%  H2SO4 aerosol',
    '  surface 462 C / 92 bar',
    'Ephemeris (J2000 mean elements)  LOADED',
    'Cloud-deck shader ............ COMPILED',
    'Wireframe CAD kernel ......... COMPILED',
    'Terrain generator ............ SEEDING',
    '',
    'Mounting desktop …'
  ];

  var bootEl = $('#boot'), pre = $('#bootpre'), bar = $('#bootbar');
  var li = 0, ci = 0, barIv = null;

  /* returning visitors get the express boot — charm once, speed forever */
  var returning = false;
  try { returning = !!localStorage.getItem('venus-booted'); } catch (e) {}

  function type() {
    if (li >= LINES.length) return;
    var line = LINES[li];
    if (ci <= line.length) {
      pre.textContent = LINES.slice(0, li).join('\n') + (li ? '\n' : '') + line.slice(0, ci);
      ci++;
      setTimeout(type, line.length ? 9 : 90);
    } else {
      li++; ci = 0;
      setTimeout(type, 70);
    }
  }

  function enterDesktop() {
    if (booted) return;
    booted = true;
    try { localStorage.setItem('venus-booted', '1'); } catch (e) { /* private mode */ }
    clearInterval(barIv);
    bootEl.style.transition = 'opacity .5s';
    bootEl.style.opacity = '0';
    setTimeout(function () { bootEl.remove(); }, 520);
    /* one showpiece on arrival — the rest is what the desktop is for */
    openApp('globe');
  }
  function skipBoot() {
    if (booted) return;
    if (bar) bar.style.width = '100%';
    enterDesktop();
  }

  var pct = 0;
  barIv = setInterval(function () {
    pct = Math.min(100, pct + (returning ? 12 : 2.6));
    if (bar) bar.style.width = pct + '%';
    if (pct >= 100) skipBoot();
  }, 62);

  bootEl.addEventListener('click', skipBoot);
  if (returning) pre.textContent = LINES.join('\n');   /* no typing replay */
  else type();

  /* the wallpaper starts immediately — it is visible behind the boot screen */
  if (window.TERRAIN) {
    window.TERRAIN.mount($('#wallpaper'), {
      onMode: function (mode) {
        var n = $('#wallmode');
        if (n) n.textContent = mode === 'photo' ? 'MAGELLAN PLATE' : 'PROCEDURAL TERRAIN';
      }
    });
  }

  /* =========================================================================
   * VIEW TOGGLE — SURFACE (terrain wallpaper) <-> SPACE (the hero video).
   * The video's src is only attached on first use, so surface-only visitors
   * never download it. Choice persists.
   * =======================================================================*/
  var wallVideo = $('#wallvideo');
  var viewBtn = $('#viewtoggle');
  var view = 'surface';
  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* the raw swap — instant, no ceremony. Init, error fallback and
     reduced-motion all come straight here. */
  function applyView(v, persist) {
    if (v !== 'space' && v !== 'surface') return false;
    view = v;
    var space = v === 'space';
    document.body.classList.toggle('space-view', space);
    if (space) {
      if (!wallVideo.src) wallVideo.src = wallVideo.dataset.src;
      wallVideo.play().catch(function () { /* not fatal — poster frame shows */ });
    } else {
      wallVideo.pause();
    }
    viewBtn.textContent = space ? '⬤ SPACE' : '▲ SURFACE';
    viewBtn.setAttribute('aria-pressed', space ? 'true' : 'false');
    if (persist) { try { localStorage.setItem('venus-view', v); } catch (e) { /* private mode */ } }
    return true;
  }

  /* ---- the warp jump ------------------------------------------------------
     The space video opens on star streaks blasting past the planet; the
     toggle borrows that grammar. Radial streaks accelerate out of the centre
     and black out the desktop, the view swaps under the cover at the
     midpoint, then the streaks decelerate and clear. Overlay only spans
     #desktop, so the taskbar stays put — the OS never warps, just the sky. */
  var warpCv = document.createElement('canvas');
  warpCv.id = 'warp';
  desktop.appendChild(warpCv);
  var warping = false;

  function setView(v, persist) {
    if (v !== 'space' && v !== 'surface') return false;
    if (v === view) return true;
    if (warping) return false;
    if (reduceMotion) return applyView(v, persist);

    warping = true;
    var ctx = warpCv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = warpCv.width = Math.round(desktop.clientWidth * dpr);
    var H = warpCv.height = Math.round(desktop.clientHeight * dpr);
    warpCv.style.display = 'block';

    var cx = W / 2, cy = H * 0.46;
    var R = Math.hypot(W, H) * 0.62;
    var N = 220, streaks = [], i;
    for (i = 0; i < N; i++) {
      streaks.push({
        a: Math.random() * 6.283,        /* bearing from centre */
        d: Math.random(),                /* radial position, 0..1 */
        v: 0.55 + Math.random() * 1.45   /* individual speed */
      });
    }

    var DUR = 900, t0 = performance.now(), last = t0, swapped = false;
    (function frame(now) {
      var t = Math.min(1, (now - t0) / DUR);
      var dt = Math.min(64, now - last); last = now;
      var env = Math.sin(Math.PI * t);   /* intensity: 0 → 1 → 0 */

      /* swap under full cover */
      if (t >= 0.5 && !swapped) { swapped = true; applyView(v, persist); }

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(5,3,1,' + (env * 0.94).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);

      ctx.lineCap = 'round';
      for (i = 0; i < N; i++) {
        var s = streaks[i];
        s.d += dt * 0.001 * s.v * (0.25 + env * 2.1);
        if (s.d >= 1) s.d -= 1;
        /* quadratic radius: streaks pick up speed as they fly outward */
        var r0 = s.d * s.d * R;
        var r1 = Math.min(R, r0 + (0.025 + 0.14 * env * s.v) * R * s.d);
        var ca = Math.cos(s.a), sa = Math.sin(s.a);
        var alpha = env * (0.2 + 0.8 * s.d);

        ctx.strokeStyle = 'rgba(255,200,61,' + (alpha * 0.35).toFixed(3) + ')';
        ctx.lineWidth = 3 * dpr;
        ctx.beginPath();
        ctx.moveTo(cx + ca * r0, cy + sa * r0);
        ctx.lineTo(cx + ca * r1, cy + sa * r1);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255,246,216,' + alpha.toFixed(3) + ')';
        ctx.lineWidth = 1.2 * dpr;
        ctx.beginPath();
        ctx.moveTo(cx + ca * r0, cy + sa * r0);
        ctx.lineTo(cx + ca * r1, cy + sa * r1);
        ctx.stroke();
      }

      if (t < 1) { requestAnimationFrame(frame); return; }
      warpCv.style.display = 'none';
      warping = false;
    })(t0);
    return true;
  }

  /* if the video is missing or unplayable, fall back and retire the button */
  wallVideo.addEventListener('error', function () {
    applyView('surface', false);
    viewBtn.disabled = true;
    viewBtn.textContent = '▲ SURFACE';
  });

  viewBtn.addEventListener('click', function () {
    setView(view === 'space' ? 'surface' : 'space', true);
  });

  try { applyView(localStorage.getItem('venus-view') || 'surface', false); }
  catch (e) { applyView('surface', false); }

  window.VENUSOS = { open: openApp, close: closeWin, apps: APPS, setView: setView };
})();
