/* =============================================================================
 * fx.js — the delight layer. OS sounds, CRT mode, the Konami gold rain, and
 * the Gold Screen of Death. All optional, all persisted, all off the render
 * hot path.
 * ===========================================================================*/

window.VENUSFX = (function () {
  'use strict';

  /* ---- sounds: tiny square-wave OS blips, muteable, gesture-gated ---------- */
  var ac = null, soundOn = true;
  try { soundOn = localStorage.getItem('venus-sound') !== 'off'; } catch (e) {}

  function ctx() {
    if (!ac) {
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function blip(freq, dur, type, vol, slide) {
    if (!soundOn) return;
    var a = ctx(); if (!a) return;
    var o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(vol || 0.03, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  var SFX = {
    open:  function () { blip(520, 0.07, 'square', 0.025, 180); },
    close: function () { blip(420, 0.08, 'square', 0.025, -160); },
    min:   function () { blip(300, 0.09, 'triangle', 0.03, -120); },
    focus: function () { blip(660, 0.03, 'square', 0.012); },
    chime: function () { [440, 554, 659, 880].forEach(function (f, i) {
              setTimeout(function () { blip(f, 0.22, 'triangle', 0.035); }, i * 110); }); },
    ding:  function () { blip(880, 0.1, 'triangle', 0.04); setTimeout(function () { blip(1318, 0.2, 'triangle', 0.04); }, 90); },
    error: function () { blip(160, 0.2, 'sawtooth', 0.04, -60); }
  };
  function sound(name) { if (SFX[name]) SFX[name](); }
  function setSound(on) {
    soundOn = on;
    try { localStorage.setItem('venus-sound', on ? 'on' : 'off'); } catch (e) {}
    if (on) sound('ding');
  }

  /* ---- CRT mode ------------------------------------------------------------ */
  var crtOn = false;
  try { crtOn = localStorage.getItem('venus-crt') === 'on'; } catch (e) {}
  var crtEl = null;
  function applyCrt() {
    document.body.classList.toggle('crt', crtOn);
    if (crtOn && !crtEl) {
      crtEl = document.createElement('div');
      crtEl.id = 'crtfx';
      crtEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(crtEl);
    }
    if (crtEl) crtEl.style.display = crtOn ? 'block' : 'none';
  }
  function setCrt(on) {
    crtOn = on;
    try { localStorage.setItem('venus-crt', on ? 'on' : 'off'); } catch (e) {}
    applyCrt();
    if (on) sound('open');
  }
  addEventListener('DOMContentLoaded', applyCrt);
  if (document.readyState !== 'loading') applyCrt();

  /* ---- Konami gold rain ------------------------------------------------------
     ↑↑↓↓←→←→BA anywhere on the desktop. Six seconds of falling coins. */
  var SEQ = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
             'ArrowLeft', 'ArrowRight', 'b', 'a'];
  var seqAt = 0, raining = false;

  addEventListener('keydown', function (e) {
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    seqAt = (k === SEQ[seqAt]) ? seqAt + 1 : (k === SEQ[0] ? 1 : 0);
    if (seqAt === SEQ.length) {
      seqAt = 0;
      goldRain();
      if (window.VENUSACH) window.VENUSACH.unlock('konami');
    }
  });

  function goldRain() {
    if (raining) return;
    raining = true;
    sound('chime');
    var cv = document.createElement('canvas');
    cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:9400;pointer-events:none';
    document.body.appendChild(cv);
    var x = cv.getContext('2d');
    var dpr = Math.min(devicePixelRatio || 1, 2);
    var W = cv.width = innerWidth * dpr, H = cv.height = innerHeight * dpr;
    var coins = [], i;
    for (i = 0; i < 220; i++) {
      coins.push({ x: Math.random() * W, y: -Math.random() * H, v: (140 + Math.random() * 320) * dpr,
                   r: (3 + Math.random() * 6) * dpr, w: Math.random() * 6.28, ws: 2 + Math.random() * 5 });
    }
    var t0 = performance.now(), last = t0;
    (function rain(now) {
      var dt = Math.min(64, now - last) / 1000; last = now;
      var alive = now - t0 < 6000;
      x.clearRect(0, 0, W, H);
      coins.forEach(function (c2) {
        c2.y += c2.v * dt; c2.w += c2.ws * dt;
        if (c2.y > H + 20 && alive) { c2.y = -20; c2.x = Math.random() * W; }
        if (c2.y > H + 20) return;
        var squish = Math.abs(Math.cos(c2.w));
        x.save(); x.translate(c2.x, c2.y); x.scale(squish, 1);
        x.fillStyle = '#ffc83d'; x.beginPath(); x.arc(0, 0, c2.r, 0, 7); x.fill();
        x.strokeStyle = '#b8862a'; x.lineWidth = dpr; x.stroke();
        x.fillStyle = '#ffe9a8'; x.beginPath(); x.arc(-c2.r * 0.3, -c2.r * 0.3, c2.r * 0.3, 0, 7); x.fill();
        x.restore();
      });
      if (alive || coins.some(function (c2) { return c2.y < H + 20; })) requestAnimationFrame(rain);
      else { cv.remove(); raining = false; }
    })(t0);
  }

  /* ---- Gold Screen of Death --------------------------------------------------
     The classic, in brand. VDOS knows how to summon it. Any key revives. */
  function gsod(reason) {
    sound('error');
    var o = document.createElement('div');
    o.id = 'gsod';
    o.innerHTML =
      '<div class="g-wrap"><div class="g-badge">VENUS</div>' +
      '<p>A problem has been detected and VENUS-OS has been halted to protect your bag:</p>' +
      '<p class="g-code">' + (reason || 'GOLD_OVERFLOW_EXCEPTION') + '</p>' +
      '<p>* The gold kept accruing beyond addressable memory.<br>' +
      '* 92 bar of pressure detected in the swap buffer.<br>' +
      '* Do NOT sell to fix this. It is not fixable by selling.</p>' +
      '<p>Technical information:</p>' +
      '<p class="g-code">*** STOP: 0x00000462 (0xC02, 0x5460b5E8, 0xAU79, 0x7777)</p>' +
      '<p class="g-blink">Press any key to re-enter the atmosphere…</p></div>';
    document.body.appendChild(o);
    if (window.VENUSACH) window.VENUSACH.unlock('gsod');
    function out(e) {
      e.preventDefault();
      removeEventListener('keydown', out, true);
      o.removeEventListener('pointerdown', out);
      o.remove();
      sound('chime');
    }
    setTimeout(function () {
      addEventListener('keydown', out, true);
      o.addEventListener('pointerdown', out);
    }, 400);
  }

  return {
    sound: sound,
    soundOn: function () { return soundOn; },
    setSound: setSound,
    crtOn: function () { return crtOn; },
    setCrt: setCrt,
    goldRain: goldRain,
    gsod: gsod
  };
})();
