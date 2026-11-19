# Room depth and neon update — 2026-11-07

Branch: `feat/crt-monitor-shell`. Release key: `20261107.4`.

This records the room-depth composition. Release `20261107.5` refines its color grade, neon emission, and monitor materials; see [material/color refinement](crt-material-refinement.md).

## Visual change

The background now looks across a freestanding desk into a room with receding side walls, ceiling corners, floor, shelving, and a doorway. A curtained window shows distant city lights on the left. A small cyan/magenta geometric neon sign lights the right side wall and reflects softly on the desk. The room is an ordinary dark interior with a restrained cyberpunk accent.

The monitor occupies the foreground; the image contains no monitor. Landscape background sizing preserves both outer scene bands so the neon is not cropped away on narrower desktop viewports. Tall desktop viewports focus on the doorway/neon side. The existing 4:3 monitor sizing, stand, menus, interaction, and continuous-scroll animations remain as implemented in the earlier revisions.

## Verification

- Visually reviewed the composed site at 1920x1080, 1440x1000, and 1200x1600; also captured 1366x768.
- 30 local Chrome 157 / WebKit 27.2 background/theme/mode checks passed at 360x800, 1440x1000, and 1920x1080, Light and Dark. Chrome covered curved, flat, and Web 1.0; WebKit covered flat and Web 1.0. Four menus remain present, no document overflow or JavaScript exceptions, and the room is absent from compact/Web 1.0 computed backgrounds.
- LAN HTML and the room image return HTTP 200; the image bytes match the workspace. All runtime URL keys are `20261107.4`.
- Runtime/test module syntax and `git diff --check` passed.

Artifacts: `/tmp/jujin-crt-results/depth-*.png` and `depth-checks.json`. Local Linux automation only; physical Windows Edge and new FPS measurements are not claimed. No push or deployment was performed.

## Asset provenance

Built-in **imagegen** generated the new composition. Project asset: `img/crt-room.webp`, **42,468 bytes**, 1672x941, encoded using FFmpeg WebP quality 78. Source: `/home/jujin/.codex/generated_images/01a1b46a-a4ef-72e0-a2c4-bea7c5e08e46/exec-23afe5e2-15aa-4daa-9cda-4e4e0c798447.png`.

Exact prompt:

```text
Use case: stylized-concept.
Asset type: semi-realistic 16:9 website environment background behind a separately rendered large interactive CRT monitor.
Primary request: an ordinary dark room at night with spatial depth, heavy curtains, a wooden desk, and a subtle tasteful cyberpunk atmosphere from a small neon sign. The previous composition showed mostly a flat blank wall; this must feel like looking INTO an actual room.
Camera and geometry: wide-angle seated eye-level view across a freestanding desk into a small lived-in room. Show two room corners and receding side walls, some ceiling junctions, and glimpses of the floor along the sides. The rear wall is several meters away. The desk is in the foreground and is NOT pushed against the back wall. Create depth through perspective and layers, not a blank frontal wall.
Composition for overlay: an HTML monitor will cover the middle 66 percent of the final image. Important room features must remain visible in the outer left and right 17 percent. In the left side band, show a tall window in perspective with dense dark curtains drawn mostly closed, a visible frame and a narrow view of faint distant city lights. In the right side band, show a doorway and a low cabinet or narrow shelf extending into the room, with a small abstract neon sign on the side wall above it. The center can contain natural room detail because the monitor will cover it; do not reserve a huge empty blank wall. No monitor or computer in the image itself.
Desk: dark walnut desktop spans the full foreground across the bottom 18-20 percent. Viewed slightly from above, with subtle wood grain and restrained reflected light. Keep the center of the desk empty for the separately rendered monitor stand. Its front edge must extend out of frame below the image so the visible bottom is all desktop.
Mood and lighting: dim ordinary residential room, thick charcoal curtains and matte painted walls, soft cool night light from the window. A small neon accent at far right uses muted cyan with a little dusty magenta, casting restrained reflected light onto nearby wall and desk. The neon is a short abstract geometric mark, not readable lettering. Most of the room remains dark but the layered room geometry and furniture silhouettes must be legible. Subtle cyberpunk mood, intimate and believable rather than theatrical.
Style: semi-realistic cinematic 3D environment with believable material textures, gentle painterly softness, understated colors. No people, no text, no logos, no screens, no central monitor. No bunker, basement, industrial concrete, pipework, cable bundles, server racks, fluorescent tubes, dense fog, or aggressively saturated RGB gaming room. Avoid an almost empty wall filling the whole image.
```
