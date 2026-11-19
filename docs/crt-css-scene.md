# CSS line-and-fill room and monitor — 2026-11-09

Branch: `feat/css-crt-scene`. Release key: `20261109.6`.

## Result

The room and monitor frame combine CSS line geometry with flat fills instead of generated imagery. The approved composition stays unchanged. This refinement adds solid surfaces and aligns the entire exterior with the green terminal palette, retaining exactly three colors. The exterior shares three opaque color tokens:

| Token | Color | Use |
| --- | --- | --- |
| `--scene-bg` | `#101c15` | Dark green ground and recessed panels |
| `--scene-line` | `#304d3b` | Muted green surfaces and structure lines |
| `--scene-accent` | `#86b493` | Pale green edges, sign, controls, LED |

The composition groups objects into a workspace: a large city window with curtain folds behind an articulated task lamp and speaker on the left; a shelf and terminal-prompt neon sign above an equipment rack on the right. The rack contains meters, patch sockets, fans, and drive bays. A keyboard and routed cable connect the foreground desktop. The wall planes use matching shallow oblique projections with 2D CSS transforms; equipment bases sit within the desk plane instead of floating above it. This keeps the schematic line composition consistent in Chrome and the local WebKit renderer, which flattened nested 3D wall projections differently. Stronger silhouette lines and quieter internal details establish visual hierarchy. Curtains, selected buildings, window bars, books, storage boxes, lamp, speaker, keyboard, and rack cases now use solid muted green fills. Walls, the desktop, and equipment recesses remain dark. Internal details switch to dark lines where needed to stay visible against the filled surfaces. No gradients, opacity blending, blur, cast shadows, or surface textures add colors. Browser edge antialiasing may interpolate those three authored colors.

The monitor uses a solid green body and stand, nested outlines with corner seams, dark vents and control strip, round adjustment knobs, and a square pale green LED. The glass opening retains its small corner radii. Existing content, profile/title imagery, and in-screen CRT effects remain. The decoration introduces no images, SVG, canvas, animation, or rendering loop.

`#room-scene` is a fixed sibling before `#monitor-shell`, outside the source DOM used by the curvature renderer. It is inert, `aria-hidden`, and ignores pointer input. The scene is behind the monitor and clips its own overflow. The decorative frame has no opaque center and cannot paint over the content opening.

The room appears only in CRT modes at viewport sizes of at least 1000x600. Compact screens retain a thin CSS shell. Web 1.0 and print hide the room, frame decoration, and stand. External scenery remains dark when the content theme changes. The same rules work without JavaScript.

The 4:3 monitor sizing, bezel thickness, outer clearance, and reserved stand height remain. Desk height is `clamp(112px, 20dvh, 320px)`. The stand neck begins below the casing; its foot occupies the lower 72% of the reserved stand area, preserving the ground position without overlapping the lower bezel. This fixes an overlap previously covered by the bitmap frame.

Removed `img/crt-room.webp` and `img/crt-bezel.webp`, totaling 135,128 bytes. Historical image-generation notes remain as design history. No public APIs, settings, storage keys, navigation, terminal behavior, or performance policy changed. Runtime JavaScript is byte-identical to the preceding commit after normalizing the release key.

## Verification

- Ten local Chrome 157 / WebKit 27.2 scenarios passed: desktop Light/Dark, portrait, 390px and 768px compact layouts, a 1440x500 short viewport, and JavaScript-disabled pages in both engines. They checked passive/inert scenery outside the renderer, no decoration animation, no page overflow, monitor hit testing, stand placement, menu interaction, print, and Web 1.0 transitions. Exterior computed styles contain no gradients, filters, backdrop filters, or soft shadows. The room contains no image, SVG, or canvas elements.
- Four palette/composition inspections passed in Chrome and WebKit, Light and Dark. Painted backgrounds, borders, outlines, and line copies resolve to exactly the three green colors above. No opacity, filter, or blend mode adds colors. Element bounds were identical to the approved pre-fill CSS for all scene objects, monitor parts, and the menu.
- Desktop Dark, WebKit Light, and compact compositions were visually reviewed. The existing curved-text clipping described in earlier verification remains outside this color/fill change.
- Runtime module/test syntax, synchronized cache keys, removed asset references, unchanged runtime JavaScript, and `git diff --check` passed. LAN-served HTML and both changed stylesheets match workspace bytes.

The approved `20261109.4` composition passed 22 `crt-feedback.cjs` layout and scroll-motion cases from 360px to 4K. The preceding `20261109.2` revision passed 105 `crt-browser.cjs` checks and 13 `crt-failures.cjs` checks, including navigation, edge interaction, selection/find, terminal/history, context loss, blocked storage/images/scripts, power sequence, and touch scrolling. Those broader suites were not rerun for this color/fill-only refinement.

Existing suite commands and external browser paths remain documented in [initial verification](crt-verification.md#reproduction). The focused script is `/tmp/jujin-crt-green-fills-check.cjs`. Fresh screenshots are under `/tmp/jujin-crt-results/green-fills-*`, with focused results in `green-fills-focused.json`, palette results in `green-fills-palette.json`.

These results cover local Linux browser automation over HTTP, including viewport emulation. No physical-device test or new FPS benchmark was performed. Remote Git publication and deployment are verified separately when pushing; GitHub Pages publishes only `main`. LAN preview: `http://192.168.1.111:8000/`.
