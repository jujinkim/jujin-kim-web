# Project Agent Guide

## Snapshot
- **Swarm portfolio**: Jujin Kim's personal site. The whole viewport is a swarm of light particles that follows the visitor, evolves by a genetic algorithm while they move, and settles into the section heading when they stop.
- **Tech stack**: HTML, CSS and vanilla JS (ES6 modules) with hand-written WebGL2. No framework, no libraries, no build step.
- **Entry point**: `index.html` -> `js/main.js` -> modules in `js/modules/`.
- **Content**: static HTML in `index.html`. It must stay readable with scripts off.

---

## Project Structure
```
jujin-kim-web/
├── index.html            # All content, five sections
├── css/
│   ├── reset.css
│   └── site.css          # Everything else, including print and narrow screens
├── js/
│   ├── main.js           # Wires DOM, world, HUD, audio; picks live or static
│   └── modules/
│       ├── config.js         # TUNING and every other constant
│       ├── sim.js            # Particle simulation (typed arrays, no DOM/GL)
│       ├── evolution.js      # Genetic algorithm and persistence (pure)
│       ├── renderer.js       # WebGL2 passes and framebuffers
│       ├── shaders.js        # GLSL ES 3.00 sources
│       ├── world.js          # State machine and frame loop
│       ├── input.js          # Pointer/touch/key -> light and press
│       ├── text-targets.js   # Text -> points for the swarm to form
│       ├── quality.js        # Frame timing and the degrade ladder
│       ├── static-frame.js   # 2D still frame fallback
│       ├── hud.js            # GEN readout, lineage bars, sound toggle, hint
│       ├── audio.js          # Synthesized sound (Web Audio)
│       └── navigation.js     # Sections, hash URLs, keys
├── tests/
│   ├── evolution.test.mjs    # node --test
│   └── swarm-smoke.cjs       # Playwright
├── img/profile.jpg
├── fonts/JetBrainsMono-Regular.woff2
└── favicon.svg
```

---

## How It Works

### States (`world.js`)
`dormant -> waking -> roaming <-> condensed`, with `transit` on section change.
- **dormant**: a small sleeping knot. Pointer movement, a press, any key, the wheel, or a 10s timeout wakes it. Skipped on deep links, on a repeat visit in the same tab, and with `?enter=0`.
- **roaming**: the swarm follows the light. Fitness only accrues here, and only while the visitor is driving.
- **condensed**: the visitor is still, so about 65% of particles settle into the heading. Text is revealed after the first condensation and never hidden again.
- **static**: no simulation. Used for reduced motion, no WebGL2, a lost context, and the bottom of the quality ladder. `html[data-mode]` is `pending`, `live` or `static`.

### Evolution (`evolution.js`, `sim.js`)
- 24 genomes of 8 genes, stored normalized to [0, 1]; ranges are in `config.js` (`GENES`).
- A stationary press emits a pulse. Particles the front passes are struck and return from the edge.
- Fitness rewards being near the light, shared among crowded particles, and penalizes being struck.
- A generation is 6 seconds of active time. The lineage persists in `localStorage["swarm.v1"]`.

### Headings
The DOM headings stay in the page for layout and screen readers but are transparent in live mode; the swarm draws them at the same spot. `data-condense="WORD"` on an entry makes the swarm spell that word on hover or focus.

---

## Coding Guidelines

- **Tuning**: every number that shapes the feel lives in `TUNING` in `js/modules/config.js`. Change it there, not inline.
- **No allocation in the frame loop**: `sim.step`, `renderer.draw` and the `world.js` frame function must not create arrays or objects. Preallocate.
- **Frame-rate independence**: every rate uses `dt`. Do not add per-frame constants.
- **Ember is reserved**: the warm colour (`RAMP[4]`, `--ember`) means "struck by a pulse". Genome hues stop at 0.75 of the ramp (violet, blue, cyan, green). Do not use ember for decoration.
- **Dark only**: there is no light theme.
- **Copy**: the owner is an engineer. Do not call them an artist or write an art statement. State only facts already on the page. Lines that describe the live swarm carry `class="live-only"` so they disappear in static mode.
- **Fallbacks are part of the feature**: anything new must still work in static mode and with scripts disabled.
- **Release caching**: `index.html` asset links, every module `import`, and the font URL in `css/site.css` carry the same `v=20261119.1` key. Bump them together. Check with `grep -rn "v=2026" . --exclude-dir=.git | grep -v 20261119.1` (should print nothing).
- **Vanilla ES6 modules**: no frameworks, compilers or build pipelines.
- **Inline comments**: minimal and purposeful.

---

## Testing

```bash
node --test tests/evolution.test.mjs
for f in js/main.js js/modules/*.js; do node --check "$f"; done

python3 -m http.server 8000 --bind 127.0.0.1
SWARM_PLAYWRIGHT=/path/to/playwright node tests/swarm-smoke.cjs
```

Debug URL parameters:
- `?debug=1` exposes `window.swarmDebug` (`stats()`, `tuning`, `forceGeneration(n)`, `resetLineage()`).
- `?enter=0` skips the dormant entrance.
- `?quality=off` disables the degrade ladder (needed under software GL).
- `?rgba8=1` forces the 8-bit trail path.
- `?static=1` forces static mode.

Headless Firefox and WebKit may have no WebGL2; the smoke test then skips the live checks. Check those browsers, and a real phone, by hand.

---

## Key Contacts & Links
- **GitHub**: [@jujinkim](https://github.com/jujinkim)
- **Website**: [jujin.kim](https://jujin.kim)
- **Email**: [jk@jujin.kim](mailto:jk@jujin.kim)
