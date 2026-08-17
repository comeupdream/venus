/* =============================================================================
 * achieve.js — the OS remembers what you did. Eighteen achievements across
 * every app, toast notifications in the corner, and a trophy shelf in the
 * Start menu. localStorage only; the flex is the screenshot.
 * ===========================================================================*/

window.VENUSACH = (function () {
  'use strict';

  var LIST = [
    { id: 'boot',      icon: '☉',  title: 'FIRST LIGHT',        desc: 'Booted VENUS-OS.' },
    { id: 'ca_copy',   icon: '◈',  title: 'DUE DILIGENCE',      desc: 'Copied the contract address.' },
    { id: 'strip',     icon: '🜍',  title: 'FIELD DAY',          desc: 'Fully field-stripped the planet.' },
    { id: 'terminal',  icon: '▮',  title: 'COMMAND LINE ERA',   desc: 'Ran a VDOS command.' },
    { id: 'sweep',     icon: '⛰',  title: 'SEISMOLOGIST',       desc: 'Cleared a Volcano Sweeper grid.' },
    { id: 'landed',    icon: '🛰',  title: 'SOFT LANDING',       desc: 'Put a Venera probe down intact.' },
    { id: 'cooked',    icon: '🔥', title: 'STANDARD OUTCOME',   desc: 'Lost a probe to Venus. Everyone does.' },
    { id: 'science',   icon: '📡', title: 'PEER REVIEWED',      desc: 'Transmitted 500 science from the surface.' },
    { id: 'mapped',    icon: '🗺',  title: 'CARTOGRAPHER',       desc: 'Mapped 80% of a daily planet.' },
    { id: 'anomaly3',  icon: '❋',  title: 'X-FILES',            desc: 'Logged all three anomalies in one mission.' },
    { id: 'rider5',    icon: '🪁', title: 'DECK HAND',          desc: 'Rode the superrotation for 5 km.' },
    { id: 'painter',   icon: '🖌',  title: 'GALLERY OPENING',    desc: 'Exported a PAINT96 masterpiece.' },
    { id: 'goldscan',  icon: '🥇', title: 'PROOF OF GOLD',      desc: 'Scanned a wallet in the Gold Tracker.' },
    { id: 'sv_start',  icon: '🚀', title: 'PRESS START',        desc: 'Began SUPER VESPER.' },
    { id: 'sv_clear',  icon: '★',  title: 'PLANET CLEAR',       desc: 'Finished all three SUPER VESPER worlds.' },
    { id: 'saver',     icon: '▦',  title: 'AWAY FROM KEYBOARD', desc: 'Let the screensaver take over.' },
    { id: 'konami',    icon: '🌧',  title: 'THE OLD WAYS',       desc: 'You remembered the code. Gold rained.' },
    { id: 'gsod',      icon: '⚠',  title: 'GOLD SCREEN OF DEATH', desc: 'Crashed the OS in the richest possible way.' }
  ];

  var got = {};
  try { (JSON.parse(localStorage.getItem('venus-ach') || '[]')).forEach(function (id) { got[id] = 1; }); }
  catch (e) {}

  function save() {
    try { localStorage.setItem('venus-ach', JSON.stringify(Object.keys(got))); } catch (e) {}
  }

  var toastBox = null;
  function toast(a) {
    if (!toastBox) {
      toastBox = document.createElement('div');
      toastBox.id = 'achtoasts';
      document.body.appendChild(toastBox);
    }
    var t = document.createElement('div');
    t.className = 'achtoast';
    t.innerHTML = '<span class="a-i">' + a.icon + '</span><span><b>ACHIEVEMENT · ' + a.title +
      '</b><br>' + a.desc + '</span>';
    toastBox.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('on'); });
    if (window.VENUSFX) window.VENUSFX.sound('ding');
    setTimeout(function () {
      t.classList.remove('on');
      setTimeout(function () { t.remove(); }, 400);
    }, 4200);
  }

  function unlock(id) {
    if (got[id]) return false;
    var a = null;
    for (var i = 0; i < LIST.length; i++) if (LIST[i].id === id) a = LIST[i];
    if (!a) return false;
    got[id] = 1; save(); toast(a);
    return true;
  }

  /* ---- the shelf, as an app ---- */
  window.VENUSAPPS = window.VENUSAPPS || {};
  window.VENUSAPPS.trophies = {
    icon: '★', title: 'TROPHIES', w: 560, h: 560, desktop: false,
    mount: function (node) {
      var h = window.VENUSKIT.h;
      var n = Object.keys(got).length;
      var el = h('<div class="app"><div class="app-head">' +
        '<span class="h-title">TROPHY SHELF</span><span class="spacer"></span>' +
        '<span class="h-sub">' + n + ' / ' + LIST.length + '</span></div>' +
        '<div class="app-body"><div class="ach-grid"></div></div>' +
        '<div class="app-foot"><span>THE OS REMEMBERS. STORED ON YOUR MACHINE ONLY.</span></div></div>');
      var grid = el.querySelector('.ach-grid');
      LIST.forEach(function (a) {
        var owned = !!got[a.id];
        var row = document.createElement('div');
        row.className = 'ach-row' + (owned ? ' owned' : '');
        row.innerHTML = '<span class="a-i">' + (owned ? a.icon : '?') + '</span>' +
          '<span><b>' + (owned ? a.title : '???') + '</b><br><i>' +
          (owned ? a.desc : 'Keep exploring the OS.') + '</i></span>';
        grid.appendChild(row);
      });
      node.appendChild(el);
      return null;
    }
  };

  return { unlock: unlock, count: function () { return Object.keys(got).length; }, total: LIST.length };
})();
