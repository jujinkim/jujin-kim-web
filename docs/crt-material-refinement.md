# Material, tone, and neon refinement — 2026-11-07

Branch: `feat/crt-monitor-shell`. Release key: `20261107.5`.

## Result

The room keeps its perspective and furnishings, with darker, less saturated charcoal/neutral-wood grading. Warm lamp light and plant color are reduced. Neon now uses layered bent-glass tubes, mounting hardware, bright pale cores, localized cyan/violet bloom, and stronger window/desk reflections. The surrounding room retains readable shadows.

The desktop monitor now uses a generated textured front frame with molded plastic grain, casing seams, corner screws, vents, and a deep glass gasket. Its alpha-transparent opening is not part of the content. CSS nine-slice rendering fits the existing monitor geometry; separate decorative dials and a rocker preserve their proportions. The frame is `aria-hidden` and ignores pointer events. The original DOM, native curve, selection, terminal, navigation, and animation behavior continue underneath.

Desktop bezel/outer clearance is now 24–56px, with a taller lower control band. The 4:3 screen still maximizes the available space including the stand: about 1124x843px at 1920x1080. Compact layouts use the CSS shell; Web 1.0 and print hide the detailed frame. If the bitmap fails, the CSS shell and content remain visible. No live full-screen filter or new animation loop was added.

## Verification

- 93 browser assertions passed: layout in both themes and all three modes, curved edge clicks, native selection/find, terminal/history, hash/back, context-loss preservation, quality transitions, and hidden-tab behavior.
- 13 failure/compatibility assertions passed: blocked storage/images/scripts, JavaScript disabled, startup/reduced motion, copy/paste, touch scrolling, and WebKit automatic flat fallback/navigation/theme.
- 22 layout/scroll-motion cases passed from 360px to 4K, including portrait. These check the larger bezel, 4:3 fit, stand placement, menu alignment, and ongoing animation during scroll.
- Four focused Chrome 157 / WebKit 27.2 checks passed at 1920x1080 in Light/Dark: the detailed frame loads, ignores pointer events, allows menu activation, and disappears on Web 1.0 transition. Final composed Chrome Dark and WebKit Light screenshots were visually reviewed.
- The encoded frame retains alpha zero at its center. Both assets and HTML return HTTP 200 over the LAN; asset bytes match the workspace. Runtime URLs use `20261107.5`; `node --check` and `git diff --check` pass.

Artifacts: `/tmp/jujin-crt-results/material-*`, `results.json`, `failures.json`, and `feedback.json`. All checks are local Linux browser automation. No physical Windows Edge testing, new FPS claim, push, or deployment is implied.

## Asset provenance

All raster assets were made with built-in **imagegen**, then encoded with FFmpeg:

| Saved asset | Size | Dimensions | Encoding |
| --- | ---: | --- | --- |
| `img/crt-room.webp` | 48,826 bytes | 1672x941 | WebP quality 80 |
| `img/crt-bezel.webp` | 181,560 bytes | 1402x1122 | WebP quality 85, alpha retained |

Room final source: `/home/jujin/.codex/generated_images/01a1b46a-a4ef-72e0-a2c4-bea7c5e08e46/exec-bfd0f4bf-3cfc-4e84-bd3a-0572bb3a518b.png`. The first grading edit used the previous release's room asset and produced `exec-62af7e84-c6f3-4a5a-bed8-0e4fd9996299.png` in the same directory; the final emission edit used that intermediate image.

Frame source: `/home/jujin/.codex/generated_images/01a1b46a-a4ef-72e0-a2c4-bea7c5e08e46/exec-336b1d10-3c04-4093-9eda-a3932819e853.png`. Alpha inspection determined border slices of 137px top, 205px right, 228px bottom, and 199px left. CSS supplies the label, green LED, and proportion-preserving decorative controls.

### Room grading and signage prompt

```text
Edit the provided room image. Preserve its camera, composition, room geometry, doorway, furniture positions, curtained window, and empty foreground desk exactly. It is the background behind a large separately rendered HTML monitor, so keep the central desk empty and do not add any screen or monitor.
Adjust the overall color grade slightly darker and noticeably less saturated: reduce warm brown/orange and plant greens toward charcoal, slate, and neutral weathered wood. Retain readable shadow detail and spatial depth; do not crush the room to black. Dim the warm table lamp substantially so it does not make the room cozy.
Make the neon signage feel richer and more authentic. Replace the two simple outlined squares at the far right with a compact, layered arrangement of bent-glass neon tubes: a vertical abstract emblem, short staggered linework, a small secondary tube detail, and visible dark mounting hardware. No readable words or logos. Keep it within the same far-right side band so the HTML monitor will not hide it. Fine pale luminous cores, mostly icy grey-cyan with a restrained dusty violet accent, local bloom and soft reflected highlights on nearby shelf and desk. The neon itself should read clearly and have more detail and depth, while the overall room stays muted and desaturated. Echo a faint cool neon reflection in the left window glass and curtain folds, without introducing a large new lamp.
Keep the semi-realistic cinematic room style and believable material texture. No basement, server room, industrial pipes, cables, fog, people, extra computer, or giant colored floodlights. Only refine the grade and neon lighting/signage; keep the existing scene and foreground geometry.
```

### Final neon emission prompt

```text
Refine ONLY the neon emission in this image. Preserve the desaturated room grade, darker neutral wood, camera, all furniture and geometry, curtain and window, floor and empty desk, and the exact neon tube design and mounting hardware. The present sign looks a little too much like unlit piping. Make its lit tube cores unmistakably luminous, with brighter pale-white cyan cores and a brighter pale dusty-violet accent, layered soft local halation and a gentle secondary glow. Strengthen the reflected neon highlights in the window and on the right edge of the desk so the light feels rich and physical. Keep these changes confined to the sign and its reflections; retain the overall dark, low-saturation room and all shadow detail. No saturated RGB flood, no fog, no new objects, no text, no monitor. The final effect should be a richer authentic neon-sign atmosphere in the same subdued room, not a brighter room overall.
```

### Monitor frame prompt

```text
Use case: product-mockup.
Asset type: transparent front-face bezel texture for an interactive HTML CRT monitor, intended for CSS nine-slice border rendering.
Create ONLY the detailed outer plastic front frame of a vintage professional 4:3 CRT computer monitor. Exact straight-on orthographic view, symmetrical rectangular face, no perspective tilt, no visible back, no stand, no desk, no room. The central screen opening must be completely transparent alpha, not black, not glass, not a checkerboard painted into the image. The outside around the frame must also be transparent. No screen content, no reflections across the transparent central opening.
Composition and dimensions: landscape image with outer-frame aspect ratio approximately 1.25:1. The central opening is a wide rounded rectangle with 4:3 aspect ratio. Left and right frame bands each roughly 10 percent of total width, top frame band roughly 10 percent of total height, bottom control-panel band roughly 15 percent of total height. Keep the frame centered and close to all four image edges with only minimal transparent outer margin.
Design: substantial molded charcoal ABS plastic, believable fine pebbled texture, inset concentric chamfers around the opening, a dark rubber gasket lip, a thin recessed casing seam along the outer perimeter, restrained wear on edge highlights, small countersunk screws at the four corners, precisely molded vents along the upper edge and lower side areas. Bottom band has a small blank recessed maker plate on the far left, a recessed control cluster on the far right with two knurled adjustment wheels, two small square mechanical buttons, and one tiny unlit indicator lens. Keep the middle of the bottom band mostly plain textured plastic so it can stretch horizontally. Rich manufactured detail with coherent shadows; this must not look like a simple smooth rounded rectangle or a modern thin LCD frame.
Lighting: subdued neutral graphite, soft cool grey-cyan edge light from the left, extremely faint muted mauve rim reflection at the far right, deep recessed shadows. Semi-realistic product rendering matching a moody dark room. No saturated RGB strips, no rusty industrial grunge, no glossy chrome, no logos, no lettering, no readable text. Preserve a fully transparent screen hole and fully transparent outside; opaque material only on the physical frame itself.
```
