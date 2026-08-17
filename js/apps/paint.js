/* =============================================================================
 * paint.js — PAINT96. MS-Paint homage, palette locked to Venus. You paint in
 * light on a void-black 640×400 page. Terrain and cloud stamps come from the
 * same generators as everything else on this OS.
 * ===========================================================================*/

(function () {
  'use strict';

  var h = window.VENUSKIT.h;
  var PW = 640, PH = 400;
  var PALETTE = ['#ffe9a8', '#ffc83d', '#f4e04d', '#b8862a', '#8a6f3e', '#cdb07c',
                 '#ff7a2f', '#c2410c', '#f5ecd8', '#6a4f21', '#241a0a', '#0a0702'];
  var TOOLS = [['pencil', '✎'], ['brush', '●'], ['eraser', '□'], ['line', '∕'],
               ['rect', '▭'], ['fill', '▮'], ['flood', '◉'], ['terrain', '⛰'], ['cloud', '☁']];

  window.VENUSAPPS = window.VENUSAPPS || {};
  window.VENUSAPPS.paint = {
    icon: '🖌', title: 'PAINT96', w: 780, h: 600,
    mount: function (node) {
      var style = document.createElement('style');
      style.textContent =
        '.vpaint .tools{display:grid;grid-template-columns:1fr 1fr;gap:3px;padding:8px;align-content:start}' +
        '.vpaint .tool{width:34px;height:30px;display:grid;place-items:center;cursor:pointer;font-size:14px;color:var(--text);' +
          'background:var(--panel-2);border:2px solid;border-color:var(--bevel-hi) var(--bevel-sh) var(--bevel-sh) var(--bevel-hi)}' +
        '.vpaint .tool.on{border-color:var(--bevel-sh) var(--bevel-hi) var(--bevel-hi) var(--bevel-sh);background:var(--line);color:var(--gold)}' +
        '.vpaint .pal{display:flex;gap:3px;flex-wrap:wrap;align-items:center}' +
        '.vpaint .sw{width:20px;height:20px;cursor:pointer;border:2px solid;border-color:var(--bevel-sh) var(--bevel-hi) var(--bevel-hi) var(--bevel-sh)}' +
        '.vpaint .sw.on{outline:2px solid var(--gold)}' +
        '.vpaint .sz{width:26px;height:26px;display:grid;place-items:center;cursor:pointer;background:var(--panel-2);' +
          'border:1px solid var(--line);color:var(--text)}' +
        '.vpaint .sz.on{border-color:var(--gold);color:var(--gold)}' +
        '.vpaint .page{position:relative;background:var(--void);image-rendering:pixelated;flex:1;min-height:0;display:grid;place-items:center}' +
        '.vpaint .page canvas{position:absolute;image-rendering:pixelated;touch-action:none}';
      document.head.appendChild(style);

      node.appendChild(h(
        '<div class="app vpaint">' +
          '<div class="app-head" style="gap:8px">' +
            '<div class="pal"></div><span class="spacer"></span>' +
            '<div class="sz" data-s="2">·</div><div class="sz on" data-s="5">•</div>' +
            '<div class="sz" data-s="10">●</div><div class="sz" data-s="20">⬤</div>' +
            '<button class="ghost" data-a="clear">CLEAR</button>' +
            '<button class="genbtn" data-a="save">💾 PNG</button>' +
          '</div>' +
          '<div style="display:flex;flex:1;min-height:0">' +
            '<div class="tools"></div>' +
            '<div class="page"><canvas width="' + PW + '" height="' + PH + '"></canvas>' +
              '<canvas width="' + PW + '" height="' + PH + '"></canvas></div>' +
          '</div>' +
          '<div class="app-foot"><span data-f="tool">BRUSH</span><span data-f="xy"></span>' +
            '<span class="spacer"></span><span>PALETTE LOCKED: THIS IS VENUS, EVERYTHING IS GOLD</span></div>' +
        '</div>'
      ));

      var cvs = node.querySelectorAll('.page canvas');
      var cv = cvs[0], ov = cvs[1];
      var ctx = cv.getContext('2d'), octx = ov.getContext('2d');
      ctx.fillStyle = '#0a0702'; ctx.fillRect(0, 0, PW, PH);

      var tool = 'brush', color = PALETTE[1], size = 5;
      var drawing = false, sx = 0, sy = 0, lx = 0, ly = 0, undo = null, clearArmed = 0;

      /* chrome */
      var pal = node.querySelector('.pal');
      PALETTE.forEach(function (c, i) {
        var s = document.createElement('div');
        s.className = 'sw' + (i === 1 ? ' on' : '');
        s.style.background = c;
        s.addEventListener('click', function () {
          color = c;
          pal.querySelectorAll('.sw').forEach(function (x) { x.classList.remove('on'); });
          s.classList.add('on');
        });
        pal.appendChild(s);
      });
      var toolsEl = node.querySelector('.tools');
      TOOLS.forEach(function (t) {
        var b = document.createElement('button');
        b.className = 'tool' + (t[0] === 'brush' ? ' on' : '');
        b.title = t[0].toUpperCase(); b.textContent = t[1];
        b.addEventListener('click', function () {
          tool = t[0];
          toolsEl.querySelectorAll('.tool').forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on');
          node.querySelector('[data-f="tool"]').textContent = t[0].toUpperCase();
        });
        toolsEl.appendChild(b);
      });
      node.querySelectorAll('.sz').forEach(function (b) {
        b.addEventListener('click', function () {
          size = +b.dataset.s;
          node.querySelectorAll('.sz').forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on');
        });
      });

      /* keep the page scaled to fit */
      function fit() {
        var host = node.querySelector('.page');
        var r = host.getBoundingClientRect();
        var s = Math.min(r.width / PW, r.height / PH) * 0.97;
        [cv, ov].forEach(function (c) { c.style.width = PW * s + 'px'; c.style.height = PH * s + 'px'; });
      }
      fit(); addEventListener('resize', fit);
      var ro = new ResizeObserver(fit); ro.observe(node.querySelector('.page'));

      function pos(e) {
        var r = cv.getBoundingClientRect();
        return [Math.round((e.clientX - r.left) / r.width * PW),
                Math.round((e.clientY - r.top) / r.height * PH)];
      }
      function snap() { undo = ctx.getImageData(0, 0, PW, PH); }

      function dot(x, y) {
        ctx.fillStyle = tool === 'eraser' ? '#0a0702' : color;
        var s2 = tool === 'pencil' ? 1 : size;
        ctx.beginPath(); ctx.arc(x, y, s2 / 2, 0, 7); ctx.fill();
      }
      function stroke(x0, y0, x1, y1) {
        var d = Math.hypot(x1 - x0, y1 - y0), steps = Math.max(1, d | 0);
        for (var i = 0; i <= steps; i++) dot(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps);
      }

      /* stamps: seeded ridged noise / soft cloud puffs, fresh seed each press */
      function stampTerrain(x, y) {
        var w = 120, hh = 80, seed = (Math.random() * 1e9) | 0;
        function n(px, py2) { var v = Math.sin(px * 12.9898 + py2 * 78.233 + seed) * 43758.5453; return v - Math.floor(v); }
        var img = ctx.getImageData(x - w / 2, y - hh / 2, w, hh);
        for (var yy = 0; yy < hh; yy++) for (var xx = 0; xx < w; xx++) {
          var e = 1 - Math.hypot(xx / w - 0.5, yy / hh - 0.5) * 2;
          if (e <= 0) continue;
          var v = 0, a = 1, fr = 1;
          for (var o2 = 0; o2 < 3; o2++) { var q = n((xx * fr / 24) | 0, (yy * fr / 24) | 0); v += (1 - Math.abs(2 * q - 1)) * a; a *= 0.5; fr *= 2; }
          v = Math.min(1, v * 0.8) * e;
          var o3 = (yy * w + xx) * 4;
          img.data[o3] = 61 + v * 194; img.data[o3 + 1] = 34 + v * 152; img.data[o3 + 2] = 6 + v * 52; img.data[o3 + 3] = 255;
        }
        ctx.putImageData(img, x - w / 2, y - hh / 2);
      }
      function stampCloud(x, y) {
        for (var i = 0; i < 14; i++) {
          var a = Math.random() * 7, r = Math.random() * 46;
          var g = ctx.createRadialGradient(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.5, 1,
                                           x + Math.cos(a) * r, y + Math.sin(a) * r * 0.5, 22);
          g.addColorStop(0, 'rgba(244,224,77,.20)'); g.addColorStop(1, 'rgba(244,224,77,0)');
          ctx.fillStyle = g;
          ctx.fillRect(x - 80, y - 50, 160, 100);
        }
      }
      function flood(x, y) {
        var img = ctx.getImageData(0, 0, PW, PH), d2 = img.data;
        var t2 = (y * PW + x) * 4;
        var tr = d2[t2], tg = d2[t2 + 1], tb = d2[t2 + 2];
        var c = parseInt(color.slice(1), 16), fr = c >> 16, fg = (c >> 8) & 255, fb = c & 255;
        if (tr === fr && tg === fg && tb === fb) return;
        var stack = [x, y], n2 = 0;
        while (stack.length && n2 < 260000) {
          var py2 = stack.pop(), px = stack.pop();
          if (px < 0 || px >= PW || py2 < 0 || py2 >= PH) continue;
          var o4 = (py2 * PW + px) * 4;
          if (d2[o4] !== tr || d2[o4 + 1] !== tg || d2[o4 + 2] !== tb) continue;
          d2[o4] = fr; d2[o4 + 1] = fg; d2[o4 + 2] = fb; n2++;
          stack.push(px + 1, py2, px - 1, py2, px, py2 + 1, px, py2 - 1);
        }
        ctx.putImageData(img, 0, 0);
      }

      ov.addEventListener('pointerdown', function (e) {
        ov.setPointerCapture(e.pointerId);
        var p = pos(e); sx = lx = p[0]; sy = ly = p[1];
        snap(); drawing = true;
        if (tool === 'flood') { flood(sx, sy); drawing = false; }
        else if (tool === 'terrain') { stampTerrain(sx, sy); drawing = false; }
        else if (tool === 'cloud') { stampCloud(sx, sy); drawing = false; }
        else if (tool === 'pencil' || tool === 'brush' || tool === 'eraser') dot(sx, sy);
      });
      ov.addEventListener('pointermove', function (e) {
        var p = pos(e);
        node.querySelector('[data-f="xy"]').textContent = p[0] + ',' + p[1];
        if (!drawing) return;
        if (tool === 'pencil' || tool === 'brush' || tool === 'eraser') { stroke(lx, ly, p[0], p[1]); lx = p[0]; ly = p[1]; }
        else if (tool === 'line' || tool === 'rect' || tool === 'fill') {
          octx.clearRect(0, 0, PW, PH);
          octx.strokeStyle = octx.fillStyle = color; octx.lineWidth = tool === 'line' ? size : 1;
          if (tool === 'line') { octx.beginPath(); octx.moveTo(sx, sy); octx.lineTo(p[0], p[1]); octx.stroke(); }
          else if (tool === 'rect') octx.strokeRect(sx, sy, p[0] - sx, p[1] - sy);
          else octx.fillRect(sx, sy, p[0] - sx, p[1] - sy);
        }
      });
      ov.addEventListener('pointerup', function (e) {
        if (!drawing) return;
        drawing = false;
        var p = pos(e);
        if (tool === 'line') { ctx.strokeStyle = color; ctx.lineWidth = size; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(p[0], p[1]); ctx.stroke(); }
        else if (tool === 'rect') { ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.strokeRect(sx, sy, p[0] - sx, p[1] - sy); }
        else if (tool === 'fill') { ctx.fillStyle = color; ctx.fillRect(sx, sy, p[0] - sx, p[1] - sy); }
        octx.clearRect(0, 0, PW, PH);
      });

      node.firstChild.setAttribute('tabindex', '0');
      node.firstChild.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && undo) { e.preventDefault(); ctx.putImageData(undo, 0, 0); }
      });

      node.querySelector('[data-a="clear"]').addEventListener('click', function (e) {
        var b = e.currentTarget;
        if (Date.now() - clearArmed < 1600) { snap(); ctx.fillStyle = '#0a0702'; ctx.fillRect(0, 0, PW, PH); b.textContent = 'CLEAR'; }
        else { clearArmed = Date.now(); b.textContent = 'AGAIN TO SCORCH'; setTimeout(function () { b.textContent = 'CLEAR'; }, 1600); }
      });
      node.querySelector('[data-a="save"]').addEventListener('click', function () {
        var a = document.createElement('a');
        a.download = 'venus-paint.png';
        a.href = cv.toDataURL('image/png');
        a.click();
      });

      return function () { style.remove(); ro.disconnect(); };
    }
  };
})();
