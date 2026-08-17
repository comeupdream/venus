/* =============================================================================
 * amp.js — VENERAMP. A WebAudio drone sonifying live Venus data. The drone's
 * base pitch follows today's real illumination; a 4-minute LFO mirrors the
 * 243-day retrograde spin (scaled ×1000); a tremolo plays the 4-day
 * superrotation. No sound until POWER — autoplay is rude.
 * ===========================================================================*/

(function () {
  'use strict';

  var h = window.VENUSKIT.h;

  window.VENUSAPPS = window.VENUSAPPS || {};
  window.VENUSAPPS.amp = {
    icon: '♒', title: 'VENERAMP', w: 560, h: 520, desktop: false,
    mount: function (node) {
      var ph = window.VENUSPHASE.venusPhase(new Date());
      var baseHz = 55 + ph.illumination * 55;

      node.appendChild(h(
        '<div class="app">' +
          '<div class="app-head"><span class="h-title">PLANETARY DRONE</span>' +
            '<span class="spacer"></span>' +
            '<button class="genbtn" data-a="pow">▶ POWER</button></div>' +
          '<div class="app-body">' +
            '<canvas class="well" style="height:130px"></canvas>' +
            '<div class="rack" style="margin-top:12px">' +
              '<div class="card"><div class="card-head"><span class="idx">1</span><span class="title">Volume</span></div>' +
                '<div class="knob"><div class="row"><span class="name">gain</span><span class="val"></span></div>' +
                '<input type="range" data-k="vol" min="0" max="100" value="35"></div></div>' +
              '<div class="card"><div class="card-head"><span class="idx">2</span><span class="title">Turbulence</span>' +
                '<span class="tag">CENTS</span></div>' +
                '<div class="knob"><div class="row"><span class="name">detune</span><span class="val"></span></div>' +
                '<input type="range" data-k="det" min="0" max="50" value="14"></div></div>' +
              '<div class="card"><div class="card-head"><span class="idx">3</span><span class="title">Superrotation</span>' +
                '<span class="tag">4 d</span></div>' +
                '<div class="knob"><div class="row"><span class="name">tremolo</span><span class="val"></span></div>' +
                '<input type="range" data-k="trem" min="5" max="200" value="45"></div></div>' +
            '</div>' +
            '<div class="notice" style="margin-top:12px"><span class="ni">♒</span><span>' +
              'DRONE <b>' + baseHz.toFixed(1) + ' Hz</b> — Venus is ' + (ph.illumination * 100).toFixed(1) +
              '% lit right now. Filter sweeps once per 4.05 min: the 243-day retrograde day, ×1000.</span></div>' +
          '</div>' +
          '<div class="app-foot"><span>THE PLANET, AS AN INSTRUMENT. HEADPHONES ADVISED.</span></div>' +
        '</div>'
      ));

      var cv = node.querySelector('canvas'), ctx2d = cv.getContext('2d');
      var K = { vol: 35, det: 14, trem: 45 };
      node.querySelectorAll('[data-k]').forEach(function (r) {
        var sync = function () {
          K[r.dataset.k] = +r.value;
          r.closest('.knob').querySelector('.val').textContent = r.value;
          applyKnobs();
        };
        r.addEventListener('input', sync); sync();
      });

      var ac = null, oscs = [], gain = null, filt = null, lfo = null, lfoGain = null,
          trem = null, tremGain = null, analyser = null, on = false;
      var powBtn = node.querySelector('[data-a="pow"]');

      function applyKnobs() {
        if (!ac) return;
        gain.gain.setTargetAtTime(K.vol / 100 * 0.22, ac.currentTime, 0.06);
        oscs.forEach(function (o, i) { o.detune.setTargetAtTime((i - 1) * K.det, ac.currentTime, 0.06); });
        trem.frequency.setTargetAtTime(K.trem / 100, ac.currentTime, 0.1);
      }

      function power() {
        if (on) {
          gain.gain.setTargetAtTime(0, ac.currentTime, 0.12);
          on = false; powBtn.textContent = '▶ POWER';
          return;
        }
        if (!ac) {
          ac = new (window.AudioContext || window.webkitAudioContext)();
          gain = ac.createGain(); gain.gain.value = 0;
          filt = ac.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 420; filt.Q.value = 4;
          analyser = ac.createAnalyser(); analyser.fftSize = 1024;

          [0, 1, 2].forEach(function (i) {
            var o = ac.createOscillator();
            o.type = i === 1 ? 'sawtooth' : 'triangle';
            o.frequency.value = baseHz * (i === 2 ? 2 : 1);
            o.connect(filt); o.start(); oscs.push(o);
          });

          /* retrograde LFO: 243 d → 4.05 min per sweep */
          lfo = ac.createOscillator(); lfo.frequency.value = 1 / 243;
          lfoGain = ac.createGain(); lfoGain.gain.value = 260;
          lfo.connect(lfoGain); lfoGain.connect(filt.frequency); lfo.start();

          /* superrotation tremolo */
          trem = ac.createOscillator(); trem.frequency.value = 0.45;
          tremGain = ac.createGain(); tremGain.gain.value = 0.05;
          trem.connect(tremGain); tremGain.connect(gain.gain); trem.start();

          filt.connect(gain); gain.connect(analyser); analyser.connect(ac.destination);
        }
        ac.resume();
        on = true; powBtn.textContent = '■ MUTE';
        applyKnobs();
      }
      powBtn.addEventListener('click', power);

      var buf = new Uint8Array(512);
      var stop = window.VENUSKIT.loop(function () {
        if (!cv.offsetParent) return;
        var r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
        if (cv.width !== (r.width * dpr | 0)) { cv.width = r.width * dpr; cv.height = r.height * dpr; }
        var W = cv.width, H = cv.height;
        ctx2d.fillStyle = '#0a0702'; ctx2d.fillRect(0, 0, W, H);
        ctx2d.strokeStyle = '#f4e04d'; ctx2d.lineWidth = 1.6 * dpr; ctx2d.beginPath();
        if (analyser && on) {
          analyser.getByteTimeDomainData(buf);
          for (var i = 0; i < buf.length; i++) {
            var x = i / buf.length * W, y = (buf[i] / 255) * H;
            i ? ctx2d.lineTo(x, y) : ctx2d.moveTo(x, y);
          }
        } else {
          ctx2d.moveTo(0, H / 2); ctx2d.lineTo(W, H / 2);
        }
        ctx2d.stroke();
      });

      return function () {
        stop();
        if (ac) { try { ac.close(); } catch (e) {} }
      };
    }
  };
})();
