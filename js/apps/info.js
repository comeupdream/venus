/* =============================================================================
 * info.js — INFO / FAQ: what $VENUS actually is, in plain sentences.
 *
 * The facts come from js/coin.js. Anything not yet true stays a visibly
 * empty slot — same rule as the token sheet.
 * ===========================================================================*/

(function () {
  'use strict';

  var h = window.VENUSKIT.h;
  var C = window.VENUSCOIN;

  window.VENUSAPPS = window.VENUSAPPS || {};
  window.VENUSAPPS.info = {
    icon: 'ℹ', title: 'INFO / FAQ', w: 640, h: 620,
    mount: function (node) {
      node.appendChild(h(
        '<div class="app">' +
          '<div class="app-head"><span class="h-title">INFO / FAQ</span>' +
            '<span class="spacer"></span><span class="h-sub">READ BEFORE APE</span></div>' +
          '<div class="app-body"><div class="prose" style="max-width:100%">' +

            '<h2>What is $VENUS?</h2>' +
            '<p>A <strong>real-world-asset rewards token on ' + C.chain + '</strong>. ' +
            'Hold $VENUS and it emits <strong>' + C.rewards + '</strong> to your wallet — ' +
            C.rewardsNote + '. The gold planet pays you in gold. That is the whole thesis, ' +
            'and it fits in one sentence on purpose.</p>' +

            '<h2>What exactly is XAUt?</h2>' +
            '<p>Tether Gold — a token whose every unit is backed by one troy ounce of physical, ' +
            'vaulted gold. It is the real-world asset behind the RWA label: rewards arrive ' +
            'as a claim on metal, not as more of the same coin.</p>' +

            '<h2>Contract</h2>' +
            '<span class="placeholder" data-a="ca" style="cursor:pointer" title="Click to copy">' +
              '<b>CA · ' + C.chain.toUpperCase() + ' · CLICK TO COPY</b>' + C.ca + '</span>' +

            '<h2>How do the rewards work?</h2>' +
            '<p>Emissions accrue to holders automatically — no staking, no claiming ritual. ' +
            'The exact rate and cadence belong to the tokenomics sheet:</p>' +
            '<span class="placeholder"><b>EMISSION RATE / CADENCE</b>— (published when final)</span>' +

            '<h2>How do I buy?</h2>' +
            '<p>Any BNB Smart Chain DEX. Paste the contract address above — never trust a ' +
            'ticker search alone; tickers can be squatted, the CA cannot. Live pair data is in the ' +
            '<strong>MARKET</strong> app on this desktop (or type <code>open market</code> in VDOS).</p>' +

            '<h2>What is this website?</h2>' +
            '<p>VENUS-OS — a fully procedural desktop. The terrain is NASA Magellan radar ' +
            'data, the phase dial computes the planet’s real illumination from orbital ' +
            'mechanics, the cutaway uses true shell radii, and the games run on real Venus ' +
            'physics. Nothing on this site fakes data, including the market numbers: every ' +
            'figure is either live from a feed, computed from ephemeris, or visibly blank.</p>' +

            '<h2>The boring-but-important part</h2>' +
            '<p>Nothing here is financial advice. $VENUS is a crypto asset; crypto assets go ' +
            'up, down, and occasionally to 462 °C. Emissions depend on contract mechanics and ' +
            'market conditions. Do your own research — the CA above is where research starts.</p>' +

          '</div></div>' +
          '<div class="app-foot"><span>RWA · <b>' + C.rewards + '</b> emissions · ' + C.chain + '</span></div>' +
        '</div>'
      ));

      var ca = node.querySelector('[data-a="ca"]');
      ca.addEventListener('click', function () {
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(C.ca).then(function () {
          var b = ca.querySelector('b');
          b.textContent = 'COPIED ✓';
          setTimeout(function () { b.textContent = 'CA · ' + C.chain.toUpperCase() + ' · CLICK TO COPY'; }, 1400);
        }, function () {});
      });
      return null;
    }
  };
})();
