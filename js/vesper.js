/* =============================================================================
 * vesper.js — VESPER, the resident probe
 *
 * Hoffman's desktop kept a mascot slot; ours is a small probe that drifts
 * above the taskbar dispensing real Venus facts. Click it for the next fact,
 * double-click to send it home (persisted). VDOS `vesper` summons it back.
 * Vesper is the Romans' name for Venus as the evening star — the same planet
 * they also called Lucifer in the morning, before they worked out it was one
 * object. VESPER has opinions about that.
 * ===========================================================================*/

window.VESPER = (function () {
  'use strict';

  var FACTS = [
    'A day on Venus is longer than its year. I have stopped celebrating either.',
    'The surface is 462 °C. Lead melts at 327. Plan accordingly.',
    'Surface pressure is 92 bar — the same as 900 m underwater on Earth.',
    'The clouds are sulfuric acid. The rain evaporates before it lands. Even the weather gives up here.',
    'Venus rotates backwards. The Sun rises in the west. No one knows exactly why.',
    'I am brighter than every star in your sky. Magnitude −4.5 at best. Not bragging, measuring.',
    'The Romans thought morning-Venus and evening-Venus were two objects: Lucifer and Vesper. It took Pythagoras to merge us.',
    'Galileo watched my phases in 1610 and broke the geocentric universe. You are welcome.',
    'The clouds lap the planet every 4 days at 360 km/h. The ground takes 243 days. The atmosphere does not wait for the surface.',
    'Venera 13 survived 127 minutes down there in 1982. Still the record. Respect.',
    'Venus has no moons and no magnetic field. Travel light.',
    'Almost every crater here is pristine — the atmosphere burns up anything small before it lands.',
    'Maxwell Montes is 11 km tall, higher than Everest, and named after a physicist. The only male name on the whole planet.',
    'Every feature on Venus is named after women — except Maxwell. He got grandfathered in.',
    'The next transit of Venus is December 2117. Set an alarm.',
    'A greenhouse effect did all this. The planet used to have oceans. Just saying.'
  ];

  var el = null, bubble = null, factIdx = -1, timer = null, bobT = 0, bobRaf = null;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function build() {
    if (el) return;
    el = document.createElement('button');
    el.id = 'vesper';
    el.setAttribute('aria-label', 'VESPER, the resident probe. Click for a fact.');
    el.style.cssText =
      'position:fixed;right:26px;bottom:56px;z-index:450;width:54px;height:54px;' +
      'background:none;border:0;cursor:pointer;padding:0;filter:drop-shadow(0 4px 8px rgba(0,0,0,.6))';
    el.innerHTML =
      '<svg viewBox="0 0 54 54" xmlns="http://www.w3.org/2000/svg">' +
      '<circle cx="27" cy="26" r="13" fill="#ffc83d" stroke="#0c0803" stroke-width="1.5"/>' +
      '<circle cx="22" cy="21" r="4" fill="#ffe9a8"/>' +
      '<circle cx="27" cy="26" r="18" fill="none" stroke="#cdb07c" stroke-width="1.2" stroke-dasharray="3 4"/>' +
      '<path d="M27 8V2M27 2l-3 3M27 2l3 3" stroke="#ff7a2f" stroke-width="1.6" fill="none"/>' +
      '<circle cx="20" cy="27" r="1.8" fill="#101b33"/><circle cx="31" cy="27" r="1.8" fill="#101b33"/>' +
      '<path d="M22 32c2.5 2 7.5 2 10 0" stroke="#101b33" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
      '</svg>';

    bubble = document.createElement('div');
    bubble.id = 'vesper-bubble';
    bubble.style.cssText =
      'position:fixed;right:24px;bottom:118px;z-index:450;max-width:260px;display:none;' +
      'background:#1d1508;border:2px solid;border-color:#6d5220 #0c0803 #0c0803 #6d5220;' +
      'padding:10px 12px;font:12px/1.55 ui-sans-serif,system-ui,sans-serif;color:#f5ecd8;' +
      'box-shadow:3px 3px 0 rgba(0,0,0,.55)';
    document.body.appendChild(bubble);
    document.body.appendChild(el);

    el.addEventListener('click', speak);
    el.addEventListener('dblclick', function () { hide(true); });

    if (!reduce) {
      (function bob(now) {
        if (!el) return;
        bobRaf = requestAnimationFrame(bob);
        bobT = now * 0.001;
        el.style.transform = 'translateY(' + (Math.sin(bobT * 1.4) * 4).toFixed(1) + 'px)';
      })(performance.now());
    }

    /* first fact after a polite delay, then occasionally */
    timer = setTimeout(speak, 12000);
  }

  function speak() {
    if (!el) return;
    clearTimeout(timer);
    factIdx = (factIdx + 1) % FACTS.length;
    bubble.innerHTML =
      '<b style="display:block;font-family:ui-monospace,monospace;font-size:9px;' +
      'letter-spacing:.2em;color:#cdb07c;margin-bottom:5px">VESPER · RESIDENT PROBE</b>' +
      FACTS[factIdx] +
      '<i style="display:block;margin-top:6px;font-size:9.5px;color:#7a6640;font-style:normal;' +
      'font-family:ui-monospace,monospace">CLICK: NEXT · DBL-CLICK: DISMISS</i>';
    bubble.style.display = 'block';
    clearTimeout(bubble._hide);
    bubble._hide = setTimeout(function () { bubble.style.display = 'none'; }, 12000);
    timer = setTimeout(speak, 45000);
  }

  function hide(persist) {
    clearTimeout(timer);
    if (bobRaf) cancelAnimationFrame(bobRaf);
    if (el) { el.remove(); el = null; }
    if (bubble) { bubble.remove(); bubble = null; }
    if (persist) { try { localStorage.setItem('venus-vesper', 'off'); } catch (e) { /* fine */ } }
  }

  function show() {
    try { localStorage.removeItem('venus-vesper'); } catch (e) { /* fine */ }
    build();
  }

  function toggle() { if (el) hide(true); else show(); }

  /* appear after boot unless previously dismissed */
  var wants = 'on';
  try { wants = localStorage.getItem('venus-vesper') || 'on'; } catch (e) { /* fine */ }
  if (wants !== 'off') setTimeout(build, 9000);

  return { toggle: toggle, show: show, hide: hide };
})();
