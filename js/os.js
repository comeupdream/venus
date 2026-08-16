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
        '<span class="ti" aria-hidden="true">' + cfg.icon + '</span>' +
        '<span class="tt">' + cfg.title + '</span>' +
        '<button class="tb" data-a="min" title="Minimise" aria-label="Minimise">_</button>' +
        '<button class="tb" data-a="max" title="Maximise" aria-label="Maximise">□</button>' +
        '<button class="tb" data-a="close" title="Close" aria-label="Close">×</button>' +
      '</div>' +
      '<div class="wbody plain"></div>' +
      '<i class="grip"></i><i class="rz ne"></i><i class="rz nw"></i><i class="rz sw"></i>';

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
        startResize(e, key, h.className.replace('rz ', ''));
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
    t.innerHTML = '<span aria-hidden="true">' + cfg.icon + '</span><span>' + cfg.title + '</span>';
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
    document.body.classList.add('wm-drag');
  }
  function startResize(e, key, dir) {
    var o = wins[key];
    if (!o || o.max) return;
    e.stopPropagation();
    var r = o.node.getBoundingClientRect();
    rsz = { key: key, dir: dir, x: e.clientX, y: e.clientY, w: r.width, h: r.height, l: r.left, t: r.top };
    document.body.classList.add('wm-drag');
  }

  addEventListener('pointermove', function (e) {
    if (drag) {
      var o = wins[drag.key];
      if (!o) return;
      var x = Math.max(-40, Math.min(window.innerWidth - 60, e.clientX - drag.ox));
      var y = Math.max(0, Math.min(window.innerHeight - 44, e.clientY - drag.oy));
      o.node.style.left = x + 'px';
      o.node.style.top = y + 'px';
    } else if (rsz) {
      var o2 = wins[rsz.key];
      if (!o2) return;
      var dx = e.clientX - rsz.x, dy = e.clientY - rsz.y;
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
  });
  addEventListener('pointerup', function () {
    if (drag || rsz) window.dispatchEvent(new Event('resize'));
    drag = null; rsz = null;
    document.body.classList.remove('wm-drag');
  });

  /* =========================================================================
   * DESKTOP ICONS
   * =======================================================================*/
  var ICONS = Object.keys(APPS).filter(function (k) { return APPS[k].desktop !== false; });

  ICONS.forEach(function (key, i) {
    var cfg = APPS[key];
    var d = el('button', 'dicon');
    var col = Math.floor(i / 5), row = i % 5;
    d.style.left = (18 + col * 104) + 'px';
    d.style.top = (18 + row * 92) + 'px';
    d.innerHTML = '<div class="gi" aria-hidden="true">' + cfg.icon + '</div><div class="lbl">' + cfg.title + '</div>';
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
    m.innerHTML = '<span class="mi-i" aria-hidden="true">' + cfg.icon + '</span><span>' + cfg.title + '</span>';
    m.addEventListener('click', function () { closeStart(); openApp(key); });
    items.appendChild(m);
  });
  items.appendChild(el('div', 'sep'));
  var shut = el('button', 'mi');
  shut.innerHTML = '<span class="mi-i" aria-hidden="true">⏻</span><span>Shut Down…</span>';
  shut.addEventListener('click', function () { closeStart(); shutDown(); });
  items.appendChild(shut);

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
  }
  tickTray();
  setInterval(tickTray, 15000);

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
    clearInterval(barIv);
    bootEl.style.transition = 'opacity .5s';
    bootEl.style.opacity = '0';
    setTimeout(function () { bootEl.remove(); }, 520);
    /* open the two showpieces so the desktop is never empty on arrival */
    if (!matchMedia('(max-width: 720px)').matches) {
      openApp('globe');
      setTimeout(function () { openApp('phase'); }, 260);
    } else {
      openApp('globe');
    }
  }
  function skipBoot() {
    if (booted) return;
    if (bar) bar.style.width = '100%';
    enterDesktop();
  }

  var pct = 0;
  barIv = setInterval(function () {
    pct = Math.min(100, pct + 2.6);
    if (bar) bar.style.width = pct + '%';
    if (pct >= 100) skipBoot();
  }, 62);

  bootEl.addEventListener('click', skipBoot);
  type();

  /* the wallpaper starts immediately — it is visible behind the boot screen */
  if (window.TERRAIN) {
    window.TERRAIN.mount($('#wallpaper'), {
      onMode: function (mode) {
        var n = $('#wallmode');
        if (n) n.textContent = mode === 'photo' ? 'MAGELLAN PLATE' : 'PROCEDURAL TERRAIN';
      }
    });
  }

  window.VENUSOS = { open: openApp, close: closeWin, apps: APPS };
})();
