# Jujin Kim Terminal Portfolio

Personal portfolio at [jujin.kim](https://jujin.kim), built with HTML, CSS, and vanilla ES modules. No framework, bundler, or runtime dependency.

## Display modes

| Environment | Display |
| --- | --- |
| Native HTML-in-Canvas and WebGL2 available | Curved CRT content |
| API unavailable, rendering/interaction error, or context loss | Flat CRT content; monitor and effects retained |
| Two consecutive slow interaction windows at the lowest resolution, or in flat CRT | Web 1.0 |

The same DOM supplies all three modes: Home, About & Career, Projects & Skills, and Tech & Experiences. Theme choices remain Light, Dark, and System. The charcoal monitor and room share a painted, semi-realistic game-art style: broad shaded bevels, a deep glass recess, simplified vents and controls, and a green power LED. At viewport sizes of at least 1000 x 600, its 4:3 screen fills the available space without a fixed width cap, reserving room for a low stand on the desk. Outer clearance on the limiting axis equals the bezel thickness (24–56px). The stand stays near the bottom desk surface, including tall viewports; wider or taller viewports retain the extra space required by 4:3. Smaller viewports use thin bezels and available height. Layout breakpoints use the monitor's internal width. Home stays left; the other three menu links stay grouped on the right.

The first visit in each tab plays a silent 1000ms power sequence. Reload and navigation do not repeat it. Reduced motion or inaccessible session storage skips it. CSS finishes the reveal without depending on a cleanup callback. JavaScript or module-network failure leaves static introductory content, contact links, and four section anchors visible.

## Renderer and input

`js/modules/screen-curvature.js` uses Chrome 157's native `content="drawable"`, `drawable`, `paint`, `texElementSubImage2D`, and `updateElementGeometry` APIs. No experimental feature flags, DOM screenshot library, live SVG displacement filter, or duplicate content tree.

Edge 156 (Chromium 156) does not provide this API by default and therefore shows flat CRT. Capability checks decide the mode, rather than browser-name/version checks. HTTP on the LAN works with the prepared Chrome 157 build; HTTPS is not the cause of the Edge 156 fallback. See [Chrome's API documentation](https://developer.chrome.com/docs/web-platform/html-in-canvas).

- Header, title, text, images, background, footer, and terminal share one barrel transform.
- 512px texture tiles, a 24-tile / 64MiB LRU limit, changed-element invalidation, narrow scrollbar updates, and GPU scroll offsets avoid uploading the full document on each frame. GPU scissor rectangles limit drawing to each tile's visible area.
- The animated starfield uploads its existing canvas bitmap directly to its own texture and passes through the same barrel shader. It shares the cache budget with DOM tiles, and its raster resolution follows measured quality changes.
- Pointer coordinates use the shader's inverse transform. Mouse selection stays a native DOM Range for copying and browser find. Touch scrolling, momentum, pinch zoom, and long-press selection use native browser gestures. Keyboard and accessibility geometry use a local affine approximation of the curve; the visible focus ring travels through the same shader as the content.
- Context loss or an input/rendering exception restores the original DOM in place. Section, scroll offsets, terminal input/history, and focus survive. Curvature setup follows the power sequence, avoiding clipped initial canvas snapshots.
- Hidden tabs stop rendering. Decorative motion continues during scrolling; only measured sustained frame degradation lowers quality. Reduced motion retains the chosen display mode with stationary effects. Compact screens retain their existing stationary starfield.

`js/modules/display-performance.js` samples actual interaction rAF intervals over 2-second windows after a 3-second startup grace period. Resize and visibility changes exclude another 1.5 seconds. Idle periods do not contribute. Target: average >=55fps and p95 <=25ms on a 60Hz display. Two consecutive failing windows lower resolution through 1.0, 0.8, and 0.6 (initial DPR capped at 2). Continued failure selects Web 1.0 for the remainder of the tab session. No automatic oscillation back to CRT.

Web 1.0 uses a gray surface, system font, blue underlined links, purple visited links, and simple borders/buttons; Dark and System choices still work. It destroys WebGL resources, stops effect listeners/timers, releases the background canvas, and removes CRT overlays and the room background. Mobile, reduced motion, or unsupported curvature alone never select this mode.

## Navigation

- Four menu links support hashes, reload, and browser back/forward.
- Desktop: `1`-`4` (also `Shift+1`-`4`) select a section; `Escape` returns Home.
- `/` or the footer terminal button opens the terminal. `ArrowUp`/`ArrowDown` recall command history. Terminal typing does not trigger menu shortcuts.
- Existing commands: `help`, `clear`, `about`, `skills`, `contact`, `date`, `ls`, `cat`, `matrix`.
- The existing compact/coarse-pointer terminal restriction is retained.
- `window.setTheme(mode)` and `navigateToSection(sectionId)` remain available through their existing interfaces.

## Local preview and checks

Serve over HTTP so ES modules load:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/`. Diagnostic routes:

- `/?crt-preview=1`: native curve when supported.
- `/?crt-preview=1&crt-mode=flat`: flat CRT.
- `/?crt-preview=1&crt-mode=web1`: Web 1.0.

`window.crtDiagnostics` exposes mode, reason, recent frame windows, texture counters, and resolution. Only preview URLs expose `forceFlat()`, `forceWeb1()`, `submitSample()`, and `toScreen()` for verification. Forced preview modes override the saved visit choice; a normal visit respects it.

Browser verification scripts in `tests/` use an external Playwright installation; they do not add a build pipeline or runtime package. See [initial implementation verification](docs/crt-verification.md), [layout/motion follow-up](docs/crt-feedback-verification.md), [room/monitor refinement](docs/crt-room-refinement.md), [room depth/neon update](docs/crt-room-depth.md), [material/color refinement](docs/crt-material-refinement.md), [office background](docs/crt-office-background.md), and [current painted room/monitor](docs/crt-painted-room.md) for commands, measured results, and limits.

```sh
for file in js/main.js js/modules/*.js; do node --check "$file" || exit; done
git diff --check
```

## Assets and release cache

`img/crt-room.webp` is a generated painted night office with a rear worktable, office chair, document storage, and heavy window curtains. Simplified charcoal/slate forms and soft edges replace photographic surface detail; cyan/violet neon, window light, and painted desk reflections provide selective color. The room image is 40,708 bytes. Landscape framing keeps both side bands visible; tall viewports focus on the doorway and neon side. No live blur filter is used.

`img/crt-bezel.webp` is a 94,420-byte generated transparent frame used as a CSS nine-slice border. Broad painted bevels, fewer vents, and muted blue/mauve edge lighting match the room. Its screen opening and outside are transparent; it never replaces the content DOM. Separate decorative dials retain their proportions as the frame grows; the CSS stand and controls use the same restrained shading. Both assets are desktop CRT decorations, hidden in compact layouts and Web 1.0. CSS provides a matching shell if the frame image fails. Prompts and provenance are in [painted room/monitor notes](docs/crt-painted-room.md).

Local entrypoints, module imports, fonts, favicons, and generated assets use `v=20261108.1`. Bump the release key together for runtime releases.

## Author

Jujin Kim · [GitHub](https://github.com/jujinkim) · [LinkedIn](https://linkedin.com/in/jujinkim) · [jk@jujin.kim](mailto:jk@jujin.kim)

Personal portfolio — all rights reserved.
