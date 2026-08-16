/* =============================================================================
 * apps.js — what runs inside VENUS-OS
 *
 * Each app is { icon, title, w, h, mount(node) -> teardown? }. The interiors
 * speak dragonfruit-drive (rack cards, labelled knobs, canvas wells, glowing
 * gradient action buttons); the chassis around them is Tactical-OS.
 *
 * Registered on window.VENUSAPPS before os.js reads it. Additional apps live
 * as one file each under js/apps/ and merge themselves into the same registry
 * (loaded after this file, before os.js) using the window.VENUSKIT helpers
 * this file exports.
 * ===========================================================================*/

window.VENUSAPPS = Object.assign(window.VENUSAPPS || {}, (function () {
  'use strict';

  var raf = [];   /* every app that animates registers its id here to be killed */

  function loop(fn) {
    var alive = true, last = performance.now();
    (function step(now) {
      if (!alive) return;
      requestAnimationFrame(step);
      var dt = Math.min(64, now - last); last = now;
      if (!document.hidden) fn(dt, now);
    })(last);
    return function () { alive = false; };
  }

  function h(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }

  /* the toolkit every js/apps/* file builds with */
  window.VENUSKIT = { loop: loop, h: h };

  /* =========================================================================
   * VENUS.EXE — the wireframe field-strip
   * =======================================================================*/
  var globe = {
    icon: '🜍', title: 'VENUS.EXE', w: 660, h: 520,
    mount: function (node) {
      node.appendChild(h(
        '<div class="app">' +
          '<div class="app-head">' +
            '<span class="h-title">CUTAWAY · INTERNAL STRUCTURE</span>' +
            '<span class="spacer"></span>' +
            '<span class="h-sub">CAD KERNEL v1</span>' +
          '</div>' +
          '<div class="stage"><canvas></canvas>' +
            '<div class="hint">DRAG TO ROTATE · HOVER A SHELL · CLICK TO PIN</div>' +
          '</div>' +
          '<div class="strip">' +
            '<label for="stripr">FIELD STRIP</label>' +
            '<input id="stripr" type="range" min="0" max="100" value="0" aria-label="Field strip">' +
            '<span class="readout">ASSEMBLED</span>' +
          '</div>' +
          '<div class="app-foot"><span>R <b>6,051.8 km</b></span><span>g <b>8.87 m/s²</b></span>' +
            '<span>rotation <b>243.0 d retrograde</b></span></div>' +
        '</div>'
      ));

      var cv = node.querySelector('canvas');
      var range = node.querySelector('#stripr');
      var read = node.querySelector('.readout');
      var g = window.VENUSGLOBE.mount(cv);

      function apply() {
        var v = range.value / 100;
        g.setStrip(v);
        read.textContent = v === 0 ? 'ASSEMBLED' : v === 1 ? 'FULLY STRIPPED' : (v * 100).toFixed(0) + '% SEPARATED';
      }
      range.addEventListener('input', apply);
      apply();
      return null;
    }
  };

  /* =========================================================================
   * PHASE — the Avant Meridian complication, computed for Venus
   * =======================================================================*/
  var phase = {
    icon: '☾', title: 'PHASE', w: 440, h: 620,
    mount: function (node) {
      node.appendChild(h(
        '<div class="app dial-app">' +
          '<div class="app-head" style="background:none;border-color:#1c2640">' +
            '<span class="h-title" style="color:#cdb07c">VENUS PHASE</span>' +
            '<span class="spacer"></span>' +
            '<span class="h-sub">J2000 MEAN ELEMENTS</span>' +
          '</div>' +
          '<div class="dial-wrap"><canvas></canvas></div>' +
          '<dl class="dial-facts">' +
            '<div><dt>ILLUMINATED</dt><dd data-f="k">—</dd></div>' +
            '<div><dt>PHASE</dt><dd data-f="name">—</dd></div>' +
            '<div><dt>ELONGATION</dt><dd data-f="elong">—</dd></div>' +
            '<div><dt>DISTANCE</dt><dd data-f="dist">—</dd></div>' +
            '<div><dt>APPARENT ⌀</dt><dd data-f="app">—</dd></div>' +
            '<div><dt>MAGNITUDE</dt><dd data-f="mag">—</dd></div>' +
          '</dl>' +
        '</div>'
      ));

      var cv = node.querySelector('canvas');
      var f = {};
      node.querySelectorAll('[data-f]').forEach(function (n) { f[n.dataset.f] = n; });

      var acc = 0;
      return loop(function (dt) {
        acc += dt; if (acc < 33) return; acc = 0;   /* 30fps is plenty for a dial */
        if (!cv.offsetParent) return;
        var now = new Date();
        var p = window.VENUSPHASE.venusPhase(now);
        window.VENUSPHASE.drawDial(cv, p, now);
        f.k.textContent = (p.illumination * 100).toFixed(1) + '%';
        f.name.textContent = p.name;
        f.elong.textContent = p.elongation.toFixed(1) + '° ' + (p.evening ? 'E' : 'W');
        f.dist.textContent = p.distanceAU.toFixed(3) + ' AU';
        f.app.textContent = p.apparentArcsec.toFixed(1) + '″';
        f.mag.textContent = 'm ' + p.magnitude.toFixed(2);
      });
    }
  };

  /* =========================================================================
   * CLOUD LAB — dragonfruit-drive's effects rack, wired to the cloud deck
   * =======================================================================*/
  var clouds = {
    icon: '🌪', title: 'CLOUD LAB', w: 760, h: 540,
    mount: function (node) {
      node.appendChild(h(
        '<div class="app">' +
          '<div class="app-head">' +
            '<span class="h-title">ZONAL CLOUD DECK · GENERATOR</span>' +
            '<span class="spacer"></span>' +
            '<button class="genbtn" data-a="gen">↯ RESEED</button>' +
          '</div>' +
          '<div class="app-body">' +
            '<canvas class="well tall"></canvas>' +
            '<div class="rack" style="margin-top:14px">' +
              '<div class="card">' +
                '<div class="card-head"><span class="idx">1</span><span class="title">Superrotation</span>' +
                  '<span class="tag">4 d</span></div>' +
                '<div class="knob"><div class="row"><span class="name">drift</span><span class="val"></span></div>' +
                  '<input type="range" data-k="drift" min="0" max="100" value="46"></div>' +
                '<div class="knob"><div class="row"><span class="name">shear</span><span class="val"></span></div>' +
                  '<input type="range" data-k="shear" min="0" max="100" value="38"></div>' +
              '</div>' +
              '<div class="card">' +
                '<div class="card-head"><span class="idx">2</span><span class="title">Banding</span>' +
                  '<span class="tag">ZONAL</span></div>' +
                '<div class="knob"><div class="row"><span class="name">bands</span><span class="val"></span></div>' +
                  '<input type="range" data-k="bands" min="2" max="26" value="11"></div>' +
                '<div class="knob"><div class="row"><span class="name">turbulence</span><span class="val"></span></div>' +
                  '<input type="range" data-k="turb" min="0" max="100" value="52"></div>' +
              '</div>' +
              '<div class="card">' +
                '<div class="card-head"><span class="idx">3</span><span class="title">Chemistry</span>' +
                  '<span class="tag">H2SO4</span></div>' +
                '<div class="knob"><div class="row"><span class="name">acid</span><span class="val"></span></div>' +
                  '<input type="range" data-k="acid" min="0" max="100" value="72"></div>' +
                '<div class="knob"><div class="row"><span class="name">thermal</span><span class="val"></span></div>' +
                  '<input type="range" data-k="heat" min="0" max="100" value="30"></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="app-foot"><span>seed <b data-f="seed">—</b></span>' +
            '<span>Every frame is generated. Nothing here is a texture file.</span></div>' +
        '</div>'
      ));

      var cv = node.querySelector('canvas');
      var ctx = cv.getContext('2d');
      var K = { drift: 46, shear: 38, bands: 11, turb: 52, acid: 72, heat: 30 };
      var seed = 1337;
      var IW = 260, IH = 150;
      cv.width = IW; cv.height = IH;
      var img = ctx.createImageData(IW, IH);

      function sync() {
        node.querySelectorAll('[data-k]').forEach(function (r) {
          K[r.dataset.k] = +r.value;
          r.closest('.knob').querySelector('.val').textContent = r.value;
        });
        node.querySelector('[data-f="seed"]').textContent = '0x' + seed.toString(16).toUpperCase();
      }
      node.querySelectorAll('[data-k]').forEach(function (r) { r.addEventListener('input', sync); });
      node.querySelector('[data-a="gen"]').addEventListener('click', function () {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        sync();
      });
      sync();

      /* cheap hash noise + fbm — domain-warped so the bands curdle like the
         real cloud deck rather than sitting in clean stripes */
      function n2(x, y, s) {
        var v = Math.sin(x * 12.9898 + y * 78.233 + s * 0.137) * 43758.5453;
        return v - Math.floor(v);
      }
      function sn(x, y, s) {
        var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
        var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
        return (n2(xi, yi, s) * (1 - u) + n2(xi + 1, yi, s) * u) * (1 - v) +
               (n2(xi, yi + 1, s) * (1 - u) + n2(xi + 1, yi + 1, s) * u) * v;
      }
      function fbm(x, y, s) {
        var t = 0, a = 0.5, f = 1;
        for (var i = 0; i < 4; i++) { t += sn(x * f, y * f, s + i) * a; a *= 0.5; f *= 2.1; }
        return t;
      }

      var t = 0, cacc = 0;
      return loop(function (dt) {
        /* ~1.2M noise ops per paint — 30fps and only while visible */
        cacc += dt; if (cacc < 33) return;
        if (!cv.offsetParent) { cacc = 0; return; }
        dt = cacc; cacc = 0;
        t += dt * 0.001 * (0.2 + K.drift / 100 * 2.4);
        var d = img.data, p = 0;
        var turb = K.turb / 100, shear = K.shear / 100;
        var acid = K.acid / 100, heat = K.heat / 100;

        for (var y = 0; y < IH; y++) {
          var lat = (y / IH) * 2 - 1;
          /* zonal wind is fastest at the equator — that is the shear knob */
          var u = t * (1 + shear * (1 - Math.abs(lat)) * 2.2);
          for (var x = 0; x < IW; x++) {
            var wx = x / IW * 5 + u;
            var wy = y / IH * 3;
            var warp = fbm(wx * 1.4, wy * 1.4, seed % 97) * turb * 2.6;
            var band = Math.sin((wy + warp * 0.35) * K.bands * 0.7) * 0.5 + 0.5;
            var detail = fbm(wx * 3.1 + warp, wy * 3.1, (seed >> 3) % 89);
            var v = band * 0.62 + detail * 0.38;

            /* the Venera-derived gold, pushed toward sulfur by acid and
               toward ember by thermal */
            var r = 150 + v * 105 + heat * 70;
            var g = 110 + v * 108 * (0.6 + acid * 0.5) - heat * 26;
            var b = 20 + v * 44 * (1 - acid * 0.72);
            d[p++] = Math.min(255, r);
            d[p++] = Math.min(255, g);
            d[p++] = Math.min(255, b);
            d[p++] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
      });
    }
  };

  /* =========================================================================
   * VDOS — MT-DOS from apps96.js, reskinned
   * =======================================================================*/
  var term = {
    icon: '▮', title: 'VDOS', w: 560, h: 400,
    mount: function (node) {
      node.appendChild(h(
        '<div class="term">' +
          '<div class="out"></div>' +
          '<div class="line"><span class="ps">V:\\&gt;</span>' +
            '<input class="in" autocomplete="off" spellcheck="false" aria-label="command"></div>' +
        '</div>'
      ));

      var out = node.querySelector('.out');
      var inp = node.querySelector('.in');

      function say(html) { out.innerHTML += html + '\n'; out.scrollTop = out.scrollHeight; }

      say('<span class="u">VENUS-OS command shell</span>');
      say('<span class="d">type `help` for the verb list</span>\n');

      var CMDS = {
        help: function () {
          say('  phase      current Venus phase, computed live');
          say('  venus      physical data sheet');
          say('  open X     launch an app: ' + Object.keys(window.VENUSOS.apps).join(' '));
          say('  view X     switch the desktop: view surface | view space');
          say('  saver      start the screensaver now');
          say('  vesper     summon / dismiss the mascot');
          say('  seed       reseed the wallpaper terrain');
          say('  credits    where every visual cue came from');
          say('  clear      clear this buffer');
        },
        phase: function () {
          var p = window.VENUSPHASE.venusPhase(new Date());
          say('  illuminated  <span class="u">' + (p.illumination * 100).toFixed(2) + '%</span>');
          say('  phase        ' + p.name);
          say('  elongation   ' + p.elongation.toFixed(2) + '° ' + (p.evening ? 'east (evening star)' : 'west (morning star)'));
          say('  distance     ' + p.distanceAU.toFixed(4) + ' AU');
          say('  magnitude    ' + p.magnitude.toFixed(2));
        },
        venus: function () {
          say('  radius       6,051.8 km   (0.9499 Earth)');
          say('  mass         4.867e24 kg  (0.815 Earth)');
          say('  gravity      8.87 m/s²');
          say('  surface      462 °C · 92 bar · CO2 96.5%');
          say('  rotation     243.025 d <span class="e">retrograde</span>');
          say('  year         224.701 d   <span class="d">— its day is longer than its year</span>');
          say('  synodic      583.92 d    <span class="d">— the phase cycle you see on the dial</span>');
        },
        open: function (a) {
          if (!a) return say('<span class="e">  open what? try: globe phase clouds coin refs</span>');
          if (!window.VENUSOS.apps[a]) return say('<span class="e">  no such app: ' + a + '</span>');
          window.VENUSOS.open(a);
          say('  launching ' + a + '…');
        },
        view: function (a) {
          if (a !== 'surface' && a !== 'space') {
            return say('<span class="e">  usage: view surface | view space</span>');
          }
          window.VENUSOS.setView(a, true);
          say('  switching to ' + a.toUpperCase() + ' view…');
        },
        saver: function () {
          if (window.VENUSSAVER) { say('  dimming the lights…'); window.VENUSSAVER.start(); }
          else say('<span class="e">  no screensaver module loaded</span>');
        },
        vesper: function () {
          if (window.VESPER) { window.VESPER.toggle(); say('  VESPER acknowledged.'); }
          else say('<span class="e">  no mascot module loaded</span>');
        },
        seed: function () {
          say('  reseeding terrain…');
          say('<span class="d">  (the wallpaper generator rebuilds on reload — try `location.reload()`)</span>');
        },
        credits: function () {
          say('  chassis      HOFFMAN-TACTICAL / Tactical-OS 96');
          say('  instruments  dragonfruit-drive / the FX rack');
          say('  dial         knox-lux / Avant Meridian moonphase');
          say('  wireframe    INFINITEPARALLEL / the CAD field-strip');
          say('  terrain      after NASA/JPL Magellan PIA00107');
        },
        clear: function () { out.innerHTML = ''; }
      };

      inp.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        var raw = inp.value.trim();
        inp.value = '';
        if (!raw) return;
        say('<span class="u">V:\\&gt; ' + raw.replace(/</g, '&lt;') + '</span>');
        var bits = raw.split(/\s+/);
        var fn = CMDS[bits[0].toLowerCase()];
        if (fn) fn(bits[1]);
        else say('<span class="e">  bad command: ' + bits[0].replace(/</g, '&lt;') + '</span>');
      });
      setTimeout(function () { inp.focus(); }, 60);
      return null;
    }
  };

  /* =========================================================================
   * $VENUS — the token sheet. Deliberately unfilled: this is a scaffold, and
   * inventing a supply or an address would be worse than an empty field.
   * =======================================================================*/
  var coin = {
    icon: '◈', title: '$VENUS', w: 600, h: 500,
    mount: function (node) {
      node.appendChild(h(
        '<div class="app">' +
          '<div class="app-head"><span class="h-title">TOKEN SHEET</span>' +
            '<span class="spacer"></span><span class="h-sub">DRAFT</span></div>' +
          '<div class="app-body">' +
            '<div class="notice"><span class="ni">⚠</span><span><b>Draft sheet.</b> ' +
              'Nothing on this site quotes a price, and unfilled slots stay blank ' +
              'until they are true.</span></div>' +
            '<div class="prose">' +
              '<h2>Contract</h2>' +
              '<span class="placeholder" id="venus-ca" style="cursor:pointer" ' +
                'title="Click to copy"><b>CONTRACT ADDRESS · CLICK TO COPY</b>' +
                '0x5460b5E88799D27bbdf8A210926C17Dec18d7777</span>' +
              '<span class="placeholder"><b>CHAIN</b>BNB Smart Chain (BEP-20)</span>' +
              '<span class="placeholder"><b>EMITS</b>XAUt (Tether Gold) — RWA rewards, see INFO / FAQ</span>' +
              '<h2>Supply</h2>' +
              '<table class="spec">' +
                '<tr><th>Total supply</th><td class="n">—</td></tr>' +
                '<tr><th>Circulating</th><td class="n">—</td></tr>' +
                '<tr><th>Liquidity</th><td class="n">—</td></tr>' +
                '<tr><th>Team / locked</th><td class="n">—</td></tr>' +
                '<tr><th>Tax</th><td class="n">—</td></tr>' +
              '</table>' +
              '<h2>The name</h2>' +
              '<p>Venus is the brightest thing in the sky after the Sun and the Moon, ' +
              'and the only planet whose <strong>phases</strong> you can watch from Earth — the ' +
              'observation that broke the geocentric model. It is also 462 °C and raining ' +
              'sulfuric acid. Pick whichever half of that you want the brand to mean.</p>' +
              '<h2>Where things go</h2>' +
              '<p>Buy links, chart embeds and socials mount as their own desktop icons ' +
              'rather than as a nav bar — the OS <em>is</em> the navigation. Add them to ' +
              '<code>js/apps.js</code> and they appear on the desktop and in the Start menu ' +
              'automatically.</p>' +
            '</div>' +
          '</div>' +
        '</div>'
      ));
      var ca = node.querySelector('#venus-ca');
      ca.addEventListener('click', function () {
        var addr = '0x5460b5E88799D27bbdf8A210926C17Dec18d7777';
        var done = function () {
          var b = ca.querySelector('b');
          b.textContent = 'CONTRACT ADDRESS · COPIED ✓';
          setTimeout(function () { b.textContent = 'CONTRACT ADDRESS · CLICK TO COPY'; }, 1400);
        };
        if (navigator.clipboard) navigator.clipboard.writeText(addr).then(done, function () {});
      });
      return null;
    }
  };

  /* =========================================================================
   * SOURCES — the provenance sheet. Every cue, traced.
   * =======================================================================*/
  var refs = {
    icon: '❋', title: 'SOURCES', w: 620, h: 480,
    mount: function (node) {
      node.appendChild(h(
        '<div class="app">' +
          '<div class="app-head"><span class="h-title">DESIGN PROVENANCE</span></div>' +
          '<div class="app-body"><div class="prose">' +
            '<p>Four repositories, one planet. Nothing here is a mood board — each ' +
            'reference contributed working code, ported and re-hued.</p>' +
            '<table class="spec">' +
              '<tr><th>HOFFMAN-TACTICAL</th><td>Tactical-OS 96 — boot, desktop, window manager, ' +
                'taskbar, Start. <code>retro.css</code> / <code>retro.js</code> / <code>apps96.*</code>. ' +
                'Grey chrome re-hued to brass.</td></tr>' +
              '<tr><th>dragonfruit-drive</th><td>The instrument language — rack cards, labelled ' +
                'knobs, glowing gradient buttons, canvas wells. <code>src/style.css</code> + ' +
                '<code>livecode.css</code>. Plum/pink rotated to night/gold.</td></tr>' +
              '<tr><th>knox-lux</th><td>The complication — <code>moonphase-3d.tsx</code>, its fluted ' +
                'bezel, navy dial and real-ephemeris terminator. Re-aimed from the Moon to ' +
                'Venus and re-expressed in 2D canvas.</td></tr>' +
              '<tr><th>INFINITEPARALLEL</th><td>The wireframe — <code>rig.js</code> / ' +
                '<code>rifle.js</code> CAD kernel: projection, field-strip explode, hover ' +
                'callouts. Rifle parts became planetary shells. Also the "Blue &amp; Gold" ' +
                'Avant Meridian palette.</td></tr>' +
              '<tr><th>NASA / JPL</th><td>Terrain after Magellan <code>PIA00107</code> (Sapas Mons, ' +
                'Atla Regio). Generated procedurally here; drop the plate at ' +
                '<code>assets/hero-terrain.jpg</code> and it takes over. Public domain.</td></tr>' +
            '</table>' +
            '<h2>Rules that hold it together</h2>' +
            '<p><strong>Square chassis, round instruments.</strong> OS chrome never gets a ' +
            'border-radius; app interiors always do. <strong>Gold is structure, sulfur is ' +
            'data, ember is heat and warnings.</strong> <strong>Everything moving is ' +
            'computed</strong> — there is not one texture or sprite in this repository.</p>' +
          '</div></div>' +
        '</div>'
      ));
      return null;
    }
  };

  return { globe: globe, phase: phase, clouds: clouds, term: term, coin: coin, refs: refs };
})());
