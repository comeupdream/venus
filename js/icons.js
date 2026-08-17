/* =============================================================================
 * icons.js — the VENUS-OS icon set
 *
 * Hand-drawn 32×32 inline SVGs, one per app key, in the Win95 spirit: chunky
 * flat shapes, dark outlines, three or four colors each. The palette is the
 * site's own (gold/sulfur/ember/navy) plus one blue reserved for Earth —
 * Earth is the only thing in this OS that isn't Venus-colored, on purpose.
 *
 * os.js prefers these over an app's text glyph; the glyph remains the
 * fallback so an app with no icon here still renders.
 * ===========================================================================*/

window.VENUSICONS = (function () {
  'use strict';

  var K = '#0c0803', G = '#ffc83d', H = '#ffe9a8', D = '#b8862a', S = '#f4e04d',
      E = '#ff7a2f', R = '#c2410c', N = '#101b33', C = '#cdb07c', W = '#f5ecd8',
      EARTH = '#7fb2ff';

  function svg(body) {
    return '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + body + '</svg>';
  }

  return {
    /* wireframe planet cutaway */
    globe: svg(
      '<circle cx="16" cy="16" r="12.5" fill="' + N + '" stroke="' + G + '" stroke-width="2"/>' +
      '<ellipse cx="16" cy="16" rx="12.5" ry="4.8" fill="none" stroke="' + D + '" stroke-width="1.4"/>' +
      '<ellipse cx="16" cy="16" rx="4.8" ry="12.5" fill="none" stroke="' + D + '" stroke-width="1.4"/>' +
      '<circle cx="16" cy="16" r="4.2" fill="none" stroke="' + E + '" stroke-width="1.4"/>' +
      '<circle cx="11.5" cy="10.5" r="2.2" fill="' + H + '" opacity=".9"/>'),

    /* crescent with stars */
    phase: svg(
      '<circle cx="16" cy="16" r="12.5" fill="' + N + '" stroke="' + K + '"/>' +
      '<path d="M16 3.5a12.5 12.5 0 0 1 0 25 9.5 9.5 0 0 0 0-25Z" fill="' + G + '"/>' +
      '<circle cx="9" cy="10" r="1.1" fill="' + S + '"/>' +
      '<circle cx="12" cy="20" r=".9" fill="' + C + '"/>' +
      '<circle cx="7.5" cy="15.5" r=".7" fill="' + W + '"/>'),

    /* the zonal deck */
    clouds: svg(
      '<rect x="4" y="19.5" width="24" height="4" rx="2" fill="' + E + '"/>' +
      '<rect x="6.5" y="25" width="19" height="3" rx="1.5" fill="' + D + '"/>' +
      '<g stroke="' + K + '" stroke-width="1">' +
      '<circle cx="9.5" cy="12.5" r="4.2" fill="' + G + '"/>' +
      '<circle cx="21" cy="12" r="4.8" fill="' + G + '"/>' +
      '<circle cx="15" cy="9.5" r="5.2" fill="' + S + '"/></g>' +
      '<circle cx="13" cy="7.8" r="1.6" fill="' + H + '"/>'),

    /* VDOS prompt */
    term: svg(
      '<rect x="3" y="5" width="26" height="18.5" rx="2" fill="' + N + '" stroke="' + G + '" stroke-width="2"/>' +
      '<path d="M8 10.5l4.2 3.5L8 17.5" stroke="' + S + '" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<rect x="15" y="16.2" width="7" height="2" fill="' + S + '"/>' +
      '<rect x="11" y="26" width="10" height="2.5" rx="1" fill="' + D + '"/>'),

    /* the coin itself */
    coin: svg(
      '<circle cx="16" cy="16" r="12.5" fill="' + G + '" stroke="' + D + '" stroke-width="2"/>' +
      '<circle cx="16" cy="16" r="8.8" fill="none" stroke="' + D + '" stroke-width="1.1"/>' +
      '<path d="M11.5 10.5l4.5 11 4.5-11" stroke="' + K + '" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M8 8.2a12.5 12.5 0 0 1 5.5-3.6" stroke="' + H + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>'),

    /* provenance ledger */
    refs: svg(
      '<path d="M5 7.5c4-2.2 8-2.2 11 0v18.5c-3-2.2-7-2.2-11 0Z" fill="' + C + '" stroke="' + K + '"/>' +
      '<path d="M27 7.5c-4-2.2-8-2.2-11 0v18.5c3-2.2 7-2.2 11 0Z" fill="' + W + '" stroke="' + K + '"/>' +
      '<path d="M8.5 12h5M8.5 15.5h5M19 12h4.5M19 15.5h4.5M19 19h4.5" stroke="' + D + '" stroke-width="1.3"/>'),

    /* volcano with vent glow */
    sweeper: svg(
      '<path d="M4 27L12.5 8h7L28 27Z" fill="' + D + '" stroke="' + K + '"/>' +
      '<path d="M12.5 8h7l2.2 5c-1.8 1.6-3.6-.8-5.7.4-2 1.1-3.8.8-5.7-.4Z" fill="' + E + '"/>' +
      '<path d="M10 27l3-6 2.5 3 3-5 4 8Z" fill="#8a5a1c" opacity=".8"/>' +
      '<circle cx="16" cy="5.6" r="2.1" fill="' + R + '"/>' +
      '<circle cx="20.5" cy="3.6" r="1.2" fill="' + E + '"/>'),

    /* hourglass */
    vtime: svg(
      '<path d="M9 4h14v5.5L17.5 16l5.5 6.5V28H9v-5.5L14.5 16 9 9.5Z" fill="' + N + '" stroke="' + G + '" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M11.8 7.5h8.4L16 13Z" fill="' + S + '"/>' +
      '<path d="M11.8 25.2h8.4L16 19.8Z" fill="' + S + '"/>' +
      '<rect x="15.4" y="14" width="1.2" height="6" fill="' + S + '" opacity=".7"/>'),

    /* block grid mid-compaction */
    defrag: svg(
      '<g stroke="' + K + '" stroke-width=".7">' +
      '<rect x="4" y="4" width="5.5" height="5.5" fill="' + G + '"/><rect x="10.5" y="4" width="5.5" height="5.5" fill="' + G + '"/>' +
      '<rect x="17" y="4" width="5.5" height="5.5" fill="' + G + '"/><rect x="23.5" y="4" width="5.5" height="5.5" fill="' + D + '"/>' +
      '<rect x="4" y="10.5" width="5.5" height="5.5" fill="' + G + '"/><rect x="10.5" y="10.5" width="5.5" height="5.5" fill="' + E + '"/>' +
      '<rect x="17" y="10.5" width="5.5" height="5.5" fill="#241a0a"/><rect x="23.5" y="10.5" width="5.5" height="5.5" fill="#241a0a"/>' +
      '<rect x="4" y="17" width="5.5" height="5.5" fill="' + S + '"/><rect x="10.5" y="17" width="5.5" height="5.5" fill="#241a0a"/>' +
      '<rect x="17" y="17" width="5.5" height="5.5" fill="#241a0a"/><rect x="23.5" y="17" width="5.5" height="5.5" fill="#241a0a"/>' +
      '<rect x="4" y="23.5" width="5.5" height="5.5" fill="#241a0a"/><rect x="10.5" y="23.5" width="5.5" height="5.5" fill="#241a0a"/></g>'),

    /* the lander */
    venera: svg(
      '<circle cx="16" cy="13.5" r="11" fill="none" stroke="' + C + '" stroke-width="1" stroke-dasharray="2 3"/>' +
      '<circle cx="16" cy="13.5" r="7.5" fill="' + G + '" stroke="' + K + '"/>' +
      '<circle cx="13.2" cy="10.8" r="2.3" fill="' + H + '"/>' +
      '<path d="M11 19.5L8 27M21 19.5l3 7.5M16 21v7" stroke="' + D + '" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M16 2.5v4" stroke="' + E + '" stroke-width="1.6"/>'),

    /* radar scope mid-sweep */
    magellan: svg(
      '<circle cx="16" cy="16" r="13" fill="' + N + '" stroke="' + K + '"/>' +
      '<path d="M16 16L27.5 8.5A13.8 13.8 0 0 0 16 2.2Z" fill="' + S + '" opacity=".5"/>' +
      '<circle cx="16" cy="16" r="6.5" fill="none" stroke="' + G + '" stroke-width="1.2"/>' +
      '<circle cx="16" cy="16" r="10.5" fill="none" stroke="' + D + '" stroke-width="1.1"/>' +
      '<circle cx="16" cy="16" r="1.9" fill="' + G + '"/>' +
      '<circle cx="21.5" cy="8.5" r="1.6" fill="' + E + '"/>'),

    /* transfer orbits — the blue dot is home */
    transfer: svg(
      '<circle cx="16" cy="16" r="12.4" fill="none" stroke="' + D + '" stroke-width="1.4"/>' +
      '<circle cx="16" cy="16" r="7.5" fill="none" stroke="' + S + '" stroke-width="1.4"/>' +
      '<path d="M16 3.6A12.4 8 0 0 1 23.5 16" fill="none" stroke="' + E + '" stroke-width="1.5" stroke-dasharray="2.5 2"/>' +
      '<circle cx="16" cy="16" r="3" fill="' + G + '"/>' +
      '<circle cx="23.5" cy="16" r="2" fill="' + S + '" stroke="' + K + '"/>' +
      '<circle cx="16" cy="3.6" r="2" fill="' + EARTH + '" stroke="' + K + '"/>'),

    /* candles, honest ones */
    deck: svg(
      '<rect x="3" y="4" width="26" height="24" rx="2" fill="' + N + '" stroke="' + D + '"/>' +
      '<path d="M9 8v16M16 6v14M23 9v16" stroke="' + C + '" stroke-width="1.2"/>' +
      '<g stroke="' + K + '" stroke-width=".8">' +
      '<rect x="7" y="13" width="4" height="7" fill="' + E + '"/>' +
      '<rect x="14" y="9" width="4" height="7.5" fill="' + G + '"/>' +
      '<rect x="21" y="12" width="4" height="9" fill="' + E + '"/></g>'),

    /* forecast: cloud + cooked thermometer */
    weather: svg(
      '<g stroke="' + K + '" stroke-width="1">' +
      '<circle cx="10" cy="14" r="4.6" fill="' + S + '"/>' +
      '<circle cx="16" cy="12" r="5.4" fill="' + G + '"/>' +
      '<rect x="6" y="14" width="14" height="5" rx="2.5" fill="' + G + '"/></g>' +
      '<rect x="22.5" y="5" width="4.5" height="15" rx="2.2" fill="' + W + '" stroke="' + K + '"/>' +
      '<circle cx="24.75" cy="23.5" r="3.8" fill="' + R + '" stroke="' + K + '"/>' +
      '<rect x="23.7" y="8" width="2.1" height="14" fill="' + R + '"/>' +
      '<path d="M7 23l-2 4M12 23l-2 4M17 23l-2 4" stroke="' + E + '" stroke-width="1.5" stroke-linecap="round"/>'),

    /* the 2117 dot on the sun */
    transit: svg(
      '<circle cx="16" cy="16" r="12.5" fill="' + G + '"/>' +
      '<circle cx="16" cy="16" r="12.5" fill="none" stroke="' + E + '" stroke-width="2"/>' +
      '<circle cx="16" cy="16" r="9" fill="' + H + '" opacity=".35"/>' +
      '<path d="M3.5 12.5C10 10.5 22 10.5 28.5 12.5" stroke="' + K + '" stroke-width=".8" stroke-dasharray="1.5 2" fill="none" opacity=".55"/>' +
      '<circle cx="11" cy="11.6" r="1.8" fill="' + K + '"/>'),

    /* drone waveform */
    amp: svg(
      '<rect x="3" y="6" width="26" height="20" rx="2" fill="' + N + '" stroke="' + D + '" stroke-width="1.5"/>' +
      '<path d="M6 16h3l2-5.5 3 11 3-8.5 2 4.5 3-2h4" stroke="' + S + '" stroke-width="2" fill="none" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="26" cy="9.5" r="1.3" fill="' + E + '"/>'),

    /* brush, palette locked */
    paint: svg(
      '<g transform="rotate(45 16 14)">' +
      '<rect x="13.3" y="1.5" width="5.4" height="12" rx="1.6" fill="' + G + '" stroke="' + K + '"/>' +
      '<rect x="13.3" y="13.8" width="5.4" height="4" fill="' + C + '" stroke="' + K + '"/>' +
      '<path d="M13.3 17.8h5.4L16 26Z" fill="' + E + '" stroke="' + K + '"/></g>' +
      '<circle cx="7" cy="25.5" r="3.2" fill="' + E + '" opacity=".85"/>' +
      '<circle cx="12.5" cy="28" r="1.7" fill="' + S + '" opacity=".8"/>'),

    /* glider in the superrotation */
    rider: svg(
      '<path d="M4 20.5L28 7.5l-7.5 15.5-6.2-5Z" fill="' + G + '" stroke="' + K + '" stroke-linejoin="round"/>' +
      '<path d="M28 7.5L14.3 18" stroke="' + D + '" stroke-width="1.3"/>' +
      '<path d="M3 25.5c3-2.2 5 2.2 8 0M5 29c3-2.2 5 2.2 8 0" stroke="' + S + '" stroke-width="1.6" fill="none" stroke-linecap="round"/>'),

    /* the flagship: VESPER mid-jump over a coin */
    supervesper: svg(
      '<rect x="6" y="7" width="13" height="11" rx="2" fill="' + G + '" stroke="' + K + '"/>' +
      '<rect x="9" y="10" width="5" height="4" rx="1" fill="' + H + '"/>' +
      '<path d="M12.5 7V3.5" stroke="' + E + '" stroke-width="1.8"/><circle cx="12.5" cy="2.8" r="1.4" fill="' + E + '"/>' +
      '<path d="M7 18l-2.5 4M18 18l2.5 4" stroke="' + D + '" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M2 12h2.5M1 15h3" stroke="' + S + '" stroke-width="1.6" stroke-linecap="round"/>' +
      '<circle cx="25" cy="24" r="4.6" fill="' + G + '" stroke="' + D + '" stroke-width="1.4"/>' +
      '<path d="M23.4 22l1.6 4 1.6-4" stroke="' + K + '" stroke-width="1.4" fill="none" stroke-linecap="round"/>'),

    /* the orrery */
    orbits: svg(
      '<circle cx="16" cy="16" r="3.4" fill="' + G + '"/>' +
      '<circle cx="16" cy="16" r="6.5" fill="none" stroke="' + D + '" stroke-width="1.1"/>' +
      '<circle cx="16" cy="16" r="9.8" fill="none" stroke="' + D + '" stroke-width="1.1"/>' +
      '<circle cx="16" cy="16" r="13.2" fill="none" stroke="' + D + '" stroke-width="1.1"/>' +
      '<circle cx="21.5" cy="12.5" r="1.5" fill="' + C + '"/>' +
      '<circle cx="8.5" cy="10.5" r="2.1" fill="' + G + '" stroke="' + K + '" stroke-width=".8"/>' +
      '<circle cx="24" cy="24.5" r="1.9" fill="' + EARTH + '" stroke="' + K + '" stroke-width=".8"/>'),

    /* the manual */
    info: svg(
      '<circle cx="16" cy="16" r="12.5" fill="' + N + '" stroke="' + G + '" stroke-width="2"/>' +
      '<circle cx="16" cy="9.5" r="2.1" fill="' + S + '"/>' +
      '<path d="M13 14.5h3.6V22" stroke="' + G + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
      '<path d="M12.5 22.5h7" stroke="' + G + '" stroke-width="2.6" stroke-linecap="round"/>'),

    /* gold bar with a heartbeat — the RWA feed */
    market: svg(
      '<path d="M8 18h16l3 8H5Z" fill="' + G + '" stroke="' + K + '"/>' +
      '<path d="M8 18l3-4h10l3 4Z" fill="' + H + '" stroke="' + K + '"/>' +
      '<path d="M3 9h6l2-3.5L14.5 11l2.5-5 2 3h7" stroke="' + E + '" stroke-width="2" fill="none" stroke-linejoin="round" stroke-linecap="round"/>'),

    /* the start button glyph, tiny sun */
    start: svg(
      '<circle cx="16" cy="16" r="7" fill="' + K + '"/>' +
      '<circle cx="16" cy="16" r="3.2" fill="' + G + '"/>' +
      '<g stroke="' + K + '" stroke-width="2.2" stroke-linecap="round">' +
      '<path d="M16 4.5v4M16 23.5v4M4.5 16h4M23.5 16h4M8 8l2.8 2.8M21.2 21.2 24 24M24 8l-2.8 2.8M10.8 21.2 8 24"/></g>')
  };
})();
