# Painted room and monitor — 2026-11-08

Branch: `feat/crt-monitor-shell`. Release key: `20261108.1`.

## Result

The office and monitor now share a painted, semi-realistic adventure-game style. Broad charcoal/slate planes, selective brush texture, and muted blue/mauve edge lighting replace photographic wood grain, plastic grain, dense vents, and tiny material details. The office layout, heavy curtains, neon emblem, window/desk reflections, and empty desk foreground remain. Soft painted background edges retain the earlier gentle depth treatment without a live blur.

The frame keeps its deep glass recess, substantial bevels, simplified corner fasteners, and fewer vents. CSS supplies the matching faceted stand, proportional controls, green LED, and compact/image-failure shell. The source alpha geometry uses nine-slice values of 139px top, 206px right, 231px bottom, and 202px left. No center fill is used, so the border image never paints over the content opening.

Monitor dimensions, 4:3 desktop geometry, menu alignment, content, animation behavior, and input logic are unchanged. HTML and JavaScript match the preceding commit after normalizing the release key.

## Assets

Built-in **imagegen** edited both existing assets. The new room was then used as a style/lighting reference for the bezel. FFmpeg/libwebp encodes the selected outputs into the workspace.

| Saved asset | Dimensions | Bytes | WebP quality |
| --- | --- | ---: | ---: |
| `img/crt-room.webp` | 1672x941 | 40,708 | 82 |
| `img/crt-bezel.webp` | 1402x1122 | 94,420 | 85 |

Source directory: `/home/jujin/.codex/generated_images/01a1b46a-a4ef-72e0-a2c4-bea7c5e08e46/`.

- Room: `exec-f11e41d0-a158-4bfa-8e64-32cedf8cc0a7.png`.
- Bezel: `exec-5e3f7f2f-b5ac-462c-bd99-393e601ea25d.png`.

The bezel retains alpha: its center pixel is zero, and the sampled central opening ranges from 0 to 2/255 due to negligible edge noise. CSS omits the nine-slice center entirely. Both assets remain desktop CRT decorations; compact layouts do not load them, and Web 1.0 hides them.

### Room edit prompt

```text
Use case: style-transfer.
Edit target: the supplied dark office background. Restyle it into a HAND-PAINTED, SEMI-REALISTIC 2.5D ADVENTURE GAME ENVIRONMENT, a quiet cyberpunk hacker's workspace. The main change must be clearly visible: replace photographic surfaces with designed shapes, broad painterly light/shadow planes, softly faceted furniture, and restrained drawn edge accents. Keep believable room depth and weight. Think carefully art-directed game background illustration, neither a photograph nor a plastic toy render, neither pixel art nor flat icons.
Preserve the exact camera, framing and object positions: heavy dark curtains and city window on the left, side shelving with books and document binders, modest office desk/chair and filing unit at the rear, doorway on the right, layered bent-tube neon emblem at the far right. Keep the entire large foreground desk EMPTY, its straight rear edge at the same height. Do not add a monitor, bezel, stand or computer anywhere; a real interactive HTML monitor will be placed on this desk.
Use a tightly controlled low-saturation palette: charcoal/slate room, dark grey wood with a few broad brush marks rather than fine wood grain, muted blue-grey edge light from the window, soft dusty violet/cyan neon light from the right. Preserve the neon design and its reflection in the window and foreground desktop, interpreted as deliberate painted luminous shapes with soft bloom. Keep the room dim but readable, no bright warm cozy light. Reduce furniture microdetail, leaf detail, textile weave, clutter, glossy reflections and photographic noise. The silhouette, shading and edge treatment should unite everything.
Retain gentle depth softness in the BACKGROUND as painted soft edges, while avoiding smeared heavy blur. This is a matte painted game scene with clear large forms and subtle material texture. Foreground desktop should have simplified horizontal painted reflections and enough solid form to support a separately rendered monitor. No people, text, logos, additional objects, fantasy machinery or basement pipes. Output the room alone with the original landscape composition.
```

### Bezel edit prompt

```text
Use case: style-transfer.
Image 1 is the EDIT TARGET: transparent front-face CRT bezel. Image 2 is ONLY the STYLE AND LIGHTING REFERENCE: painted cyberpunk office. Output ONLY the edited transparent bezel, not a room or a composite.
Restyle the CRT frame to belong to the same hand-painted semi-realistic 2.5D adventure game as image 2. Strong visible shift away from photographic plastic: broad designed charcoal/slate planes, softened faceted bevels, restrained painterly shading, selective thin edge accents, a few large clean vent slits, small simplified corner fasteners. Remove dense pebbled grain, hundreds of tiny ridges, scratches, pores and busy industrial detail. Keep substantial old CRT mass, deep dark inset gasket, and a clearly modeled thick front frame, not a flat UI rectangle and not a modern thin LCD.
Lighting must match image 2: muted blue-grey/cyan edge highlight at left/top-left, soft dusty mauve edge reflection at right, darker underside, limited muted charcoal palette. Use two or three broad shadow values plus gentle painted transitions, not glossy studio reflections. A faint touch of muted green screen bounce at the INNER rim only. Clean large shapes; no cartoon outlines, no pixel art, no extra futuristic hardware.
Preserve image 1's exact straight-on camera, outer silhouette, frame proportions and screen-hole placement. Keep the original canvas bounds and approximately 1402 by 1122 landscape dimensions. Preserve the wide rounded rectangular transparent screen opening, top/side band widths and taller bottom chin. Intended for nine-slice CSS: around 137px top, 205px right, 228px bottom, 199px left in a 1402x1122 image. The horizontal central stretches of each band should be visually quiet. Keep the original small blank maker plate lower left, simplify the lower-right control recess into a quiet dark recessed panel with NO drawn knobs or text; proportional controls and a green LED are rendered separately in CSS. Do not draw a stand, desk, room, screen content or glass.
CRITICAL: retain genuine alpha transparency throughout the ENTIRE central opening and outside the silhouette. No black fill, no colored fill, no checkerboard or background painted into either transparent region. Opaque pixels only on the physical bezel. Output this single isolated asset matching the game-background style.
```

## Verification

- Ten focused Chrome 157 / WebKit 27.2 cases passed: desktop Light/Dark, 1440px curved mode, portrait, 360/390/768px compact layouts, and Web 1.0. Assets return HTTP 200 under the current release key; frame ignores pointer events; compact layouts request neither decorative asset. No page exceptions or horizontal page overflow.
- Existing `tests/crt-feedback.cjs`: 22 cases passed, covering 360px through 4K, portrait, monitor fit/4:3/stand placement, menu alignment, and continuous animation during scrolling in curved and flat modes.
- Blocking both room and bezel images leaves readable content and a working About menu.
- Dark/Light desktop compositions were visually reviewed. Native curved text clipping recorded in [the earlier office verification](crt-office-background.md) is outside this asset/style update and remains unresolved; these checks do not establish full curved-renderer visual correctness.
- Runtime key consistency, JavaScript syntax, normalized HTML/JS equality, asset-size/alpha checks, and `git diff --check` passed. LAN-served HTML, both stylesheets, and both WebP files match workspace bytes.

Artifacts: `/tmp/jujin-crt-results/painted-*.png`, `painted.json`, `painted-feedback.log`; focused script: `/tmp/jujin-crt-painted-check.cjs`. Tests used local Linux automation and emulated viewport sizes. No fresh FPS benchmark or physical-device test. These results describe local LAN verification; remote Git and deployment status are reported separately.
