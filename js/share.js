/* =============================================================================
 * share.js — VENUSSHARE. One call turns a game result into a branded
 * 1200×630 PNG ready to attach to a post: wordmark, stat lines, terrain
 * strip, domain, short CA. The players make the marketing.
 * ===========================================================================*/

window.VENUSSHARE = (function () {
  'use strict';

  var land = null, landTried = false;
  function getLand(cb) {
    if (land || landTried) return cb(land);
    var img = new Image();
    img.onload = function () { land = img; cb(img); };
    img.onerror = function () { landTried = true; cb(null); };
    img.src = 'assets/hero-terrain.webp';
  }

  function card(opts) {
    getLand(function (landImg) {
      var W = 1200, H = 630;
      var cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      var x = cv.getContext('2d');

      x.fillStyle = '#050301'; x.fillRect(0, 0, W, H);
      for (var i = 0; i < 150; i++) {
        var s = Math.sin(i * 127.1) * 43758.5453; s -= Math.floor(s);
        var s2 = Math.sin(i * 311.7) * 43758.5453; s2 -= Math.floor(s2);
        x.globalAlpha = 0.2 + (i % 4) * 0.15;
        x.fillStyle = '#e8e2d2';
        x.fillRect(s * W, s2 * 430, i % 7 ? 1.5 : 2.5, i % 7 ? 1.5 : 2.5);
      }
      x.globalAlpha = 1;

      if (landImg) {
        var sc = W / landImg.width;
        x.drawImage(landImg, 0, H * 0.78 - landImg.height * sc * 0.12, W, landImg.height * sc);
        var g = x.createLinearGradient(0, H * 0.55, 0, H);
        g.addColorStop(0, 'rgba(5,3,1,0)'); g.addColorStop(1, 'rgba(5,3,1,.55)');
        x.fillStyle = g; x.fillRect(0, H * 0.55, W, H * 0.45);
      }

      /* app label */
      x.font = '700 22px ui-monospace,monospace';
      x.fillStyle = '#f4e04d'; x.textAlign = 'left';
      x.fillText((opts.app || 'VENUS-OS').toUpperCase(), 80, 96);

      /* wordmark-styled headline */
      x.save();
      x.translate(80, 210);
      x.transform(1, 0, -0.14, 1, 0, 0);
      x.font = 'italic 900 84px "Arial Black",ui-sans-serif,system-ui,sans-serif';
      x.lineWidth = 5; x.lineJoin = 'round'; x.strokeStyle = '#241a0a';
      x.shadowColor = '#ffc83d'; x.shadowBlur = 42;
      x.strokeText(opts.headline || 'VENUS', 0, 0);
      x.shadowBlur = 0;
      x.fillStyle = '#ffffff';
      x.fillText(opts.headline || 'VENUS', 0, 0);
      x.restore();

      /* stat lines */
      x.font = '26px ui-monospace,monospace';
      x.fillStyle = '#cdb07c';
      (opts.lines || []).slice(0, 4).forEach(function (l, i2) {
        x.fillText(l, 82, 280 + i2 * 44);
      });

      /* footer chips */
      x.font = '700 26px ui-monospace,monospace';
      x.fillStyle = '#ffc83d'; x.fillRect(72, H - 106, 350, 52);
      x.fillStyle = '#0a0702'; x.textAlign = 'center';
      x.fillText('venus7777.online', 72 + 175, H - 71);
      x.textAlign = 'right';
      x.font = '20px ui-monospace,monospace';
      x.fillStyle = 'rgba(245,236,216,.75)';
      var ca = window.VENUSCOIN.ca;
      x.fillText('$VENUS · ' + ca.slice(0, 6) + '…' + ca.slice(-4), W - 78, H - 74);

      var a = document.createElement('a');
      a.download = (opts.file || 'venus-share') + '.png';
      a.href = cv.toDataURL('image/png');
      a.click();
    });
  }

  return { card: card };
})();
