# VENUS — $VENUS

A procedural desktop for the Venus coin. The site boots like an operating
system, the wallpaper is a generated Magellan-style flyover of Sapas Mons, the
planet field-strips like a rifle, and the dial in the corner shows the **real
phase of Venus right now** — the observation Galileo used to break the
geocentric model, running live in a watch complication.

No build step, no frameworks, no textures, no sprites. Every pixel that moves
is computed. Open `index.html` or serve the folder statically.

## The lineage

Every visual cue is ported working code, not a mood board:

| Source repo | What it contributed | Where it lives now |
|---|---|---|
| `HOFFMAN-TACTICAL` | Tactical-OS 96: boot POST, desktop, draggable/resizable windows, taskbar, Start menu (`retro.css`/`retro.js`) | `css/os.css`, `js/os.js` — grey chrome re-hued to brass |
| `dragonfruit-drive` | The instrument language: rack cards, labelled knob rows, glowing gradient buttons, canvas wells (`src/style.css`, `livecode.css`) | `css/apps.css`, the Cloud Lab app — plum/pink rotated to night/gold |
| `knox-lux` | Avant Meridian's procedural moonphase watch (`moonphase-3d.tsx`): fluted bezel, navy dial, honest terminator from a real ephemeris | `js/venus-phase.js` — re-aimed from the Moon to Venus, re-expressed in 2D canvas |
| `INFINITEPARALLEL` | The CAD wireframe kernel (`rig.js`/`rifle.js`): projection, field-strip explode, hover callouts; plus the Blue & Gold palette | `js/venus-globe.js` — rifle parts became planetary shells |
| NASA/JPL Magellan | `PIA00107`, the 3-D perspective view of Sapas Mons | `js/terrain.js` generates it procedurally |

## The hero assets

Two views, toggled from the taskbar (or `view surface` / `view space` in VDOS):

- **SURFACE** — the Magellan plate at `assets/hero-terrain.webp` (`.jpg` and
  `.png` are probed too). Its horizon is auto-detected and pinned to the 75%
  line, so the land fills the bottom quarter of the screen and a procedural
  starfield drifts and twinkles in the black above it. If no plate is present,
  `js/terrain.js` generates the terrain instead — same composition, same stars.
- **SPACE** — the orbit video at `assets/hero-space.mp4`, lazy-loaded on first
  toggle so surface visitors never download it.

The Magellan imagery is NASA/JPL, public domain; keep the credit in SOURCES.

## The design rules

- **Square chassis, round instruments.** OS chrome never gets a border-radius;
  the app interiors always do. The contrast is the identity.
- **Gold is structure. Sulfur is data. Ember is heat and warnings.**
  (`css/tokens.css` is the single source of truth.)
- **Everything moving is computed.** If it animates, there is math behind it —
  the phase is a real ephemeris, the shells are true radius fractions, the
  rotation is actually retrograde.
- **Truth over hype.** The `$VENUS` token sheet ships with every figure
  deliberately blank. Fill fields in `js/apps.js` when they're real.

## Layout

```
index.html          the OS shell (boot → desktop → taskbar)
css/tokens.css      palette + geometry tokens (the design system)
css/os.css          Tactical-OS chrome: bevels, windows, taskbar, boot
css/apps.css        window interiors: rack, knobs, terminal, dial, prose
js/venus-phase.js   ephemeris + the watch dial (pure, no DOM globals)
js/venus-globe.js   wireframe shells + field-strip explode
js/terrain.js       procedural Magellan flyover (photo swap-in at assets/)
js/apps.js          the apps: VENUS.EXE, PHASE, CLOUD LAB, VDOS, $VENUS, SOURCES
js/os.js            window manager, icons, Start, tray, boot sequence
```

## Adding an app

Register it in `js/apps.js`:

```js
mytoken = {
  icon: '◈', title: 'BUY', w: 520, h: 400,
  mount(node) { node.innerHTML = '…'; return () => {/* teardown */}; }
};
```

It appears on the desktop and in the Start menu automatically. Buy links,
chart embeds and socials should be apps — the OS *is* the navigation.
