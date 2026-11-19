# Office background and gentle defocus — 2026-11-07

Branch: `feat/crt-monitor-shell`. Release key: `20261107.6`.

## Result

The background now suggests a quiet office after hours: the rear bed becomes a worktable, office chair, and filing drawers; shelves gain document binders and paper trays. The curtained window, doorway, empty foreground desk, dark low-saturation grade, and cyan/violet neon composition remain.

Gentle photographic defocus is baked into the generated room image. No live CSS blur, extra rendering loop, or foreground blur is added. Normalized file hashes confirm the monitor bitmap, HTML, styles, and JavaScript are unchanged from the previous refinement except for synchronized cache keys.

## Asset provenance and prompt

Built-in imagegen edited the previous `img/crt-room.webp`. The selected result was encoded with FFmpeg/libwebp, quality 80 and compression level 6.

- Saved asset: `img/crt-room.webp`.
- Dimensions: 1672x941.
- Size: 37,140 bytes, below the 400KB limit.
- Source: `/home/jujin/.codex/generated_images/01a1b46a-a4ef-72e0-a2c4-bea7c5e08e46/exec-866b29c6-a044-4a31-86ac-e3a78e832168.png`.
- Existing `img/crt-bezel.webp` is byte-identical to the previous revision.

Exact edit prompt:

```text
Use case: precise-object-edit.
Input image: edit target, an existing website room background. Make only a modest office furnishing change and add gentle background defocus; preserve the accepted scene.
Replace the rear bed and bedding with a subdued after-hours private office workspace: a low dark worktable against the rear wall, a restrained ergonomic office chair, and a small filing drawer unit. Change a few books on the existing side shelves into upright document binders and a few neat paper trays, so the visible side bands subtly read as an office. Keep the room human-scale and understated, not an open-plan corporate hall, industrial basement, or server room. No people, no readable writing, no additional monitors or illuminated displays.
Preserve the exact camera perspective, wide framing, room walls, doorway, left window and heavy curtains, city glimpse, shelf positions, and the large EMPTY foreground wooden desktop with its straight rear edge at the same height. Preserve the existing far-right layered bent-glass neon sign design, pale cyan and dusty violet luminous cores, local bloom, and window/desktop reflections. Preserve the dark low-saturation charcoal and neutral wood grade, overall brightness, and semi-realistic materials.
Apply very mild, even photographic defocus to this entire room/background image, like roughly 1.5 to 2 pixels of softness at this source size. It should read as gently softened behind a sharp separately rendered foreground HTML CRT, not heavily blurred, foggy, smeared, or low resolution. Keep room shapes and neon tube structure recognizable. The foreground desk may retain a little more material detail, but do not leave the rest of the room tack sharp. This softness must be baked into the image. Do not add a monitor, screen, bezel, stand, or any central foreground object; those are separate website elements. Preserve composition and neon atmosphere while subtly changing bedroom cues to a quiet night office.
```

## Verification

Seven focused local browser cases passed:

- Chrome 157: 1920x1080 Light/Dark flat CRT, 1440x1000 curved CRT, 1200x1600 portrait flat CRT, 390x844 compact flat CRT, and 1920x1080 Web 1.0.
- WebKit 27.2: 1920x1080 Dark flat CRT.
- Desktop CRT loads both image assets with the current key and HTTP 200; decorative frame ignores pointer events.
- Compact layout makes no room/bezel requests. Web 1.0 hides both decorations; its forced preview can request images before JavaScript selects that mode.
- No horizontal page overflow, page errors, body filter, or glass filter in these cases.
- LAN-served HTML and both images match workspace bytes. Runtime key consistency, JavaScript syntax, and `git diff --check` pass.

Composed screenshots were reviewed locally. The curved screenshot showed partial text clipping inside the monitor; the renderer is unchanged, and these checks establish background loading and visibility, not full curved-renderer visual correctness. Artifacts: `/tmp/jujin-crt-results/office-*.png`, `office.json`; focused verification script: `/tmp/jujin-crt-office-check.cjs`. Existing broader interaction/performance suites were not rerun for this image-only visual change. No new FPS result, physical-device validation, push, or deployment is claimed.
