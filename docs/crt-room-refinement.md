# Room and monitor refinement — 2026-11-07

Branch: `feat/crt-monitor-shell`. Release key: `20261107.3`.

This records the monitor/stand refinement. The room composition and asset were subsequently replaced in release `20261107.4`; see [room depth and neon update](crt-room-depth.md).

## Visual changes

The room is now an ordinary dark interior with heavy charcoal curtains, a partly visible night window, painted walls, and a dark walnut desk. The material style is semi-realistic. The HTML monitor uses restrained plastic grain, directional bevel highlights, recessed glass, vent slots, a small inset power detail, and a low pedestal with a contact shadow.

Desktop layout reserves 30–64px for the stand and anchors its base to the desk near the bottom of the viewport. The 4:3 screen still maximizes the available area with bezel-sized outer clearance. At 1920x1080 the inner screen is about 1211x908px, with a 48.6px stand allowance and 27px bottom clearance. Tall viewports retain the same desk contact instead of vertically centering the monitor above the desk; their background crop keeps the window side visible. Small screens use the compact shell. Web 1.0 and print omit the pedestal and room.

The room texture is slightly overscanned so the photographed desk edge does not cut through the HTML stand. All new material and shadow styling is static; the animation, interaction, and performance-monitor logic is unchanged.

## Verification

- 22 existing layout/motion cases passed over `http://192.168.1.111:8000/`: curved and flat CRT at 360, 390, 768, 1000, 1366, 1440, 1920, 2560, and 3840px widths, plus 1200x1600 portrait. Checks cover 4:3, viewport fit including the stand, desk anchoring, menu alignment, and continued scrolling animation.
- 20 focused Chrome 157 / WebKit 27.2 cases passed: 360x800 and 1920x1080, Light and Dark, curved/flat/Web 1.0 where supported. No document overflow or JavaScript errors; room and stand only appear in desktop CRT, and navigation works.
- Visually reviewed desktop dark, desktop light, portrait, and ultrawide compositions. Screenshots and JSON output are in `/tmp/jujin-crt-results/room-*` and `feedback-*`.
- Runtime/test module syntax and `git diff --check` passed. Runtime URLs share `20261107.3`.

These are local Linux browser checks, not physical Windows Edge or phone testing. This static visual refinement does not introduce a new FPS result; earlier performance results remain labelled with their earlier release. No remote push or deployment was performed.

## Asset provenance

Built-in **imagegen** generated the replacement room. Saved project asset: `img/crt-room.webp`, **29,732 bytes**, 1672x941, FFmpeg WebP quality 78. Source: `/home/jujin/.codex/generated_images/01a1b46a-a4ef-72e0-a2c4-bea7c5e08e46/exec-1e0b38d8-13de-458a-8516-0a8a8ac3a2a8.png`. The HTML monitor and its stand are separate from the image.

Exact prompt:

```text
Use case: stylized-concept.
Asset type: wide 16:9 website room background, with a separately rendered interactive CRT monitor added in the center by HTML/CSS.
Primary request: a semi-realistic ordinary dark room at night, with a real desk in the foreground and a visible window mostly covered by heavy dark curtains. Quiet, moody, slightly ominous, believable domestic interior.
Composition: camera straight-on at the height of a seated person looking toward a large monitor on a desk. The center 65 percent must remain quiet empty dark painted wall, reserved for the separately rendered monitor. Put the visible window and heavy charcoal curtains in the left outer portion so they remain visible beside a large central monitor. A narrow gap in the dense curtains reveals the dark window glass and window frame with very faint cool night light. Right edge is ordinary dark painted wall, not equipment. A substantial dark walnut desk surface runs horizontally across the entire bottom 20 percent of the image, seen from slightly above; its back edge is horizontal at roughly 80 percent of image height and its surface extends beyond the bottom edge of the image. The center of the desk must remain empty for the HTML monitor and its stand. Soft physically plausible shadows and restrained natural wood grain.
Style: semi-realistic cinematic 3D environment, believable materials and light, subtle painterly softness rather than perfect photo detail. Dark matte painted walls, thick fabric curtains, dark wood, neutral charcoal and muted cool midnight tones. Window light is dim and soft, no strong luminous strips. Details should remain readable in shadows.
Constraints: no monitor, no computer, no screen, no people, no text, no logo. No basement, no bunker, no industrial architecture, no exposed concrete, no pipes, no hanging cables, no server racks, no neon, no fluorescent lights, no fog, no cozy warm lamps. Do not put any object in the central monitor area. Keep the desk realistic and clearly identifiable as furniture inside an ordinary room.
```
