# Jujin Kim — Swarm Portfolio

Personal site at [jujin.kim](https://jujin.kim), built with HTML, CSS, and vanilla ES modules with hand-written WebGL2. No framework, bundler, or runtime dependency.

The page is a swarm of light particles. It follows the visitor's pointer or finger, evolves by a genetic algorithm while they move, and settles into the section heading when they stop. It grew out of two 2016 projects listed under Lab: a Kinect media facade for the Seoul Luci Festival, and a genetic algorithm that learned to dodge missiles.

## What a visit looks like

1. **Dormant.** A small knot of light in the dark. Moving the pointer, pressing, touching, any key, or waiting 10 seconds wakes it.
2. **Roaming.** The swarm follows the light the visitor carries. With no visitor input the light wanders by itself.
3. **Condensed.** After about a second of stillness, most particles settle into the heading ("JUJIN KIM", "WORK", ...). The text fades in after the first condensation.
4. **Pulse.** A press that stays in place sends out a ring; holding longer makes it larger. Particles the ring passes are struck, turn ember, and return from the edge.
5. **Generations.** Every 6 seconds of active play the 24 genomes are ranked, the weakest half replaced by children of the fittest, and `GEN` in the corner counts up. The lineage is saved, so a returning visitor resumes at their generation.

Hovering or focusing a project makes the swarm spell its name.

## Display modes

| Situation | Result |
| --- | --- |
| WebGL2 available | Live swarm |
| `prefers-reduced-motion`, no WebGL2, lost context, or sustained slow frames at the lowest quality | One still frame on a 2D canvas, all content visible |
| JavaScript disabled or the module fails to load | Plain page, every section listed |

Content is static HTML in `index.html`, so all three modes show the same text.

## How it is built

- **Simulation** (`js/modules/sim.js`): up to 16,000 particles (7,000 on touch devices) in flat typed arrays on the CPU. Neighbour effects use a coarse density/velocity grid instead of pairwise search. The light's velocity is also written into that grid and decays over about 1.5 seconds, which is the wake particles get carried by. The field wraps at the edges.
- **Evolution** (`js/modules/evolution.js`): 8 genes per genome (speed, turn, attract, orbit, cohesion, wander, flee, hue). Fitness is time spent near the light, divided among crowded particles so a single blob does not win, times a survival factor for avoiding pulses. Selection keeps 4 elites, replaces the 12 weakest using tournament selection, BLX crossover and gaussian mutation, and injects random genomes if diversity collapses. The module is pure and runs under node.
- **Rendering** (`js/modules/renderer.js`, `shaders.js`): particles are drawn as additive points into a trail buffer that fades and bleeds each frame, followed by two bloom levels and a tone-mapped composite. Trails use `RGBA16F` when the browser can render to it and fall back to `RGBA8` otherwise. The composite also dims the swarm behind the reading column and draws pulse rings analytically.
- **Headings** (`js/modules/text-targets.js`): text is rasterized to an offscreen canvas and sampled on a jittered grid; bound particles spring to those points. The real headings remain in the DOM, transparent, for layout and screen readers.
- **Quality** (`js/modules/quality.js`): frame intervals are sampled in 2-second windows. Two slow windows in a row (under 55fps or p95 over 25ms) step down trail resolution, then particle count, then the far bloom, and finally switch to the still frame. A steady 30Hz display is not treated as slow.
- **Sound** (`js/modules/audio.js`): off by default. The toggle or `S` creates an `AudioContext` and a fully synthesized drone, a movement voice, a tick per generation and a thump per pulse. There are no audio files.

Tuning constants are collected in `js/modules/config.js`.

## Navigation

- Five sections with hash URLs: `#home`, `#work`, `#projects`, `#lab`, `#about`. Reload and back/forward work. The old `#technologies` hash maps to `#about`.
- Keys: `1`-`5` select a section, `ArrowLeft`/`ArrowRight` step, `Escape` returns home, `S` toggles sound.
- Hover or focus the `GEN` readout for the mean genes of the current population and a lineage reset.

## Local preview and checks

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

```bash
node --test tests/evolution.test.mjs
for f in js/main.js js/modules/*.js; do node --check "$f"; done
SWARM_PLAYWRIGHT=/path/to/playwright node tests/swarm-smoke.cjs
```

The smoke test accepts `SWARM_BASE_URL`, `SWARM_BROWSER` (`chromium`, `firefox`, `webkit`) and `SWARM_EXECUTABLE`. Headless browsers without WebGL2 skip the live checks and still verify the fallbacks.

URL parameters for debugging: `?debug=1` (exposes `window.swarmDebug`), `?enter=0` (skip the entrance), `?quality=off`, `?rgba8=1`, `?static=1`.

## Release cache

Local entrypoints, module imports, and the font URL use `v=20261119.1`. Bump the key everywhere together for a release.

## Author

Jujin Kim · [GitHub](https://github.com/jujinkim) · [LinkedIn](https://linkedin.com/in/jujinkim) · [jk@jujin.kim](mailto:jk@jujin.kim)

Personal portfolio — all rights reserved.
