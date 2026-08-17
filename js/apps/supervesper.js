/* =============================================================================
 * supervesper.js — SUPER VESPER. The flagship.
 *
 * A side-scrolling platformer in the classic 8-bit grammar, starring VESPER
 * the probe. Everything is generated: sprites are pixel arrays painted to
 * offscreen canvases at boot, music is a two-channel WebAudio chiptune, and
 * the three worlds are ASCII maps you can read and edit right here.
 *
 * The feel is the engineering: fixed 120 Hz physics steps, coyote time,
 * jump buffering, variable jump height, skid friction, camera look-ahead,
 * squash & stretch, particles, screen shake, checkpoints, invincibility
 * flicker. No library, no assets, one file.
 *
 * Controls — ◀ ▶ / A D: run · SPACE / Z / W: jump (hold = higher) ·
 * X / K: plasma (with the SULFUR CORE) · touch pads on coarse pointers.
 * ===========================================================================*/

(function () {
  'use strict';

  var h = window.VENUSKIT.h;

  /* ---- world constants (px; one tile = 16) -------------------------------- */
  var T = 16, ROWS = 14;
  var GRAV = 830, JUMP = 322, JUMP_CUT = 0.45;
  var ACCEL = 900, FRICTION = 780, MAXRUN = 158;
  var COYOTE = 0.09, BUFFER = 0.12;
  var STEP = 1 / 120;

  var PAL = {
    '.': null, 'k': '#0a0702', 'K': '#241a0a', 'g': '#ffc83d', 'G': '#b8862a',
    'h': '#ffe9a8', 's': '#f4e04d', 'e': '#ff7a2f', 'r': '#c2410c',
    'c': '#cdb07c', 'w': '#f5ecd8', 'n': '#101b33', 'b': '#7fb2ff', 'd': '#6a4f21'
  };

  /* ---- sprite factory ------------------------------------------------------ */
  function sprite(rows) {
    var w = rows[0].length, hh = rows.length;
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = hh;
    var x = cv.getContext('2d');
    for (var y = 0; y < hh; y++) for (var i = 0; i < w; i++) {
      var col = PAL[rows[y][i]];
      if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); }
    }
    return cv;
  }
  function flip(cv) {
    var f = document.createElement('canvas');
    f.width = cv.width; f.height = cv.height;
    var x = f.getContext('2d');
    x.translate(cv.width, 0); x.scale(-1, 1); x.drawImage(cv, 0, 0);
    return f;
  }

  var SPR = {};
  function buildSprites() {
    /* VESPER — 14×14 gold probe with an eye and an antenna */
    SPR.idle = sprite([
      '.....gg.......',
      '.....gg.......',
      '....hgg.......',
      '..kGGGGGGk....',
      '.kGggggggGk...',
      '.kGghhgggGk...',
      '.kGghhgggGk...',
      '.kGggggggGk...',
      '.kGGGGGGGGk...',
      '..kGggggGk....',
      '...kkkkkk.....',
      '..kG....Gk....',
      '..kG....Gk....',
      '..kk....kk....'
    ]);
    SPR.run1 = sprite([
      '.....gg.......',
      '.....gg.......',
      '....hgg.......',
      '..kGGGGGGk....',
      '.kGggggggGk...',
      '.kGghhgggGk...',
      '.kGghhgggGk...',
      '.kGggggggGk...',
      '.kGGGGGGGGk...',
      '..kGggggGk....',
      '...kkkkkk.....',
      '..kG..Gk......',
      '...kG..Gk.....',
      '...kk...kk....'
    ]);
    SPR.run2 = sprite([
      '.....gg.......',
      '.....gg.......',
      '....hgg.......',
      '..kGGGGGGk....',
      '.kGggggggGk...',
      '.kGghhgggGk...',
      '.kGghhgggGk...',
      '.kGggggggGk...',
      '.kGGGGGGGGk...',
      '..kGggggGk....',
      '...kkkkkk.....',
      '....kGGk......',
      '...kG..Gk.....',
      '..kk....kk....'
    ]);
    SPR.jump = sprite([
      '.....gg.......',
      '.....gg.......',
      '....hgg.......',
      '..kGGGGGGk....',
      '.kGggggggGk...',
      '.kGghhgggGk...',
      '.kGghhgggGk...',
      '.kGggggggGk...',
      '.kGGGGGGGGk...',
      '..kGggggGk....',
      '...kkkkkk.....',
      '..kG.ee.Gk....',
      '..k..ee...k...',
      '.....ss.......'
    ]);
    ['idle', 'run1', 'run2', 'jump'].forEach(function (k) { SPR[k + 'L'] = flip(SPR[k]); });

    /* BLOB — acid droplet walker */
    SPR.blob1 = sprite([
      '....ssss....',
      '..ssssssss..',
      '.ssssssssss.',
      '.ssksssksss.',
      'sssssssssss.',
      'ssssskkssss.',
      '.ssssssssss.',
      '..ss..ss....'
    ]);
    SPR.blob2 = sprite([
      '....ssss....',
      '..ssssssss..',
      '.ssssssssss.',
      '.ssksssksss.',
      'sssssssssss.',
      'ssssskkssss.',
      '.ssssssssss.',
      '....ss..ss..'
    ]);
    /* URCHIN — spiky, unstompable */
    SPR.spiky = sprite([
      '..e..ee..e..',
      '.eereereeree',
      '..rrrrrrrr..',
      'eerrkrrkrree',
      '..rrrrrrrr..',
      'eerrrrrrrree',
      '..rr.rr.rr..',
      '.e...e....e.'
    ]);
    /* TURRET */
    SPR.turret = sprite([
      '....kGGk....',
      '...kGggGk...',
      '...kGggGk...',
      '..kGGGGGGk..',
      '.kGggggggGk.',
      '.kGgrrrrgGk.',
      '.kGggggggGk.',
      '.kGGGGGGGGk.'
    ]);
    SPR.fireball = sprite(['..ee..', '.eree.', 'eresre', 'eresre', '.eree.', '..ee..']);
    SPR.plasma = sprite(['.ss.', 'shhs', 'shhs', '.ss.']);

    /* coin — 4 spin frames */
    SPR.coin = [sprite([
      '..gggg..', '.gghhgg.', '.gh..hg.', '.gh..hg.', '.gh..hg.', '.gh..hg.', '.gghhgg.', '..gggg..'
    ]), sprite([
      '...gg...', '..ghhg..', '..gh.g..', '..gh.g..', '..gh.g..', '..gh.g..', '..ghhg..', '...gg...'
    ]), sprite([
      '...gg...', '...gg...', '...gg...', '...gg...', '...gg...', '...gg...', '...gg...', '...gg...'
    ]), sprite([
      '...gg...', '..hg.g..', '..hg.g..', '..hg.g..', '..hg.g..', '..hg.g..', '..hg.g..', '...gg...'
    ])];
    SPR.xaut = sprite([
      '.kkkkkkkkkkk.', 'kghhhhhhhhhgk', 'kghggggggghgk', 'kghgXAUTgghgk'.replace(/[XAUT]/g, 'h'),
      'kghggggggghgk', 'kghhhhhhhhhgk', '.kkkkkkkkkkk.'
    ]);
    SPR.core = sprite([   /* shield powerup */
      '...cccc...', '..chhhhc..', '.chggggh..', '.chgnngh..', '.chgnngh..', '.chggggh..', '..chhhhc..', '...cccc...'
    ]);
    SPR.flower = sprite([ /* sulfur core = the gun */
      '..s..s..', '.sesses.', '..ssss..', 'ssseesss', '..ssss..', '.sesses.', '..s..s..', '...GG...'
    ]);

    /* tiles */
    SPR.ground = sprite([
      'GGGGGGGGGGGGGGGG', 'GggggggggggggggG', 'GgKKKKKKKKKKKKgG', 'GgKddddddddddKgG',
      'GgKddddddddddKgG', 'GgKddddddddddKgG', 'GgKddddddddddKgG', 'GgKddddddddddKgG',
      'GgKddddddddddKgG', 'GgKddddddddddKgG', 'GgKddddddddddKgG', 'GgKddddddddddKgG',
      'GgKddddddddddKgG', 'GgKKKKKKKKKKKKgG', 'GggggggggggggggG', 'GGGGGGGGGGGGGGGG'
    ]);
    SPR.brick = sprite([
      'cccccccccccccccc'.slice(0, 16), 'cGGGGGGGcGGGGGGc', 'cGGGGGGGcGGGGGGc', 'cGGGGGGGcGGGGGGc',
      'cccccccccccccccc', 'cGGGcGGGGGGGcGGc', 'cGGGcGGGGGGGcGGc', 'cGGGcGGGGGGGcGGc',
      'cccccccccccccccc', 'cGGGGGGGcGGGGGGc', 'cGGGGGGGcGGGGGGc', 'cGGGGGGGcGGGGGGc',
      'cccccccccccccccc', 'cGGGcGGGGGGGcGGc', 'cGGGcGGGGGGGcGGc', 'cccccccccccccccc'
    ]);
    SPR.qblock = sprite([
      'hhhhhhhhhhhhhhhh', 'hggggggggggggggh', 'hgghhhhhhhhhggkh', 'hgghggggggghggkh',
      'hgghgg..gghhggkh'.replace(/\./g, 'g'), 'hggggggghhgggkkh', 'hgggggghhggggkkh', 'hgggggghhggggkkh',
      'hgggggghhggggkkh', 'hggggggggggggkkh', 'hgggggghhggggkkh', 'hgggggghhggggkkh',
      'hggggggggggggkkh', 'hgkkkkkkkkkkkkkh', 'hkkkkkkkkkkkkkkh', 'hhhhhhhhhhhhhhhh'
    ]);
    SPR.used = sprite([
      'KKKKKKKKKKKKKKKK', 'KddddddddddddddK', 'KdKKKKKKKKKKKKdK', 'KdKddddddddddKdK',
      'KdKddddddddddKdK', 'KdKddddddddddKdK', 'KdKddddddddddKdK', 'KdKddddddddddKdK',
      'KdKddddddddddKdK', 'KdKddddddddddKdK', 'KdKddddddddddKdK', 'KdKddddddddddKdK',
      'KdKddddddddddKdK', 'KdKKKKKKKKKKKKdK', 'KddddddddddddddK', 'KKKKKKKKKKKKKKKK'
    ]);
    SPR.vent = sprite([
      'GhhGGGGGGGGGGhhG', 'GhhggggggggghhgG'.slice(0, 16), 'GhhGGGGGGGGGGhhG', 'GhgGGGGGGGGGGghG',
      'GhgGGGGGGGGGGghG', 'GhgGGGGGGGGGGghG', 'GhgGGGGGGGGGGghG', 'GhgGGGGGGGGGGghG',
      'GhgGGGGGGGGGGghG', 'GhgGGGGGGGGGGghG', 'GhgGGGGGGGGGGghG', 'GhgGGGGGGGGGGghG',
      'GhgGGGGGGGGGGghG', 'GhgGGGGGGGGGGghG', 'GhgGGGGGGGGGGghG', 'GhgGGGGGGGGGGghG'
    ]);
    SPR.spike = sprite([
      '.......e........', '......eee.......', '.....eeree......', '....eerree......',
      '...eerrrree.....', '..eerrrrrree....', '.eerrrrrrrree...', 'eerrrrrrrrrree..',
      '.......e........', '......eee.......', '..e..eeree..e...', '.eeeeerreeeeee..',
      'eerrrrrrrrrrree.', 'eerrrrrrrrrrree.', 'eerrrrrrrrrrree.', 'eerrrrrrrrrrree.'
    ]);
    SPR.lava = sprite([
      '.ee..s..ee..s...', 'eesseesseesseess'.slice(0, 16), 'seeesseeesseeess'.slice(0, 16), 'eeeeeeeeeeeeeeee',
      'ereeereeereeeree', 'rrerrrerrrerrrer', 'rrrrrrrrrrrrrrrr', 'rrrrrrrrrrrrrrrr',
      'rrrrrrrrrrrrrrrr', 'rrrrrrrrrrrrrrrr', 'rrrrrrrrrrrrrrrr', 'rrrrrrrrrrrrrrrr',
      'rrrrrrrrrrrrrrrr', 'rrrrrrrrrrrrrrrr', 'rrrrrrrrrrrrrrrr', 'rrrrrrrrrrrrrrrr'
    ]);
    SPR.plat = sprite([
      'hhhhhhhhhhhhhhhh', 'gggggggggggggggg', 'GGGGGGGGGGGGGGGG', 'KKKKKKKKKKKKKKKK'
    ]);
  }

  /* ---- chiptune ------------------------------------------------------------ */
  function Chip() {
    var ac = null, muted = false, musicTimer = null, stepIdx = 0;
    function ctx() {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      return ac;
    }
    function tone(freq, dur, type, vol, slide) {
      if (muted || !freq) return;
      var a = ctx(), o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
      g.gain.setValueAtTime(vol || 0.05, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(a.destination);
      o.start(t); o.stop(t + dur + 0.02);
    }
    function noise(dur, vol) {
      if (muted) return;
      var a = ctx(), n = a.sampleRate * dur | 0, buf = a.createBuffer(1, n, a.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      var src = a.createBufferSource(), g = a.createGain();
      g.gain.value = vol || 0.06;
      src.buffer = buf; src.connect(g); g.connect(a.destination); src.start();
    }
    var N = function (s) { return 440 * Math.pow(2, s / 12); };
    /* an original bouncy loop, A minor pentatonic, 32 steps of 8ths @ 152bpm */
    var LEAD = [0, null, 3, null, 7, null, 12, null, 10, null, 7, null, 3, null, 5, null,
                0, null, 3, null, 7, 10, 12, null, 15, null, 12, null, 10, 7, 5, 3];
    var BASS = [-24, null, -24, null, -17, null, -17, null, -19, null, -19, null, -12, null, -14, null,
                -24, null, -24, null, -17, null, -17, null, -19, null, -19, null, -12, -14, -12, null];
    function startMusic() {
      if (musicTimer) return;
      var stepMs = 60000 / 152 / 2;
      musicTimer = setInterval(function () {
        if (muted || document.hidden) return;
        var l = LEAD[stepIdx], b = BASS[stepIdx];
        if (l !== null) tone(N(l), 0.09, 'square', 0.022);
        if (b !== null) tone(N(b), 0.16, 'triangle', 0.05);
        stepIdx = (stepIdx + 1) % LEAD.length;
      }, stepMs);
    }
    function stopMusic() { clearInterval(musicTimer); musicTimer = null; }
    return {
      start: startMusic, stop: stopMusic,
      mute: function (m) { muted = m; },
      jump: function () { tone(300, 0.14, 'square', 0.05, 260); },
      coin: function () { tone(N(15), 0.06, 'square', 0.05); setTimeout(function () { tone(N(19), 0.14, 'square', 0.05); }, 55); },
      stomp: function () { noise(0.12, 0.08); },
      brick: function () { noise(0.2, 0.1); tone(140, 0.1, 'square', 0.04, -60); },
      power: function () { [0, 4, 7, 12, 16].forEach(function (s, i) { setTimeout(function () { tone(N(s), 0.09, 'square', 0.045); }, i * 60); }); },
      hurt: function () { tone(220, 0.25, 'sawtooth', 0.06, -160); },
      die: function () { stopMusic(); [12, 7, 3, 0, -5, -12].forEach(function (s, i) { setTimeout(function () { tone(N(s), 0.16, 'square', 0.05); }, i * 110); }); },
      shoot: function () { tone(700, 0.08, 'sawtooth', 0.03, -300); },
      flag: function () { stopMusic(); [0, 4, 7, 12, 16, 19, 24].forEach(function (s, i) { setTimeout(function () { tone(N(s), 0.13, 'square', 0.05); }, i * 90); }); },
      oneup: function () { [7, 12, 16, 19, 24].forEach(function (s, i) { setTimeout(function () { tone(N(s), 0.1, 'triangle', 0.06); }, i * 80); }); },
      kill: function () { stopMusic(); if (ac) { try { ac.close(); } catch (e) {} ac = null; } }
    };
  }

  /* ---- levels ---------------------------------------------------------------
   * 14 rows. Legend: # ground · = brick · ? q-coin · S q-shield · F q-gun ·
   * H vent · ^ spike · ~ lava · - one-way platform · M moving platform ·
   * o coin · X XAUt bar (1UP) · g blob · s urchin · t turret · C checkpoint ·
   * P start · E end antenna.
   * -------------------------------------------------------------------------*/
  var LEVELS = [
  { name: 'ATLA REGIO', sky: ['#241a0a', '#120d04'], rows: [
    '                                                                                                                                                        ',
    '                                                                                                                                                        ',
    '                                                      o o o                                                                        o o                  ',
    '                                                                                                     =?=                                          E     ',
    '                  ?                                  =====                  o o o                                                 =====                  ',
    '                                                                                                  o                                                     ',
    '            = = S =                 oo               H                    =======         =F=          =====                 s                          ',
    '                                   ====             HH         oo                                                     o                                 ',
    '      o                                            HHH        ====   g            g                =        =       ooo      ======                    ',
    '                    g        g                    HHHH                                     C                                                 g          ',
    '  P                                    g          HHHH    g                  g                     g   g        t          g          g                 ',
    '#################################  ###########  #######################################  ##############################  ######################   #####',
    '#################################  ###########  #######################################  ##############################  ######################   #####',
    '#################################  ###########  #######################################  ##############################  ######################   #####'
  ]},
  { name: 'LAVA CHANNELS', sky: ['#1d0d04', '#0a0501'], rows: [
    '                                                                                                                                                        ',
    '                                                                                                                                                        ',
    '                o o o                                 X                                                o o o                                            ',
    '               =======                              ===== =                                          =======                              E             ',
    '                                                                        o o                                                                            ',
    '        ?                        F                =         =                        S                            =?=                                   ',
    '                                ===                           =       =====                      -----                                                  ',
    '   P        g                                =                  =              t          C                 -----      s        g   g                   ',
    '  ####    ######   oo    =====                  t                                       ####     s                                        ooo     ######',
    '  ####    ######  ####          ==                             ==    ========    ==    #####  ========    ==    ==   ======   ==========        ########',
    '  ####    ######  ####               g     ==       ==   ==                            #####                                                    ########',
    '  ####    ######  ####  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  #####  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  ########',
    '  ####    ######  ####  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  #####  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  ########',
    '  ####    ######  ####  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  #####  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  ########'
  ]},
  { name: 'CLOUD DECK', sky: ['#3a2408', '#181004'], rows: [
    '                                                                                          o                                                            ',
    '                                       o o                                 oo            ooo                       X                                    ',
    '              ?                                        S            -----          -----------                  ======            o o o          E     ',
    '            =====        oo         -------                                                                                                            ',
    '                                                 M           M                 s                    F                    M                             ',
    '    P              -----                                                    --------           ---------                         =======               ',
    '   ###     g                  g                          o                                                            s                                 ',
    '  #####      -----      ----------       ---       oo         ---                     g                     ------------------            g       #####',
    ' #######                                                                        ------------                                          #########  ######',
    '#########           s                    ###   g        =====        ---                                -                            ##########  ######',
    '#########      ----------        g      #####      ^^^         ^^^^        ^^                  ^^^^^                     ^^^^^^^    ###########  ######',
    '#########^^^^^#############^^^^^^^^^^^#########################################################################^^^^^^^^############################### ',
    '######################################################################################################################################################  ',
    '###################################################################################################################################################### '
  ]}];

  /* ---- the app --------------------------------------------------------------*/
  window.VENUSAPPS = window.VENUSAPPS || {};
  window.VENUSAPPS.supervesper = {
    icon: '🚀', title: 'SUPER VESPER', w: 820, h: 620,
    mount: function (node) {
      buildSprites();
      var chip = Chip();

      node.appendChild(h(
        '<div class="app">' +
          '<div class="app-head"><span class="h-title">SUPER VESPER</span>' +
            '<span class="spacer"></span>' +
            '<button class="ghost" data-a="mute">♪ ON</button></div>' +
          '<div class="stage"><canvas tabindex="0"></canvas>' +
            '<div class="hint">◀▶ RUN · SPACE JUMP (HOLD = HIGHER) · X PLASMA</div>' +
            '<div class="pads" style="position:absolute;inset:auto 0 0 0;display:none;justify-content:space-between;padding:10px;pointer-events:none">' +
              '<div style="display:flex;gap:8px;pointer-events:auto">' +
                '<button data-p="l" style="width:54px;height:54px;font-size:20px;opacity:.75">◀</button>' +
                '<button data-p="r" style="width:54px;height:54px;font-size:20px;opacity:.75">▶</button></div>' +
              '<div style="display:flex;gap:8px;pointer-events:auto">' +
                '<button data-p="x" style="width:54px;height:54px;font-size:16px;opacity:.75">X</button>' +
                '<button data-p="j" style="width:54px;height:54px;font-size:16px;opacity:.75">A</button></div>' +
            '</div>' +
          '</div>' +
          '<div class="app-foot"><span data-f="best">—</span><span class="spacer"></span>' +
            '<span>AN ORIGINAL HOMAGE. NO PLUMBERS WERE HARMED.</span></div>' +
        '</div>'
      ));

      var cv = node.querySelector('canvas'), ctx = cv.getContext('2d');
      var root = node.firstChild;
      var fBest = node.querySelector('[data-f="best"]');
      var best = 0;
      try { best = +localStorage.getItem('venus-supervesper-best') || 0; } catch (e) {}
      showBest();
      function showBest() { fBest.textContent = best ? 'HI-SCORE ' + best : ''; }

      /* mute */
      var muteBtn = node.querySelector('[data-a="mute"]');
      var muted = false;
      muteBtn.addEventListener('click', function () {
        muted = !muted; chip.mute(muted);
        muteBtn.textContent = muted ? '♪ OFF' : '♪ ON';
      });

      /* ---- input ---- */
      var keys = { l: false, r: false, j: false, x: false };
      var jumpBuf = 0, jHeld = false;
      function keymap(k) {
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') return 'l';
        if (k === 'ArrowRight' || k === 'd' || k === 'D') return 'r';
        if (k === ' ' || k === 'z' || k === 'w' || k === 'ArrowUp' || k === 'Z' || k === 'W') return 'j';
        if (k === 'x' || k === 'k' || k === 'X' || k === 'K') return 'x';
        return null;
      }
      root.setAttribute('tabindex', '0');
      root.addEventListener('keydown', function (e) {
        var m = keymap(e.key);
        if (!m) return;
        e.preventDefault();
        if (m === 'j' && !keys.j) { jumpBuf = BUFFER; chip.start(); }
        keys[m] = true;
        if (m === 'j') jHeld = true;
      });
      root.addEventListener('keyup', function (e) {
        var m = keymap(e.key);
        if (!m) return;
        keys[m] = false;
        if (m === 'j') jHeld = false;
      });
      cv.addEventListener('pointerdown', function () { cv.focus(); });

      /* touch pads on coarse pointers */
      if (matchMedia('(pointer: coarse)').matches) {
        node.querySelector('.pads').style.display = 'flex';
        node.querySelectorAll('[data-p]').forEach(function (b) {
          var m = { l: 'l', r: 'r', j: 'j', x: 'x' }[b.dataset.p];
          b.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            if (m === 'j') { jumpBuf = BUFFER; jHeld = true; chip.start(); }
            keys[m] = true;
          });
          b.addEventListener('pointerup', function () { keys[m] = false; if (m === 'j') jHeld = false; });
          b.addEventListener('pointerleave', function () { keys[m] = false; if (m === 'j') jHeld = false; });
        });
      }

      /* ---- level state ---- */
      var G = {};   /* the whole game state bag */

      function loadLevel(idx, keepScore) {
        var L = LEVELS[idx];
        var W = 0;
        L.rows.forEach(function (r) { W = Math.max(W, r.length); });
        G.levelIdx = idx;
        G.name = L.name; G.sky = L.sky;
        G.w = W; G.grid = [];
        G.ents = []; G.parts = []; G.shots = [];
        G.checkpoint = null;
        if (!keepScore) { G.score = 0; G.coins = 0; G.lives = 3; }
        G.time = 300; G.hurry = false;
        G.shake = 0; G.freeze = 0;
        G.state = 'play';

        for (var y = 0; y < ROWS; y++) {
          G.grid[y] = [];
          var row = L.rows[y] || '';
          for (var x = 0; x < W; x++) {
            var c = row[x] || ' ';
            var t = 0;
            if (c === '#') t = 1;
            else if (c === '=') t = 2;
            else if (c === '?') t = 3;
            else if (c === 'S') t = 4;
            else if (c === 'F') t = 5;
            else if (c === 'H') t = 7;
            else if (c === '^') t = 9;
            else if (c === '~') t = 10;
            else if (c === '-') t = 12;
            else if (c === 'o') spawn('coin', x, y);
            else if (c === 'X') spawn('xaut', x, y);
            else if (c === 'g') spawn('blob', x, y);
            else if (c === 's') spawn('spiky', x, y);
            else if (c === 't') spawn('turret', x, y);
            else if (c === 'M') spawn('plat', x, y);
            else if (c === 'C') spawn('check', x, y);
            else if (c === 'E') spawn('pole', x, y);
            else if (c === 'P') { G.px = x * T; G.py = y * T; }
            G.grid[y][x] = t;
          }
        }
        resetPlayer();
      }

      function resetPlayer() {
        var p = G.checkpoint || { x: G.px, y: G.py };
        G.player = {
          x: p.x, y: p.y, vx: 0, vy: 0, w: 10, h: 13,
          face: 1, ground: false, coyote: 0, anim: 0,
          shield: false, gun: false, inv: 0, squash: 0, dead: 0
        };
        G.cam = Math.max(0, G.player.x - 100);
      }

      function spawn(kind, x, y) {
        var e = { kind: kind, x: x * T, y: y * T, vx: 0, vy: 0, w: 12, h: 12, dir: -1, t: 0, dead: false };
        if (kind === 'blob') { e.vx = -34; e.h = 8; e.y += 8; }
        if (kind === 'spiky') { e.vx = -26; e.h = 8; e.y += 8; }
        if (kind === 'turret') { e.w = 12; e.h = 8; e.y += 8; }
        if (kind === 'coin') { e.w = 8; e.h = 8; e.y += 4; e.x += 4; }
        if (kind === 'xaut') { e.w = 13; e.h = 7; e.y += 5; }
        if (kind === 'plat') { e.w = 48; e.h = 4; e.x0 = e.x; e.range = 56; e.vx = 28; }
        if (kind === 'check') { e.w = 4; e.h = 16; }
        if (kind === 'pole') { e.w = 6; e.h = ROWS * T; e.y = 0; }
        G.ents.push(e);
        return e;
      }

      /* ---- tile helpers ---- */
      function tileAt(px, py) {
        var x = Math.floor(px / T), y = Math.floor(py / T);
        if (x < 0 || x >= G.w) return 1;
        if (y < 0) return 0;
        if (y >= ROWS) return 0;
        return G.grid[y][x];
      }
      function solid(t) { return t === 1 || t === 2 || t === 3 || t === 4 || t === 5 || t === 6 || t === 7; }

      function moveX(e, dx) {
        e.x += dx;
        var dir = dx > 0 ? 1 : -1;
        var edge = dir > 0 ? e.x + e.w : e.x;
        for (var y = e.y; y < e.y + e.h; y += T / 2) {
          if (solid(tileAt(edge, y)) || solid(tileAt(edge, e.y + e.h - 1))) {
            e.x = dir > 0 ? Math.floor(edge / T) * T - e.w - 0.01 : Math.floor(edge / T) * T + T + 0.01;
            return true;
          }
        }
        return false;
      }
      function moveY(e, dy, oneway) {
        e.y += dy;
        if (dy > 0) {
          var bottom = e.y + e.h;
          for (var x = e.x; x <= e.x + e.w - 1; x += Math.min(T / 2, e.w - 1)) {
            var t = tileAt(x, bottom), t2 = tileAt(e.x + e.w - 1, bottom);
            var hit = solid(t) || solid(t2);
            var ow = (t === 12 || t2 === 12) && oneway && (bottom - dy) <= Math.floor(bottom / T) * T + 1;
            if (hit || ow) { e.y = Math.floor(bottom / T) * T - e.h - 0.01; return 1; }
          }
        } else if (dy < 0) {
          for (var x2 = e.x; x2 <= e.x + e.w - 1; x2 += Math.min(T / 2, e.w - 1)) {
            if (solid(tileAt(x2, e.y)) || solid(tileAt(e.x + e.w - 1, e.y))) {
              var ty = Math.floor(e.y / T);
              e.y = ty * T + T + 0.01;
              return -1;
            }
          }
        }
        return 0;
      }

      function bumpBlock(px, py) {
        var x = Math.floor(px / T), y = Math.floor(py / T);
        if (x < 0 || x >= G.w || y < 0 || y >= ROWS) return;
        var t = G.grid[y][x];
        if (t === 2) {
          G.grid[y][x] = 0; chip.brick(); G.shake = 3; addScore(50);
          for (var i = 0; i < 6; i++) particle(x * T + 8, y * T + 8, (Math.random() - 0.5) * 160, -Math.random() * 200, '#cdb07c', 3);
        } else if (t === 3) {
          G.grid[y][x] = 6; chip.coin(); addCoin(x * T + 4, y * T - 8);
        } else if (t === 4 || t === 5) {
          G.grid[y][x] = 6; chip.power();
          var pu = spawn(t === 4 ? 'core' : 'flower', x, y - 1);
          pu.w = 10; pu.h = 10;
        }
      }

      function addScore(n) { G.score += n; }
      function addCoin(x, y) {
        G.coins++; addScore(100);
        if (G.coins % 100 === 0) { G.lives++; chip.oneup(); }
        particle(x, y, 0, -120, '#ffe9a8', 2);
        for (var i = 0; i < 4; i++) particle(x, y, (Math.random() - 0.5) * 90, -Math.random() * 130, '#ffc83d', 2);
      }
      function particle(x, y, vx, vy, col, size) {
        if (G.parts.length > 120) G.parts.shift();
        G.parts.push({ x: x, y: y, vx: vx, vy: vy, col: col, size: size, life: 0.6 });
      }

      function hurt() {
        var p = G.player;
        if (p.inv > 0 || p.dead) return;
        if (p.gun) { p.gun = false; p.inv = 1.4; chip.hurt(); }
        else if (p.shield) { p.shield = false; p.inv = 1.4; chip.hurt(); }
        else die();
      }
      function die() {
        var p = G.player;
        if (p.dead) return;
        p.dead = 0.0001; p.vy = -260; chip.die();
        G.lives--;
      }

      /* ---- fixed-step update ---- */
      function update(dt) {
        var p = G.player;
        if (G.freeze > 0) { G.freeze -= dt; return; }

        if (G.state === 'win') {
          p.x += 40 * dt; p.anim += dt * 10;
          G.winT -= dt;
          if (G.winT <= 0) {
            if (G.levelIdx + 1 < LEVELS.length) { loadLevel(G.levelIdx + 1, true); chip.start(); }
            else {
              G.state = 'victory';
              if (G.score > best) { best = G.score; try { localStorage.setItem('venus-supervesper-best', String(best)); } catch (e) {} showBest(); }
            }
          }
          return;
        }
        if (G.state !== 'play') return;

        G.time -= dt;
        if (G.time < 60 && !G.hurry) { G.hurry = true; }
        if (G.time <= 0 && !p.dead) die();

        /* --- player --- */
        if (p.dead) {
          p.dead += dt; p.vy += GRAV * dt; p.y += p.vy * dt;
          if (p.dead > 1.6) {
            if (G.lives <= 0) {
              G.state = 'gameover';
              if (G.score > best) { best = G.score; try { localStorage.setItem('venus-supervesper-best', String(best)); } catch (e) {} showBest(); }
            } else { G.time = 300; G.hurry = false; resetPlayer(); }
          }
        } else {
          var want = (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
          if (want !== 0) {
            p.vx += want * ACCEL * dt;
            /* skid dust when reversing hard */
            if (p.ground && want * p.vx < 0 && Math.abs(p.vx) > 90) particle(p.x + 5, p.y + p.h, -want * 40, -30, '#cdb07c', 2);
            p.face = want;
          } else {
            var f = FRICTION * dt;
            if (Math.abs(p.vx) <= f) p.vx = 0; else p.vx -= Math.sign(p.vx) * f;
          }
          p.vx = Math.max(-MAXRUN, Math.min(MAXRUN, p.vx));

          jumpBuf -= dt;
          p.coyote = p.ground ? COYOTE : p.coyote - dt;
          if (jumpBuf > 0 && p.coyote > 0) {
            p.vy = -JUMP; p.ground = false; p.coyote = 0; jumpBuf = 0;
            p.squash = -0.25; chip.jump();
          }
          if (!jHeld && p.vy < 0) p.vy *= (1 - (1 - JUMP_CUT) * dt * 18);

          p.vy = Math.min(430, p.vy + GRAV * dt);

          moveX(p, p.vx * dt);
          var wasAir = !p.ground;
          var hitY = moveY(p, p.vy * dt, true);
          if (hitY === 1) {
            if (wasAir) {
              p.squash = 0.3;
              if (p.vy > 300) { G.shake = Math.min(4, p.vy / 130); }
              for (var i = 0; i < 3; i++) particle(p.x + 5, p.y + p.h, (Math.random() - 0.5) * 80, -Math.random() * 60, '#8a6f3e', 2);
            }
            p.ground = true; p.vy = 0;
          } else if (hitY === -1) {
            bumpBlock(p.x + p.w / 2, p.y - 2);
            p.vy = 20;
          } else if (Math.abs(p.vy) > 12) p.ground = false;

          /* hazards under/around */
          var cx = p.x + p.w / 2, cyB = p.y + p.h - 1;
          var under = tileAt(cx, cyB + 2), at = tileAt(cx, p.y + p.h / 2);
          if (under === 9 && p.ground) hurt();
          if (at === 10 || tileAt(cx, cyB) === 10) die();
          if (p.y > ROWS * T + 40) die();

          p.inv = Math.max(0, p.inv - dt);
          p.squash *= (1 - dt * 9);
          p.anim += Math.abs(p.vx) * dt * 0.14;

          /* shoot */
          if (keys.x && p.gun && !p.shotHeld) {
            p.shotHeld = true;
            if (G.shots.length < 2) {
              G.shots.push({ x: p.x + (p.face > 0 ? p.w : -4), y: p.y + 5, vx: p.face * 265, life: 1.1 });
              chip.shoot();
            }
          }
          if (!keys.x) p.shotHeld = false;
        }

        /* --- shots --- */
        for (var si = G.shots.length - 1; si >= 0; si--) {
          var sh = G.shots[si];
          sh.x += sh.vx * dt; sh.life -= dt;
          if (sh.life <= 0 || solid(tileAt(sh.x + 2, sh.y + 2))) { G.shots.splice(si, 1); continue; }
        }

        /* --- entities --- */
        for (var ei = G.ents.length - 1; ei >= 0; ei--) {
          var e = G.ents[ei];
          if (e.dead) { G.ents.splice(ei, 1); continue; }
          e.t += dt;

          if (e.kind === 'blob' || e.kind === 'spiky') {
            if (Math.abs(e.x - p.x) > 420) continue;   /* sleep far offscreen */
            e.vy = Math.min(400, (e.vy || 0) + GRAV * dt);
            if (moveX(e, e.vx * dt)) e.vx = -e.vx;
            if (moveY(e, e.vy * dt) === 1) e.vy = 0;
            /* turn at ledges */
            if (e.vy === 0 && !solid(tileAt(e.x + (e.vx > 0 ? e.w + 2 : -2), e.y + e.h + 2))) e.vx = -e.vx;
            if (e.y > ROWS * T + 20) { e.dead = true; continue; }
          } else if (e.kind === 'turret') {
            if (Math.abs(e.x - p.x) < 340 && e.t > 2.8) {
              e.t = 0;
              var d = Math.sign(p.x - e.x) || 1;
              G.ents.push({ kind: 'fire', x: e.x + 2, y: e.y - 6, vx: d * 90, vy: -210, w: 6, h: 6, t: 0, dead: false });
            }
          } else if (e.kind === 'fire') {
            e.vy += GRAV * 0.55 * dt;
            e.x += e.vx * dt; e.y += e.vy * dt;
            if (e.y > ROWS * T + 20) e.dead = true;
          } else if (e.kind === 'plat') {
            e.x += e.vx * dt;
            if (Math.abs(e.x - e.x0) > e.range) { e.vx = -e.vx; e.x = e.x0 + Math.sign(e.x - e.x0) * e.range; }
            /* carry the player */
            if (!p.dead && p.vy >= 0 && p.y + p.h <= e.y + 6 && p.y + p.h >= e.y - 6 &&
                p.x + p.w > e.x && p.x < e.x + e.w) {
              p.y = e.y - p.h; p.vy = 0; p.ground = true; p.coyote = COYOTE;
              p.x += e.vx * dt;
            }
          } else if (e.kind === 'core' || e.kind === 'flower') {
            e.vy = Math.min(200, (e.vy || 0) + GRAV * 0.5 * dt);
            if (moveY(e, e.vy * dt) === 1) e.vy = 0;
          }

          /* player contact */
          if (!p.dead && !e.dead &&
              p.x < e.x + e.w && p.x + p.w > e.x && p.y < e.y + e.h && p.y + p.h > e.y) {
            if (e.kind === 'coin') { e.dead = true; chip.coin(); addCoin(e.x, e.y); }
            else if (e.kind === 'xaut') { e.dead = true; G.lives++; addScore(2000); chip.oneup();
              for (var xi = 0; xi < 8; xi++) particle(e.x + 6, e.y + 3, (Math.random() - 0.5) * 170, -Math.random() * 180, '#ffe9a8', 2); }
            else if (e.kind === 'core') { e.dead = true; p.shield = true; chip.power(); addScore(500); }
            else if (e.kind === 'flower') { e.dead = true; p.gun = true; p.shield = true; chip.power(); addScore(500); }
            else if (e.kind === 'check') { if (!e.hit) { e.hit = true; G.checkpoint = { x: e.x, y: e.y - 4 }; chip.coin(); } }
            else if (e.kind === 'pole') {
              if (G.state === 'play') {
                G.state = 'win'; G.winT = 2.4; chip.flag();
                addScore(Math.max(200, Math.round(G.time) * 10));
              }
            }
            else if (e.kind === 'blob') {
              if (p.vy > 60 && p.y + p.h - e.y < 10) {
                e.dead = true; p.vy = -200; jumpBuf = 0; chip.stomp(); addScore(200); G.freeze = 0.03; G.shake = 2;
                for (var bi = 0; bi < 5; bi++) particle(e.x + 6, e.y + 4, (Math.random() - 0.5) * 140, -Math.random() * 120, '#f4e04d', 2);
              } else hurt();
            }
            else if (e.kind === 'spiky' || e.kind === 'fire') hurt();
          }

          /* shots vs enemies */
          if (e.kind === 'blob' || e.kind === 'spiky' || e.kind === 'fire') {
            for (var sj = G.shots.length - 1; sj >= 0; sj--) {
              var s2 = G.shots[sj];
              if (s2.x < e.x + e.w && s2.x + 4 > e.x && s2.y < e.y + e.h && s2.y + 4 > e.y) {
                e.dead = true; G.shots.splice(sj, 1); chip.stomp(); addScore(200);
                for (var pi = 0; pi < 5; pi++) particle(e.x + 6, e.y + 4, (Math.random() - 0.5) * 150, -Math.random() * 130, '#f4e04d', 2);
              }
            }
          }
        }

        /* --- particles / camera --- */
        for (var qi = G.parts.length - 1; qi >= 0; qi--) {
          var q = G.parts[qi];
          q.life -= dt; q.vy += GRAV * 0.6 * dt;
          q.x += q.vx * dt; q.y += q.vy * dt;
          if (q.life <= 0) G.parts.splice(qi, 1);
        }
        var lookahead = p.face * 34;
        var target = p.x - VIEW_W() * 0.42 + lookahead;
        G.cam += (target - G.cam) * Math.min(1, dt * 5);
        G.cam = Math.max(0, Math.min(G.w * T - VIEW_W(), G.cam));
        G.shake = Math.max(0, G.shake - dt * 14);
      }

      /* ---- render ---- */
      var dpr = 1, scale = 3;
      function VIEW_W() { return cv.width / scale; }
      function resize() {
        var r = cv.getBoundingClientRect();
        dpr = Math.min(devicePixelRatio || 1, 2);
        cv.width = Math.max(1, Math.round(r.width * dpr));
        cv.height = Math.max(1, Math.round(r.height * dpr));
        scale = cv.height / (ROWS * T);
      }
      resize(); addEventListener('resize', resize);

      function render() {
        var W = cv.width, H = cv.height;
        var p = G.player;
        ctx.imageSmoothingEnabled = false;

        /* sky */
        var g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, G.sky[0]); g.addColorStop(1, G.sky[1]);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

        var shx = G.shake ? (Math.random() - 0.5) * G.shake * scale : 0;
        var shy = G.shake ? (Math.random() - 0.5) * G.shake * scale : 0;

        ctx.save();
        ctx.scale(scale, scale);
        ctx.translate(-G.cam + shx / scale, shy / scale);

        /* parallax: stars + far cloud bands */
        ctx.save();
        ctx.translate(G.cam * 0.7, 0);
        for (var st = 0; st < 40; st++) {
          var sx2 = (st * 53.7) % (VIEW_W() + 40), sy2 = (st * 37.3) % 90;
          ctx.globalAlpha = 0.25 + (st % 5) * 0.1;
          ctx.fillStyle = '#e8e2d2';
          ctx.fillRect(sx2, sy2, 1, 1);
        }
        ctx.globalAlpha = 0.12; ctx.fillStyle = '#f4e04d';
        for (var cb = 0; cb < 4; cb++) {
          var by = 26 + cb * 22 + Math.sin(Date.now() / 4000 + cb) * 3;
          ctx.fillRect(-20, by, VIEW_W() + 60, 5 - cb);
        }
        ctx.globalAlpha = 1;
        ctx.restore();

        /* tiles in view */
        var x0 = Math.max(0, Math.floor(G.cam / T) - 1);
        var x1 = Math.min(G.w, Math.ceil((G.cam + VIEW_W()) / T) + 1);
        for (var y = 0; y < ROWS; y++) for (var x = x0; x < x1; x++) {
          var t = G.grid[y][x];
          if (!t) continue;
          var img = t === 1 ? SPR.ground : t === 2 ? SPR.brick : t === 3 || t === 4 || t === 5 ? SPR.qblock :
                    t === 6 ? SPR.used : t === 7 ? SPR.vent : t === 9 ? SPR.spike :
                    t === 10 ? SPR.lava : t === 12 ? SPR.plat : null;
          if (img) ctx.drawImage(img, x * T, y * T);
        }

        /* entities */
        G.ents.forEach(function (e) {
          if (e.dead) return;
          if (e.kind === 'coin') ctx.drawImage(SPR.coin[Math.floor(Date.now() / 110 + e.x) % 4], e.x, e.y);
          else if (e.kind === 'xaut') ctx.drawImage(SPR.xaut, e.x, e.y);
          else if (e.kind === 'blob') ctx.drawImage(Math.floor(Date.now() / 160) % 2 ? SPR.blob1 : SPR.blob2, e.x, e.y - 0);
          else if (e.kind === 'spiky') ctx.drawImage(SPR.spiky, e.x, e.y);
          else if (e.kind === 'turret') ctx.drawImage(SPR.turret, e.x, e.y);
          else if (e.kind === 'fire') ctx.drawImage(SPR.fireball, e.x, e.y);
          else if (e.kind === 'core') ctx.drawImage(SPR.core, e.x + 2, e.y + 3);
          else if (e.kind === 'flower') ctx.drawImage(SPR.flower, e.x + 3, e.y + 4);
          else if (e.kind === 'plat') ctx.drawImage(SPR.plat, e.x, e.y);
          else if (e.kind === 'check') {
            ctx.fillStyle = e.hit ? '#ffc83d' : '#6a4f21';
            ctx.fillRect(e.x, e.y - 8, 2, 24);
            ctx.fillStyle = e.hit ? '#f4e04d' : '#4a3517';
            ctx.fillRect(e.x + 2, e.y - 8, 7, 5);
          } else if (e.kind === 'pole') {
            ctx.fillStyle = '#cdb07c'; ctx.fillRect(e.x + 2, 16, 2, ROWS * T - 32);
            ctx.fillStyle = '#ffc83d'; ctx.fillRect(e.x - 4, 16, 14, 3);
            ctx.beginPath(); ctx.arc(e.x + 3, 12, 4, 0, 7); ctx.fillStyle = '#ffe9a8'; ctx.fill();
          }
        });

        /* shots */
        G.shots.forEach(function (s) { ctx.drawImage(SPR.plasma, s.x, s.y); });

        /* particles */
        G.parts.forEach(function (q) {
          ctx.globalAlpha = Math.max(0, q.life / 0.6);
          ctx.fillStyle = q.col;
          ctx.fillRect(q.x, q.y, q.size, q.size);
        });
        ctx.globalAlpha = 1;

        /* player */
        if (p && !(p.inv > 0 && Math.floor(Date.now() / 80) % 2)) {
          var img2 = !p.ground ? SPR.jump : Math.abs(p.vx) > 12 ? (Math.floor(p.anim) % 2 ? SPR.run1 : SPR.run2) : SPR.idle;
          if (p.face < 0) img2 = !p.ground ? SPR.jumpL : Math.abs(p.vx) > 12 ? (Math.floor(p.anim) % 2 ? SPR.run1L : SPR.run2L) : SPR.idleL;
          var sq = p.squash || 0;
          ctx.save();
          ctx.translate(p.x + p.w / 2, p.y + p.h);
          ctx.scale(1 - sq * 0.5, 1 + sq);
          if (p.shield) {
            ctx.strokeStyle = 'rgba(205,176,124,.55)';
            ctx.beginPath(); ctx.arc(0, -7, 10, 0, 7); ctx.stroke();
          }
          ctx.drawImage(img2, -7, -14);
          ctx.restore();
        }
        ctx.restore();

        /* HUD */
        ctx.fillStyle = 'rgba(10,7,2,.55)';
        ctx.fillRect(0, 0, W, 22 * dpr);
        ctx.fillStyle = '#ffe9a8';
        ctx.font = '700 ' + 11 * dpr + 'px ui-monospace,monospace';
        ctx.textAlign = 'left';
        ctx.fillText('VESPER ×' + G.lives, 10 * dpr, 15 * dpr);
        ctx.fillText('◈ ' + G.coins, 110 * dpr, 15 * dpr);
        ctx.textAlign = 'center';
        ctx.fillText(G.name + '  ' + (G.levelIdx + 1) + '-' + LEVELS.length, W / 2, 15 * dpr);
        ctx.textAlign = 'right';
        ctx.fillStyle = G.hurry && Math.floor(Date.now() / 400) % 2 ? '#ff7a2f' : '#ffe9a8';
        ctx.fillText('⏱ ' + Math.max(0, Math.ceil(G.time)), W - 90 * dpr, 15 * dpr);
        ctx.fillStyle = '#ffe9a8';
        ctx.fillText(String(G.score).padStart(6, '0'), W - 10 * dpr, 15 * dpr);

        /* overlays */
        if (G.state === 'title' || G.state === 'gameover' || G.state === 'victory') {
          ctx.fillStyle = 'rgba(10,7,2,.66)'; ctx.fillRect(0, 0, W, H);
          ctx.textAlign = 'center';
          ctx.fillStyle = '#fff';
          ctx.save();
          ctx.translate(W / 2, H * 0.38);
          ctx.transform(1, 0, -0.14, 1, 0, 0);
          ctx.font = 'italic 900 ' + W * 0.055 + 'px "Arial Black",ui-sans-serif,system-ui';
          ctx.lineWidth = W * 0.004; ctx.strokeStyle = '#241a0a';
          var word = G.state === 'gameover' ? 'GAME OVER' : G.state === 'victory' ? 'PLANET CLEAR!' : 'SUPER VESPER';
          ctx.shadowColor = '#ffc83d'; ctx.shadowBlur = 30;
          ctx.strokeText(word, 0, 0); ctx.shadowBlur = 0; ctx.fillText(word, 0, 0);
          ctx.restore();
          ctx.fillStyle = '#cdb07c';
          ctx.font = W * 0.014 + 'px ui-monospace,monospace';
          if (G.state === 'victory') {
            ctx.fillText('FINAL SCORE ' + G.score + '  ·  THE EVENING STAR THANKS YOU', W / 2, H * 0.5);
          } else if (G.state === 'gameover') {
            ctx.fillText('SCORE ' + G.score, W / 2, H * 0.5);
          } else {
            ctx.fillText('◀▶ RUN · SPACE JUMP · STOMP THE BLOBS · 100 COINS = 1UP', W / 2, H * 0.5);
          }
          ctx.fillStyle = Math.floor(Date.now() / 500) % 2 ? '#ffc83d' : '#6a4f21';
          ctx.fillText('PRESS JUMP TO ' + (G.state === 'title' ? 'START' : 'PLAY AGAIN'), W / 2, H * 0.58);
        }
      }

      /* ---- main loop: fixed steps, capped ---- */
      G.state = 'title';
      loadLevel(0); G.state = 'title';
      var accum = 0;
      var stop = window.VENUSKIT.loop(function (dt) {
        if (!cv.offsetParent) return;
        if (G.state === 'title' || G.state === 'gameover' || G.state === 'victory') {
          if (jumpBuf > 0) {
            jumpBuf = 0;
            loadLevel(0);
            chip.start();
          }
          render();
          return;
        }
        accum = Math.min(0.1, accum + dt / 1000);
        while (accum >= STEP) { update(STEP); accum -= STEP; }
        render();
      });

      return function () { stop(); chip.kill(); };
    }
  };
})();
