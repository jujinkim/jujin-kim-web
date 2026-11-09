# Jujin Kim Terminal Portfolio

Personal portfolio at [jujin.kim](https://jujin.kim), built with HTML, CSS, and vanilla ES modules. No framework, bundler, or runtime dependency.

## Display modes

| Environment | Display |
| --- | --- |
| Native HTML-in-Canvas and WebGL2 available | Curved CRT content |
| API unavailable, rendering/interaction error, or context loss | Flat CRT content; monitor and effects retained |
| Two consecutive slow interaction windows at the lowest resolution, or in flat CRT | Web 1.0 |

The same DOM supplies all three modes: Home, About & Career, Projects & Skills, and Tech & Experiences. Theme choices remain Light, Dark, and System. The monitor and surrounding room combine CSS line geometry with flat green fills. A large city window and articulated task lamp occupy the left; a wall shelf, terminal-shaped neon sign, and equipment rack occupy the right. The desk connects them around the central monitor, with a keyboard, speaker, and routed cable. The entire exterior shares exactly three authored colors: `#101c15` (ground), `#304d3b` (surfaces and structure), and `#86b493` (accents). Broad surfaces are solid colors, with no gradients, blur, or cast shadows. At viewport sizes of at least 1000 x 600, its 4:3 screen fills the available space without a fixed width cap, reserving room for a low stand on the desk. Outer clearance on the limiting axis equals the bezel thickness (24–56px). The stand stays near the bottom desk surface, including tall viewports; wider or taller viewports retain the extra space required by 4:3. Smaller viewports use thin bezels and available height. Layout breakpoints use the monitor's internal width. Home stays left; the other three menu links stay grouped on the right.

The first visit in each tab plays a silent 600ms power sequence. A small head script keeps screen content hidden before the modules initialize, preventing a fully lit frame before startup. Reload and navigation do not repeat the effect. Reduced motion or inaccessible session storage skips it. CSS finishes the reveal without depending on a cleanup callback. The initial guard releases on load or after 1500ms if startup fails; late modules skip the effect instead of hiding an already visible screen. JavaScript or module-network failure leaves static introductory content, contact links, and four section anchors visible.

## Renderer and input

`js/modules/screen-curvature.js` uses Chrome 157's native `content="drawable"`, `drawable`, `paint`, `texElementSubImage2D`, and `updateElementGeometry` APIs. No experimental feature flags, DOM screenshot library, live SVG displacement filter, or duplicate content tree.

Edge 156 (Chromium 156) does not provide this API by default and therefore shows flat CRT. Capability checks decide the mode, rather than browser-name/version checks. HTTP on the LAN works with the prepared Chrome 157 build; HTTPS is not the cause of the Edge 156 fallback. See [Chrome's API documentation](https://developer.chrome.com/docs/web-platform/html-in-canvas).

- Header, title, text, images, background, footer, and terminal share one barrel transform.
- 512px texture tiles and a 24-tile / 64MiB LRU limit bound GPU storage. Scrollable content is captured from its native scrollport, so snapshots include newly exposed rows. Tiles track which rows have actually been captured; scrolling uploads only uncached visible bands and refreshes a separate narrow scrollbar strip. Scroll events request a coalesced paint even when `changedElements` omits them. Source edits, loading, focus, selection, and theme changes invalidate cached pixels. GPU scissor rectangles limit drawing to each tile's visible area without uploading the full document.
- The animated starfield uploads its existing canvas bitmap directly to its own texture and passes through the same barrel shader. It shares the cache budget with DOM tiles, and its raster resolution follows measured quality changes.
- Pointer coordinates use the shader's inverse transform. Mouse selection stays a native DOM Range for copying and browser find. Touch scrolling, momentum, pinch zoom, and long-press selection use native browser gestures. Keyboard and accessibility geometry use a local affine approximation of the curve; the visible focus ring travels through the same shader as the content.
- Context loss or an input/rendering exception restores the original DOM in place. Section, scroll offsets, terminal input/history, and focus survive. Curvature setup follows the power sequence, avoiding clipped initial canvas snapshots.
- Hidden tabs stop rendering. Visibility restoration and `pageshow` refresh cached layers and reset pending paint requests. Decorative motion continues during scrolling; only measured sustained frame degradation lowers quality. Reduced motion retains the chosen display mode with stationary effects. Compact screens retain their existing stationary starfield.

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

Browser verification scripts in `tests/` use an external Playwright installation; they do not add a build pipeline or runtime package. See [startup verification](docs/crt-startup.md), [scroll rendering verification](docs/crt-scroll-rendering.md), [current CSS room/monitor verification](docs/crt-css-scene.md), [initial implementation verification](docs/crt-verification.md), and [layout/motion follow-up](docs/crt-feedback-verification.md) for commands, measured results, and limits. Earlier [room/monitor](docs/crt-room-refinement.md), [room depth/neon](docs/crt-room-depth.md), [material/color](docs/crt-material-refinement.md), [office background](docs/crt-office-background.md), and [painted room](docs/crt-painted-room.md) notes describe superseded image-based designs.

```sh
for file in js/main.js js/modules/*.js; do node --check "$file" || exit; done
git diff --check
```

## Assets and release cache

`#room-scene` is a static decorative sibling of the monitor, outside the curved content DOM. The composition separates distant wall fixtures from equipment resting on the foreground desk. Left and right wall planes use matching shallow oblique projections drawn with 2D CSS transforms, keeping their line composition consistent across browser engines. A large mullioned window, curtain folds, and skyline balance a shelf and terminal-prompt neon sign. An articulated lamp and speaker sit opposite a rack with meters, patch sockets, cooling fans, and drive bays. The keyboard and cable follow the desktop. Main silhouettes use accent outlines; internal details use quieter structure lines. Curtains, selected skyline blocks, window bars, furniture, lamp, keyboard, and equipment cases use solid muted green fills. Walls, the desktop, and recessed equipment panels retain the dark ground so the outlines remain legible. The three opaque colors live in `--scene-bg`, `--scene-line`, and `--scene-accent`. No gradients, translucency, or surface shading adds colors. Desk height is `clamp(112px, 20dvh, 320px)`. The scenery stays dark in both content themes. It is inert, hidden from accessibility APIs, and ignores pointer input.

The bezel uses a solid green body with nested outlines, corner seams, dark vents, and a separate dark control strip around an unpainted center. The stand, round adjustment knobs, rocker, and LED share the same three-color palette, with no simulated bevels or material shading. The room and bezel WebP files have been removed; no replacement image, SVG, canvas, blur filter, animation, or rendering loop is used for these decorations. Existing profile/title assets and screen effects remain. Compact layouts hide the room and retain thin CSS bezels. Web 1.0 and print hide the room, decorative frame, and stand. No settings or public JavaScript interfaces were added.

Local entrypoints, module imports, fonts, and favicons use `v=20261110.2`. Bump the release key together for runtime releases.

## Author

Jujin Kim · [GitHub](https://github.com/jujinkim) · [LinkedIn](https://linkedin.com/in/jujinkim) · [jk@jujin.kim](mailto:jk@jujin.kim)

Personal portfolio — all rights reserved.
