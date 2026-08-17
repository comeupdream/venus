/* =============================================================================
 * sweeper.js — VOLCANO SWEEPER. Minesweeper, except the mines are active
 * vents in a tessera survey grid. 12×10, 18 vents, first click always safe.
 * ===========================================================================*/

(function () {
  'use strict';

  var h = window.VENUSKIT.h;
  var COLS = 12, ROWS = 10, VENTS = 18;
  var NUM_COLORS = ['', '#cdb07c', '#ffc83d', '#f4e04d', '#ff7a2f', '#ff7a2f', '#c2410c', '#ffe9a8', '#fff'];

  window.VENUSAPPS = window.VENUSAPPS || {};
  window.VENUSAPPS.sweeper = {
    icon: '⛰', title: 'VOLCANO SWEEPER', w: 460, h: 560,
    mount: function (node) {
      var style = document.createElement('style');
      style.textContent =
        '.vsweep .grid{display:grid;grid-template-columns:repeat(' + COLS + ',1fr);gap:2px;padding:10px}' +
        '.vsweep .c{aspect-ratio:1;display:grid;place-items:center;font:700 13px var(--mono);cursor:pointer;' +
          'background:var(--panel-2);border:2px solid;border-color:var(--bevel-hi) var(--bevel-sh) var(--bevel-sh) var(--bevel-hi);color:var(--text);padding:0}' +
        '.vsweep .c.open{border:1px solid var(--line);background:var(--sunken);cursor:default}' +
        '.vsweep .c.vent{background:#3a1004}' +
        '.vsweep .c .fl{color:var(--gold)}' +
        '.vsweep .bar{display:flex;align-items:center;gap:10px;padding:10px 12px 0}' +
        '.vsweep .lcd{font:700 15px var(--mono);color:var(--ember);background:var(--void);padding:4px 10px;' +
          'border:2px solid;border-color:var(--bevel-sh) var(--bevel-hi) var(--bevel-hi) var(--bevel-sh);min-width:64px;text-align:center}' +
        '.vsweep .face{flex:1;max-width:44px;height:36px;font-size:19px;display:grid;place-items:center;cursor:pointer;' +
          'background:var(--panel-2);border:2px solid;border-color:var(--bevel-hi) var(--bevel-sh) var(--bevel-sh) var(--bevel-hi)}';
      document.head.appendChild(style);

      node.appendChild(h(
        '<div class="app vsweep">' +
          '<div class="bar"><div class="lcd" data-f="vents">' + VENTS + '</div>' +
            '<span class="spacer" style="flex:1"></span>' +
            '<button class="face" data-a="reset" title="New survey">☉</button>' +
            '<span class="spacer" style="flex:1"></span>' +
            '<div class="lcd" data-f="time">0:00</div></div>' +
          '<div class="app-body" style="padding:4px"><div class="grid"></div></div>' +
          '<div class="app-foot"><span>TESSERA SURVEY GRID · SEISMIC FLAG: RIGHT-CLICK / LONG-PRESS</span>' +
            '<span class="spacer"></span><span data-f="best">—</span></div>' +
        '</div>'
      ));

      var grid = node.querySelector('.grid');
      var face = node.querySelector('[data-a="reset"]');
      var fVents = node.querySelector('[data-f="vents"]');
      var fTime = node.querySelector('[data-f="time"]');
      var fBest = node.querySelector('[data-f="best"]');
      var cells, vents, opened, flags, started, dead, won, t0, pressT;

      var best = null;
      try { best = +localStorage.getItem('venus-sweeper-best') || null; } catch (e) {}
      showBest();
      function showBest() { fBest.textContent = best ? 'BEST ' + clock(best) : ''; }
      function clock(s) { return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0'); }

      function reset() {
        cells = []; vents = {}; opened = 0; flags = 0;
        started = false; dead = false; won = false; t0 = 0;
        face.textContent = '☉';
        fVents.textContent = VENTS;
        grid.innerHTML = '';
        for (var i = 0; i < COLS * ROWS; i++) {
          var b = document.createElement('button');
          b.className = 'c';
          (function (idx, el) {
            el.addEventListener('click', function () { open(idx); });
            el.addEventListener('contextmenu', function (e) { e.preventDefault(); flag(idx); });
            el.addEventListener('pointerdown', function (e) {
              if (e.pointerType !== 'touch') return;
              pressT = setTimeout(function () { flag(idx); pressT = 0; }, 550);
            });
            el.addEventListener('pointerup', function () { clearTimeout(pressT); });
          })(i, b);
          grid.appendChild(b);
          cells.push({ el: b, open: false, flag: false });
        }
      }

      function plant(safe) {
        var n = 0;
        while (n < VENTS) {
          var i = (Math.random() * COLS * ROWS) | 0;
          if (vents[i] || i === safe) continue;
          /* keep the 8 neighbours of the first click clear too — a fair start */
          if (Math.abs(i % COLS - safe % COLS) <= 1 && Math.abs(((i / COLS) | 0) - ((safe / COLS) | 0)) <= 1) continue;
          vents[i] = true; n++;
        }
      }

      function around(i, fn) {
        var x = i % COLS, y = (i / COLS) | 0;
        for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          var nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS) fn(ny * COLS + nx);
        }
      }
      function count(i) { var c = 0; around(i, function (j) { if (vents[j]) c++; }); return c; }

      function open(i) {
        if (dead || won || cells[i].open || cells[i].flag) return;
        if (!started) { started = true; t0 = Date.now(); plant(i); }
        var c = cells[i];
        c.open = true; c.el.classList.add('open');
        if (vents[i]) return boom(i);
        opened++;
        var n = count(i);
        if (n) { c.el.textContent = n; c.el.style.color = NUM_COLORS[n]; }
        else around(i, open);
        if (opened === COLS * ROWS - VENTS) win();
      }

      function flag(i) {
        if (dead || won || cells[i].open) return;
        var c = cells[i];
        c.flag = !c.flag;
        flags += c.flag ? 1 : -1;
        c.el.innerHTML = c.flag ? '<span class="fl">▲</span>' : '';
        fVents.textContent = VENTS - flags;
      }

      function boom(killer) {
        dead = true; face.textContent = '☠';
        Object.keys(vents).forEach(function (i) {
          cells[i].el.classList.add('open', 'vent');
          cells[i].el.textContent = +i === killer ? '✹' : '▲';
          cells[i].el.style.color = +i === killer ? '#ff7a2f' : '#c2410c';
        });
      }

      function win() {
        won = true; face.textContent = '★';
        if (window.VENUSACH) window.VENUSACH.unlock('sweep');
        var t = (Date.now() - t0) / 1000;
        if (!best || t < best) {
          best = t;
          try { localStorage.setItem('venus-sweeper-best', String(t)); } catch (e) {}
          showBest();
        }
      }

      face.addEventListener('click', reset);
      reset();

      var stop = window.VENUSKIT.loop(function () {
        if (started && !dead && !won) fTime.textContent = clock((Date.now() - t0) / 1000);
      });
      return function () { stop(); style.remove(); };
    }
  };
})();
