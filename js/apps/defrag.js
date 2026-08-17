/* =============================================================================
 * defrag.js — DEFRAG. A loving fake of the 9x defragmenter, aimed at a
 * planet's surface. It compacts nothing, recovers nothing, and finishes
 * proud of it.
 * ===========================================================================*/

(function () {
  'use strict';

  var h = window.VENUSKIT.h;
  var COLS = 28, ROWS = 12;
  var STATUS = ['COMPACTING REGOLITH SECTOR 0x%', 'REALIGNING TESSERAE', 'DEFLATING PANCAKE DOMES',
                'SWEEPING EJECTA FIELD 0x%', 'POLISHING BASALT PLAIN', 'NORMALIZING CORONAE',
                'RE-INDEXING LAVA CHANNELS 0x%'];

  window.VENUSAPPS = window.VENUSAPPS || {};
  window.VENUSAPPS.defrag = {
    icon: '▦', title: 'DEFRAG', w: 560, h: 430, desktop: false,
    mount: function (node) {
      var style = document.createElement('style');
      style.textContent =
        '.vdfrg .blocks{display:grid;grid-template-columns:repeat(' + COLS + ',1fr);gap:2px;padding:12px}' +
        '.vdfrg .b{aspect-ratio:1;background:#241a0a;border:1px solid rgba(12,8,3,.8)}' +
        '.vdfrg .b.read{background:var(--sulfur)}.vdfrg .b.comp{background:var(--ember)}.vdfrg .b.done{background:var(--gold)}';
      document.head.appendChild(style);

      node.appendChild(h(
        '<div class="app vdfrg">' +
          '<div class="app-head"><span class="h-title">SURFACE DEFRAGMENTER</span>' +
            '<span class="spacer"></span><span class="h-sub" data-f="pct">0%</span></div>' +
          '<div class="app-body" style="padding:6px"><div class="blocks"></div>' +
            '<div style="padding:0 12px">' +
              '<div class="sunken" style="height:18px;padding:2px"><i data-f="bar" style="display:block;height:100%;width:0;' +
                'background:repeating-linear-gradient(90deg,var(--gold-deep) 0 12px,var(--gold) 12px 14px)"></i></div>' +
              '<div data-f="stat" style="font:11px var(--mono);color:var(--dim);margin-top:8px;letter-spacing:.08em">IDLE.</div>' +
            '</div>' +
          '</div>' +
          '<div class="strip"><button class="genbtn" data-a="go">START</button>' +
            '<span class="readout" data-f="eta" style="text-align:left;flex:1">ETA —</span></div>' +
        '</div>'
      ));

      var blocks = node.querySelector('.blocks');
      var cells = [];
      for (var i = 0; i < COLS * ROWS; i++) {
        var b = document.createElement('div');
        b.className = 'b';
        blocks.appendChild(b); cells.push(b);
      }

      var f = {};
      node.querySelectorAll('[data-f]').forEach(function (n) { f[n.dataset.f] = n; });
      var btn = node.querySelector('[data-a="go"]');

      var order = cells.map(function (_, i) { return i; });
      /* clustered shuffle so it scans in chunks like the real thing */
      for (var j = order.length - 1; j > 0; j--) {
        var k = Math.max(0, j - ((Math.random() * 40) | 0));
        var tmp = order[j]; order[j] = order[k]; order[k] = tmp;
      }

      var idx = 0, running = false, done = false, acc = 0, statAcc = 0;

      btn.addEventListener('click', function () {
        if (done) {
          cells.forEach(function (c) { c.className = 'b'; });
          idx = 0; done = false; f.pct.textContent = '0%'; f.bar.style.width = '0';
        }
        running = !running;
        btn.textContent = running ? 'PAUSE' : 'RESUME';
        if (!running) f.stat.textContent = 'PAUSED. THE ROCKS WILL WAIT. THEY ARE GOOD AT IT.';
      });

      var stop = window.VENUSKIT.loop(function (dt) {
        if (!running || done || !blocks.offsetParent) return;
        acc += dt; statAcc += dt;
        while (acc > 26 && idx < order.length) {
          acc -= 26;
          var c = order[idx];
          cells[c].className = 'b read';
          if (idx > 2) cells[order[idx - 3]].className = 'b comp';
          if (idx > 6) cells[order[idx - 7]].className = 'b done';
          idx++;
        }
        if (statAcc > 900) {
          statAcc = 0;
          var s = STATUS[(Math.random() * STATUS.length) | 0].replace('%', ((Math.random() * 4095) | 0).toString(16).toUpperCase());
          f.stat.textContent = s;
          f.eta.textContent = 'ETA ' + ((order.length - idx) * 3.7e8).toExponential(2) + ' VENUS µS';
        }
        var pct = Math.min(100, idx / order.length * 100);
        f.pct.textContent = pct.toFixed(0) + '%';
        f.bar.style.width = pct + '%';
        if (idx >= order.length) {
          for (var m = Math.max(0, idx - 7); m < idx; m++) cells[order[m]].className = 'b done';
          done = true; running = false;
          btn.textContent = 'AGAIN';
          f.stat.textContent = 'SURFACE OPTIMIZED · 0 BYTES RECOVERED · IT WAS ALREADY PERFECT.';
          f.eta.textContent = 'ETA —';
        }
      });

      return function () { stop(); style.remove(); };
    }
  };
})();
