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
│       ├── daylight.js         # Sun over Suwon: the sky's seven moods, one-minute clock
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
  - Supported commands: `help`, `clear`, `about`, `skills`, `contact`, `date`, `ls`, `cd`, `cat`, `open`, `lamp`, `sky`, `pulse`, `theme`, `room`, `perf`, `reboot`, `swarm`, `gen`, `reset`, `sound`.

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

- **Release caching**: Keep local entrypoints, module imports (including dynamic imports), font URLs, and favicon links on the same `v=20261121.2` release key. Bump the key together for runtime releases.

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
- **Room** (`js/modules/room-life.js`): every moving object is tied to a real signal (swarm generation and energy, terminal commands, section changes, the sun over Suwon). Do not add decorative random motion. Only `transform` and `opacity` animate. `stillRoom()` stops it when frames run slow.
- **Terminal presentation** (`js/modules/section-reveal.js`): `navigation.js` dispatches `section-changed`; the prompt line types the command and the section prints block by block (never per character: curved mode re-uploads tiles on every DOM change). The section is in the DOM immediately; any input finishes the printing.
- **Commands**: add with `registerCommand(name, help, run)` in `terminal-input.js`; `help` is generated from the table.
- **Check**: `ALIVE_PLAYWRIGHT=/path/to/playwright node tests/alive-smoke.cjs` (runs in flat mode, no HTML-in-Canvas needed).

## 3D room

- **What it is** (`js/modules/room3d.js`, `js/vendor/three.min.js`): the room, desk and monitor case are a three.js scene on `canvas#room3d`. The terminal is still real DOM: the monitor model is built around the measured `#monitor-glass` rectangle, and the resting camera uses an off-axis frustum that keeps the screen plane pixel-fixed. `#monitor-shell` must compute to `transform: none` whenever the visitor is reading, including while the pointer moves the camera.
- **Away from rest** (entrance flight, `room` command, pressing the room): `#monitor-shell` follows the camera through a `matrix3d` and takes no pointer input. Where the room was pressed sets the side the camera steps back to. In the `room` view a drag orbits the camera around the monitor (clamped inside the walls), the wheel, a pinch or `+`/`-` zooms, arrow keys orbit. Only pressing the monitor returns to reading; pressing bare room does nothing. `Esc` steps back one level (close-up -> room view -> reading); no other key leaves.
- **Close-ups** (`room3d.focus(id)`, `html[data-room-focus]`): in the `room` view the handheld (`console`), the `phone`, the shelf (`books`) and the `window` can be pressed and the camera flies to a pose computed in `layout()` (`S.poses.focus`). Orbit and zoom are off there; `Esc`, `#focus-back` or a press beside the thing returns to the room view. `room window|console|phone|books` goes straight there.
  - Targets are boxes in an object's own space (`buildTargets`); `pick()` casts the pointer ray against them by hand (the vendored bundle has no `Raycaster`). The outline follows the thing's own silhouette: mask copies of its meshes mark the stencil, slightly larger additive copies are drawn everywhere but there (`addTarget`), so it is occluded like anything else. It fades in and out faintly and is full strength under the pointer (`html[data-room-hover]`); this breathing is the one room motion that is an affordance rather than a signal. The cursor is `move` over bare room and a hand over a target.
  - `console`: `#focus-console-top` / `#focus-console-bottom` are DOM panels laid on the two LCDs with a `matrix3d` (`LCD` in `room3d.js`, `cssMatrix()` is shared with the monitor shell). Their content is still `TODO: implement` in `index.html`. In the room the screens are off.
  - `phone`: a black slab left of the keyboard, screen off. Up close `#focus-phone` is laid on the screen the same way: a home screen whose icons are the links in `PHONE_APPS` (`js/constants.js`), rendered by `loadPhoneHome` in `content.js`.
  - `books`: each spine with an entry in `BOOK_LINKS` (`js/constants.js`, left to right) can be pressed and opens its link; `#focus-books` lists the same links.
  - `drink`: the bottle and glass are a quiet target (`quiet: true`: no outline, no hand cursor); pressing them shows `#focus-drink`.
  - `window`: the camera stands at the right-hand pane looking up, so the sky fills the view. `animations.js` passes `room3d.focused === 'window'` to `world.setSky(rect, direct)`: the pointer is then the flock's light and a press pulses where it was pressed.
- **State**: `html[data-room3d]` is `loading` from the head script, `on` when the scene is ready, and removed when 3D is unavailable (no WebGL2, software renderer, context lost, slow frames). Without it the CSS room in `#room-scene` is the room, so keep both working. `?room3d=off` and `?room3d=force` override the choice.
- **Look**: the room is rendered in chunky pixels (`PIXEL` CSS pixels per rendered pixel, `image-rendering: pixelated`, no antialiasing); the DOM screen stays sharp. This is also what keeps it cheap.
- **Swarm in the sky**: with the 3D room on a desktop, `animations.js` moves `#starfield` out of the monitor to a full-viewport layer behind `canvas#room3d` (class `in-sky`). The room canvas has alpha and the sky part of the city texture is written transparent with no blending, so the window is a hole the swarm and the body's `--room-sky` gradient show through, correctly hidden by anything in front. `room3d.skyRect()` tells the swarm where the window is on screen; the flock's light is mapped into it. Without the 3D room (phones while reading, CSS room) the swarm stays the screen's background.
- **Display mode**: curvature (`screen-curvature.js`) is not started while the 3D room is on; the screen is flat DOM with the CRT overlays.
- **Entrance**: the camera starts in the hallway, the door opens, it walks to the desk in `WALK_MS` (1s), then the monitor powers on, the boot log prints and the lights come up. The DOM screen is hidden during the walk (`html[data-entrance-walk]`) because DOM cannot be occluded by the door.
- **Phones**: the 3D room is drawn only during the entrance and the `room` view; while reading the canvas is `display: none`.
- **Signals**: `room-life.js` stays the single source. It drives the CSS room and mirrors every signal into `room3d` (`setLevels`, `setFan`, `flash`, `setLamp`). Sky, window light and lit windows follow the real sun over Suwon, not the visitor's clock: `daylight.js` computes the sun's position and today's dawn, sunrise, noon, sunset and dusk there, blends seven moods (night, dawn, sunrise, day, afternoon, sunset, evening) between those moments and calls back once a minute. The window faces north: no direct sun, only skylight that leans in from the sun's side, so the shadows swing during the day. The room stays dim and the desk lamp starts off (`lamp on`). `sky HH:MM|<mood>|now` holds the sky at a moment for a look. Check the maths with `node --test tests/daylight.test.mjs`.
- **Performance ladder** (`crt-effects.js` `degrade`): still the room (no ambient motion, 1x pixel ratio) -> render at 0.7x -> drop 3D for the tab (only when the last sample is under 30fps or p95 over 50ms; otherwise the ladder stops here) -> the existing display steps. Pointer tracking is never switched off while the 3D room is on; the one-slow-sample rule in `desktop-scene.js` applies only to the CSS room.
- **Vendor**: `js/vendor/three.min.js` is a tree-shaken bundle of three r187. To change what it exports, edit `js/vendor/three.entry.js` and rebuild in a scratch folder with `npm i three@0.187.0 && npx esbuild three.entry.js --bundle --minify --format=esm --target=es2020 --outfile=three.min.js`. This is a one-off; the site still has no build step.
