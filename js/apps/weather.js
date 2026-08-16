/* =============================================================================
 * weather.js — WEATHER.EXE
 *
 * The daily surface forecast for Atla Regio. The joke writes itself: Venus has
 * the most stable weather in the solar system, so the forecast is always 462°
 * and always right. The daily jitter (±0.4 °C) comes from mulberry32 seeded
 * with today's UTC date, so every visitor sees the same forecast all day and
 * a new one at midnight — same seeded-noise discipline as terrain.js.
 *
 * SOL is the Venus solar day: 116.75 Earth days sunrise-to-sunrise (the
 * 243.025 d retrograde spin beating against the 224.701 d year), counted from
 * J2000. The cloud strip up top is the CLOUD LAB technique shrunk to a band.
 *
 * Registers itself onto window.VENUSAPPS; built with window.VENUSKIT.
 * ===========================================================================*/

window.VENUSAPPS = window.VENUSAPPS || {};
window.VENUSAPPS.weather = (function () {
  'use strict';

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* UTC date, so the whole planet Earth gets one forecast per day */
  function todayUTC() {
    var d = new Date();
    return {
      seed: d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate(),
      iso: d.toISOString().slice(0, 10)
    };
  }

  /* the same cheap hash noise the cloud lab uses, cut to two octaves */
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
  function fbm2(x, y, s) {
    return sn(x, y, s) * 0.62 + sn(x * 2.3, y * 2.3, s + 7) * 0.38;
  }

  return {
    icon: '☁', title: 'WEATHER.EXE', w: 520, h: 560,
    mount: function (node) {
      var KIT = window.VENUSKIT;
      var day = todayUTC();
      var rnd = mulberry32(day.seed);

      /* ---- the forecast. Real numbers, seeded wobble. ---- */
      var temp  = (462 + (rnd() - 0.5) * 0.8).toFixed(1);     /* 462 ± 0.4 °C  */
      var bar   = (92.1 + (rnd() - 0.5) * 0.2).toFixed(1);    /* 92.1 ± 0.1    */
      var windS = (1 + rnd()).toFixed(1);                     /* 1–2 m/s       */
      var windC = Math.round(300 + rnd() * 100);              /* 300–400 km/h  */
      var sol = Math.floor((Date.now() - Date.UTC(2000, 0, 1, 12)) / 86400000 / 116.75);

      var style = document.createElement('style');
      style.textContent =
        '.wxa-strip{height:120px;image-rendering:auto}' +
        '.wxa-loc{font-family:var(--mono);font-size:10px;letter-spacing:.22em;color:var(--dim)}' +
        '.wxa-temp{font-family:var(--mono);font-size:46px;font-weight:800;color:var(--gold);' +
          'letter-spacing:.02em;text-shadow:var(--glow-gold);line-height:1.1;margin:4px 0 2px}' +
        '.wxa-temp small{font-size:20px;color:var(--gold-deep);font-weight:700}' +
        '.wxa-claim{font-family:var(--mono);font-size:9.5px;letter-spacing:.18em;color:var(--faint)}' +
        '.wxa-lab{font-family:var(--mono);font-size:10px;letter-spacing:.2em;color:var(--dim);margin:14px 0 6px}' +
        '.wxa-lab b{color:var(--sulfur);font-weight:700}' +
        '.wxa-row{display:flex;gap:8px}' +
        '.wxa-day{flex:1;text-align:center;padding:9px 2px;background:var(--panel-2);' +
          'border:1px solid var(--line);border-radius:8px}' +
        '.wxa-day .c{font-size:17px;line-height:1}' +
        '.wxa-day .t{font-family:var(--mono);font-size:11px;color:var(--gold);margin-top:5px}' +
        '.wxa-day .s{font-family:var(--mono);font-size:8.5px;letter-spacing:.14em;color:var(--dim);margin-top:3px}';
      document.head.appendChild(style);

      var outlook = '';
      for (var i = 1; i <= 5; i++) {
        outlook +=
          '<div class="wxa-day"><div class="c">☁</div><div class="t">462°</div>' +
            '<div class="s">SOL+' + i + '</div></div>';
      }

      node.appendChild(KIT.h(
        '<div class="app">' +
          '<div class="app-head">' +
            '<span class="h-title">SURFACE FORECAST</span>' +
            '<span class="spacer"></span>' +
            '<button class="genbtn" data-a="export">⤓ EXPORT CARD</button>' +
          '</div>' +
          '<div class="app-body">' +
            '<canvas class="well wxa-strip"></canvas>' +
            '<div class="card wide" style="margin-top:14px">' +
              '<div class="wxa-loc">ATLA REGIO · SOL ' + sol + ' · ' + day.iso + '</div>' +
              '<div class="wxa-temp">' + temp + '<small> °C</small></div>' +
              '<div class="wxa-claim">THE MOST STABLE WEATHER IN THE SOLAR SYSTEM</div>' +
            '</div>' +
            '<table class="spec" style="margin-top:14px">' +
              '<tr><th>PRESSURE</th><td class="n">' + bar + ' bar</td></tr>' +
              '<tr><th>WIND · SURFACE</th><td class="n">' + windS + ' m/s</td></tr>' +
              '<tr><th>WIND · CLOUD DECK (65 KM)</th><td class="n">' + windC + ' km/h</td></tr>' +
              '<tr><th>HUMIDITY</th><td class="n">0% (sulfuric acid does not count)</td></tr>' +
              '<tr><th>VISIBILITY</th><td class="n">0 KM — PERMANENT OVERCAST</td></tr>' +
              '<tr><th>UV INDEX</th><td class="n">irrelevant below the clouds</td></tr>' +
            '</table>' +
            '<div class="wxa-lab">5-SOL OUTLOOK · <b>OUTLOOK: CONFIDENT</b></div>' +
            '<div class="wxa-row">' + outlook + '</div>' +
          '</div>' +
          '<div class="app-foot">' +
            '<span>SEED <b>' + day.seed + '</b></span>' +
            '<span data-f="phase">—</span>' +
          '</div>' +
        '</div>'
      ));

      /* ---- the live line: how Venus looks from Earth right now ---- */
      var phaseEl = node.querySelector('[data-f="phase"]');
      function phaseLine() {
        var p = window.VENUSPHASE.venusPhase(new Date());
        phaseEl.innerHTML = 'EARTH VIEWING CONDITIONS: <b>' +
          (p.illumination * 100).toFixed(0) + '% ILLUMINATED, ' +
          (p.evening ? 'EVENING' : 'MORNING') + ' SKY</b>';
      }
      phaseLine();

      /* ---- the cloud band: 2-octave seeded noise, scrolled ---- */
      var cv = node.querySelector('.wxa-strip');
      var ctx = cv.getContext('2d');
      var IW = 240, IH = 60;
      cv.width = IW; cv.height = IH;
      var img = ctx.createImageData(IW, IH);
      var t = 0, phaseAge = 0;

      var stop = KIT.loop(function (dt) {
        t += dt * 0.00016;                        /* superrotation, in miniature */
        phaseAge += dt;
        if (phaseAge > 60000) { phaseAge = 0; phaseLine(); }

        var d = img.data, p = 0;
        for (var y = 0; y < IH; y++) {
          var band = 0.72 + 0.28 * Math.sin(Math.PI * y / IH);   /* soft vignette */
          for (var x = 0; x < IW; x++) {
            var v = fbm2(x / IW * 6 + t * (1 + y / IH * 0.8), y / IH * 2.2, day.seed % 97);
            v *= band;
            d[p++] = Math.min(255, 140 + v * 115);
            d[p++] = Math.min(255, 96 + v * 112);
            d[p++] = 16 + v * 42;
            d[p++] = 255;
          }
        }
        ctx.putImageData(img, 0, 0);
      });

      /* ---- EXPORT CARD: the forecast as a shareable PNG, drawn cold ---- */
      node.querySelector('[data-a="export"]').addEventListener('click', function () {
        var c = document.createElement('canvas');
        c.width = 800; c.height = 418;
        var x = c.getContext('2d');
        var MONO = 'ui-monospace, Menlo, Consolas, monospace';

        x.fillStyle = '#0a0702'; x.fillRect(0, 0, 800, 418);
        x.strokeStyle = '#b8862a'; x.lineWidth = 1;
        x.strokeRect(16.5, 16.5, 767, 385);
        x.strokeStyle = '#4a3517';
        x.strokeRect(22.5, 22.5, 755, 373);

        x.fillStyle = '#ffc83d';
        x.font = '700 15px ' + MONO;
        x.fillText('VENUS-OS / WEATHER.EXE', 44, 58);
        x.textAlign = 'right';
        x.fillText(day.iso + ' UTC', 756, 58);
        x.textAlign = 'left';

        x.fillStyle = '#b09a6e';
        x.font = '13px ' + MONO;
        x.fillText('ATLA REGIO . SOL ' + sol, 44, 84);

        x.fillStyle = '#ffe9a8';
        x.font = '800 78px ' + MONO;
        x.fillText(temp + ' C', 44, 172);
        x.fillStyle = '#7a6640';
        x.font = '12px ' + MONO;
        x.fillText('THE MOST STABLE WEATHER IN THE SOLAR SYSTEM', 44, 196);

        var rows = [
          ['PRESSURE',    bar + ' BAR'],
          ['WIND SFC',    windS + ' M/S'],
          ['CLOUD DECK',  windC + ' KM/H'],
          ['HUMIDITY',    '0 PCT (SULFURIC ACID DOES NOT COUNT)'],
          ['VISIBILITY',  '0 KM -- PERMANENT OVERCAST'],
          ['UV INDEX',    'IRRELEVANT BELOW THE CLOUDS']
        ];
        x.font = '13px ' + MONO;
        for (var r = 0; r < rows.length; r++) {
          var ry = 232 + r * 24;
          x.fillStyle = '#b09a6e'; x.fillText(rows[r][0], 44, ry);
          x.fillStyle = '#ffc83d'; x.fillText(rows[r][1], 210, ry);
        }

        x.fillStyle = '#f4e04d';
        x.font = '700 13px ' + MONO;
        x.fillText('5-SOL OUTLOOK: OVC 462 / OVC 462 / OVC 462 / OVC 462 / OVC 462', 44, 388);
        x.fillStyle = '#7a6640';
        x.textAlign = 'right';
        x.fillText('CONFIDENT', 756, 388);
        x.textAlign = 'left';

        var a = document.createElement('a');
        a.download = 'venus-weather.png';
        a.href = c.toDataURL('image/png');
        a.click();
      });

      return function () {
        stop();
        if (style.parentNode) style.parentNode.removeChild(style);
      };
    }
  };
})();
