# Project Agent Guide

## Snapshot
- **Terminal Portfolio**: A terminal-inspired, single-page portfolio website for Jujin Kim mimicking a CLI interface.
- **Tech Stack**: Pure HTML5, CSS3 (custom variables + custom styling), and vanilla JS (ES6 modules) with no framework or build tooling.
- **Entry Point**: `index.html` -> `js/main.js` -> modules in `js/modules/`.
- **Shared Constants**: Live in `js/constants.js` (e.g., `CONTACT_EMAIL`).

---

## Project Structure
```
jujin_kim_web/
├── index.html
├── css/
│   ├── reset.css
│   ├── site.css          # Main terminal styles
│   ├── animations.css    # Starfield background & other transitions
│   ├── modal.css         # Modal dialog styling
│   └── responsive.css    # Responsive layouts for mobile/tablet/desktop
├── js/
│   ├── main.js           # App initialization
│   ├── constants.js      # Global/shared constants (e.g. CONTACT_EMAIL)
│   └── modules/
│       ├── ascii-art.js        # Home ASCII title & art helpers
│       ├── navigation.js       # Section navigation & key shortcuts
│       ├── animations.js       # Swarm background on #starfield (drives world.js)
│       ├── world.js, sim.js, evolution.js, renderer.js, shaders.js,
│       │   input.js, quality.js, text-targets.js, audio.js, config.js   # Swarm internals
│       ├── theme.js            # Theme switching mechanics (light/dark/system)
│       ├── theme-export.js     # Helper functions for exporting themes
│       ├── content.js          # Main content templates for all sections
│       ├── terminal-input.js   # Terminal command parser & input logic
│       └── profile-ascii.js    # Profile picture loader (photo-only)
├── img/
│   ├── ascii-title.svg
│   ├── ascii-title-light.svg
│   ├── ascii-title-dark.svg
│   └── profile.jpg       # Profile picture (JPEG format)
├── fonts/
│   └── JetBrainsMono-Regular.woff2
├── favicon.ico
├── favicon.svg
├── README.md
└── AGENTS.md             # This guide
```

---

## Active Focus & Key Behavior

### 1. Style & Theme Mechanics
- **Monospace Terminal Aesthetic**: Monospace typography, green accent palette, and customized ASCII styling.
- **CSS Variables**: Core theme variables (colors, fonts, etc.) are declared in `:root` inside `css/site.css` and adjusted dynamically via `js/modules/theme.js`.
- **Theme Selection**: Driven by `window.setTheme` (exposed globally in `js/main.js`) and triggered by the footer links.

### 2. Navigation & Commands
- **Keyboard Navigation**:
  - `Shift+1~4`: Instantly switch between corresponding sections.
  - `ESC`: Return directly to the Home section.
- **Terminal Input (Home section only)**:
  - Command handling resides in `js/modules/terminal-input.js`.
  - Supported commands: `help`, `clear`, `about`, `skills`, `contact`, `date`, `ls`, `cd`, `cat`, `open`, `lamp`, `pulse`, `theme`, `room`, `reboot`, `swarm`, `gen`, `reset`, `sound`.

### 3. Content & Shared Values
- **Content Rendering**: All section contents (HTML templates) are rendered dynamically via `load*Section` helpers in `js/modules/content.js`.
- **Authoritative Constants**: Keep key contact details (like email address) authoritative by consuming `CONTACT_EMAIL` from `js/constants.js`.
- **Contact Links**: Contact details are integrated into the Home section; there is no separate Contact page.

---

## Coordination Checklist

1. **Content updates** -> edit the relevant `load*Section` function in `js/modules/content.js`.
2. **Shared values** -> prefer adding to/consuming from `js/constants.js`.
3. **Terminal commands** -> adjust command handlers or prompt behaviors in `js/modules/terminal-input.js`.
4. **Navigation & section switching** -> check `js/modules/navigation.js`.
5. **Swarm background** -> `js/modules/animations.js` wires it to the screen; tuning lives in `TUNING` in `js/modules/config.js`. The room, monitor and terminal are the base; the swarm is only the screen's background and must stay dim enough that text is easy to read. The owner is an engineer: do not call them an artist in copy.
6. **Theme behavior** -> update color variables or toggle states in `js/modules/theme.js` (along with `window.setTheme` handling).
7. **Visual styling** -> touch only the relevant scoped CSS files (`css/site.css` for main styles, `css/responsive.css` for media queries).

---

## Coding Guidelines

- **Visual scope**: Preserve the terminal layout, ASCII title, green palette, four tabs, and monitor frame. Refine requested effects inside this shell unless the user explicitly requests a structural redesign.

- **Compact screens**: Enable curvature only at viewport sizes of at least 1000x600. Smaller viewports use flat CRT with native DOM input/scrolling and no curved-glass shading. Preserve state when crossing the breakpoint.

- **Release caching**: Keep local entrypoints, module imports (including dynamic imports), font URLs, and favicon links on the same `v=20261119.6` release key. Bump the key together for runtime releases.

- **Vanilla ES6 Modules**: Stick strictly to ES6 modules and template literals. Avoid introducing frameworks, compiler steps, or external build pipelines.
- **ASCII & Text**: Use ASCII characters unless a file already mixes in Unicode (such as emoji in content templates).
- **Inline Comments**: Keep inline comments minimal, purposeful, and clean.
- **Adding Files**: When creating new modules, favor descriptive names and export clean module-scoped functions/constants.
- **Manual Testing**:
  - Open `index.html` directly in the browser, or
  - Start a static local server via Python:
    ```bash
    python3 -m http.server 8000
    ```

---

## Key Contacts & Links
- **GitHub**: [@jujinkim](https://github.com/jujinkim)
- **Website**: [jujin.kim](https://jujin.kim)
- **Email**: [jk@jujin.kim](mailto:jk@jujin.kim)

---

## Entrance, living room and terminal presentation

- **Base**: the room, the monitor and the terminal are the site. The owner is an engineer first; effects exist to make that base feel alive, not to replace it.
- **Entrance** (`js/modules/entrance.js`, `css/scene-motion.css`): once per tab. `html[data-entrance]` goes `dark` -> `boot` -> `dolly` and is then removed. The existing 600ms power-on runs first, a boot log prints real values, then `desktop-scene.js` `setCamera(0..1)` moves from the wide shot to the reading position. Any key, press or wheel skips it. It is skipped for reduced motion, web1 and repeat visits. Curvature and tilt start only after it ends; the monitor must be back at `transform: none`.
- **Room** (`js/modules/room-life.js`): every moving object is tied to a real signal (swarm generation and energy, terminal commands, section changes, local time). Do not add decorative random motion. Only `transform` and `opacity` animate. `stillRoom()` stops it when frames run slow.
- **Terminal presentation** (`js/modules/section-reveal.js`): `navigation.js` dispatches `section-changed`; the prompt line types the command and the section prints block by block (never per character: curved mode re-uploads tiles on every DOM change). The section is in the DOM immediately; any input finishes the printing.
- **Commands**: add with `registerCommand(name, help, run)` in `terminal-input.js`; `help` is generated from the table.
- **Check**: `ALIVE_PLAYWRIGHT=/path/to/playwright node tests/alive-smoke.cjs` (runs in flat mode, no HTML-in-Canvas needed).

## 3D room

- **What it is** (`js/modules/room3d.js`, `js/vendor/three.min.js`): the room, desk and monitor case are a three.js scene on `canvas#room3d`. The terminal is still real DOM: the monitor model is built around the measured `#monitor-glass` rectangle, and the resting camera uses an off-axis frustum that keeps the screen plane pixel-fixed. `#monitor-shell` must compute to `transform: none` whenever the visitor is reading, including while the pointer moves the camera.
- **Away from rest** (entrance flight, `room` command, pressing the room): `#monitor-shell` follows the camera through a `matrix3d` and takes no pointer input. Any key or press returns.
- **State**: `html[data-room3d]` is `loading` from the head script, `on` when the scene is ready, and removed when 3D is unavailable (no WebGL2, software renderer, context lost, slow frames). Without it the CSS room in `#room-scene` is the room, so keep both working. `?room3d=off` and `?room3d=force` override the choice.
- **Phones**: the 3D room is drawn only during the entrance and the `room` view; while reading the canvas is `display: none`.
- **Signals**: `room-life.js` stays the single source. It drives the CSS room and mirrors every signal into `room3d` (`setLevels`, `setFan`, `flash`, `setLamp`). Sky, window light and lit windows follow the visitor's clock.
- **Performance ladder** (`crt-effects.js` `degrade`): still the room (no ambient motion, 1x pixel ratio) -> render at 0.7x -> drop 3D for the tab -> the existing display steps. Pointer tracking is never switched off while the 3D room is on; the one-slow-sample rule in `desktop-scene.js` applies only to the CSS room.
- **Vendor**: `js/vendor/three.min.js` is a tree-shaken bundle of three r187. To change what it exports, edit `js/vendor/three.entry.js` and rebuild in a scratch folder with `npm i three@0.187.0 && npx esbuild three.entry.js --bundle --minify --format=esm --target=es2020 --outfile=three.min.js`. This is a one-off; the site still has no build step.
