# CRT feedback verification — 2026-11-07

Branch: `feat/crt-monitor-shell`. Release key: `20261107.2`.

This records the layout/motion update. Release `20261107.3` replaces the room and refines the monitor materials/stand; see [room refinement](crt-room-refinement.md) for its asset and visual checks.

## Changes

- Removed the 960px screen cap. At viewport sizes >=1000x600, the 4:3 screen grows until either viewport dimension is filled, leaving one bezel thickness (18–40px) outside the shell on the limiting axis. Wider/taller aspect ratios necessarily leave more room on the other axis. Compact viewports retain the thin bezel and available-height layout.
- Home anchors to the left; the remaining three menus form a right-aligned group across the full monitor width.
- Replaced the warm study with a dark industrial cyberpunk room. Desktop-only WebP: 61,360 bytes.
- Removed all scroll-triggered animation pauses. Matrix/starfield and scan sweep continue through scrolling. Hidden-tab and reduced-motion handling remain. Compact screens retain their existing stationary starfield. Only measured sustained slow interaction lowers resolution or selects Web 1.0.
- The background canvas uploads its bitmap directly to one texture, through the same barrel transform as the content. Its raster resolution follows the measured quality level while logical glyph size/positions remain unchanged. Background and content textures share the 64MiB cache limit.

## Browser compatibility and LAN

The reported client is Microsoft Edge 156.0.4314.58, Chromium 156.0.8078.80, Windows 11 26H2. The [native HTML-in-Canvas API ships in Chrome 157](https://developer.chrome.com/docs/web-platform/html-in-canvas); Edge 156 therefore takes the unsupported-API flat-CRT path by default. No browser-name test or forced Web 1.0 mode was added.

Chrome 157.0.8103.38 was checked on both localhost and `http://192.168.1.111:8000/`, without experimental flags. Both expose the native API and select curved CRT. The LAN HTTP origin is not a secure context, but this API still works there. The user's Windows Edge installation was not directly automated or inspected.

## Functional verification

- 93 browser assertions passed: 36 combinations of 360, 390, 768, 1366, 1440, and 1920px widths, both themes, and all three display modes; terminal/history, hashes/back, selection/find, context-loss state preservation, quality transitions including the background bitmap, and hidden-tab rendering.
- 13 failure/compatibility assertions passed, including blocked storage, blocked images/scripts, JavaScript disabled, exact 1000ms/once-per-tab power sequence, native copy/touch scrolling, and WebKit automatic flat fallback with theme/navigation.
- Final functional suites use the LAN HTTP origin. Clipboard verification uses keyboard copy/paste, which also works on insecure origins; the automated test no longer depends on the HTTPS-only asynchronous Clipboard API.
- `tests/crt-feedback.cjs` passed 20 LAN layout cases: curved/flat at 360x800, 390x844, 768x1024, 1000x600, 1366x768, 1440x1000, 1920x1080, 1200x1600, 2560x1440, and 3840x2160. It checks 4:3, maximum fit with bezel clearance, no viewport/menu overflow, and Home-left/others-right alignment.
- Two additional scroll-motion cases passed. During continuous scrolling, the starfield canvas pixels changed and the scan sweep's animation time advanced; both curved and flat modes retained running animations.
- At 1920x1080, the inner screen is about 1275x956px and outer top/bottom margins are 27px. At 1440x1000, the screen is about 1181x885px with 25px top/bottom margins.

Screenshots and detailed automation output are under `/tmp/jujin-crt-results`. Functional checks use reduced motion except the explicit motion/power cases. Performance checks use normal motion. All measurements are local Linux browser automation; emulated mobile/DPR and headless rAF cadence do not establish physical-device display performance. No push, CI, or deployment was performed.

## Performance

Fresh results with the larger screen and continuous scroll animations are recorded in `crt-feedback-performance-results.json`. Flat/Web 1.0 use six-second scrolling after startup; curved cases were repeated for 24 seconds after the bitmap upload change to observe all automatic quality stages. Browser paths and the serial procedure follow [initial verification](crt-verification.md#reproduction). The follow-up layout/motion script additionally accepts `CRT_BASE_URL=http://192.168.1.111:8000/`.

`tests/crt-performance.cjs` supports optional `CRT_PERF_BROWSERS`, `CRT_PERF_MODES`, and `CRT_PERF_VIEWPORTS` comma-separated filters, plus `CRT_PERF_DURATION` in milliseconds. The final curved run uses `CRT_PERF_BROWSERS=chrome157 CRT_PERF_MODES=curved CRT_PERF_DURATION=24000`.

| Browser | Viewport | Start mode | Seconds | Mean rAF fps | p95 ms | End mode |
| --- | --- | --- | ---: | ---: | ---: | --- |
| chrome157 157.0.8103.38 | desktop | curved | 24 | 51.4 | 33.4 | web1 |
| chrome157 157.0.8103.38 | desktop | flat | 6 | 59.7 | 16.8 | flat |
| chrome157 157.0.8103.38 | desktop | web1 | 6 | 60.0 | 16.7 | web1 |
| chrome157 157.0.8103.38 | mobile-retina | curved | 24 | 59.3 | 16.8 | curved |
| chrome157 157.0.8103.38 | mobile-retina | flat | 6 | 60.0 | 16.8 | flat |
| chrome157 157.0.8103.38 | mobile-retina | web1 | 6 | 60.0 | 16.8 | web1 |
| firefox 155.0 | desktop | flat | 6 | 27.7 | 83.8 | web1 |
| firefox 155.0 | desktop | web1 | 6 | 60.2 | 17.3 | web1 |
| firefox 155.0 | mobile-retina | flat | 6 | 60.0 | 17.3 | flat |
| firefox 155.0 | mobile-retina | web1 | 6 | 60.2 | 17.3 | web1 |
| webkit 27.2 | desktop | flat | 6 | 39.5 | 39.0 | web1 |
| webkit 27.2 | desktop | web1 | 6 | 61.7 | 17.0 | web1 |
| webkit 27.2 | mobile-retina | flat | 6 | 36.3 | 58.0 | web1 |
| webkit 27.2 | mobile-retina | web1 | 6 | 62.0 | 17.0 | web1 |

Rows ending in a different mode include the automatic transition; they are not steady-state CRT results. On this host, desktop curved CRT remained below target through all three resolution levels and selected Web 1.0. Its six measured CRT windows ranged from 41.7 to 50.5fps with p95 around 33.4ms. Firefox desktop and WebKit flat-CRT cases also triggered the intended fallback. Full-quality continuous animation is not claimed to meet the target on every browser/device. Chrome flat CRT and mobile curved CRT met the target in these runs. Dedicated Web 1.0 rows show its separate steady-state cadence.

The final measured-overload check (40ms of main-thread work per animation frame, no synthetic sample injection) passed on the LAN origin: 1.0 → 0.8 → 0.6 → Web 1.0, with transitions at 4.3s, 9.9s, 15.6s. The WebGL canvas and noise were released. Raw events are in `crt-feedback-overload-results.json`.

Final checks: all runtime/test modules passed `node --check`; `git diff --check` passed; every runtime release key is `20261107.2`. LAN HTML and the 61,360-byte room asset returned HTTP 200 and matched the workspace.

## Asset provenance

Built-in imagegen produced the new room; FFmpeg encoded `img/crt-room.webp` at WebP quality 78, 1672x941, 61,360 bytes (under 400KB). Original source: `/home/jujin/.codex/generated_images/01a1b46a-a4ef-72e0-a2c4-bea7c5e08e46/exec-a934b592-1885-4f31-a321-9e99f61996b8.png`. The central monitor is HTML, not part of the photograph.

Exact prompt:

> Use case: photorealistic-natural. Asset type: wide 16:9 desktop website background behind a separately rendered HTML CRT monitor. Create an oppressive, very dark cyberpunk hacker den at night, grimy industrial basement, cold graphite concrete and worn black metal, hanging cable bundles, exposed conduits, old electronics and server racks at the far left and far right. Subtle toxic green and cyan spill light, a few distant red status LEDs, deep shadows, faint haze, uneasy noir atmosphere. View straight on from a seated desk position, a scratched dark metal workbench along the bottom. Reserve the central 75 percent as quiet empty near-black wall and empty workbench for the HTML monitor; composition should concentrate recognizable environment along the edges. Photographic realism, restrained contrast so foreground screen stays readable. Absolutely no cozy decor, no plants, no bookshelves, no warm desk lamp, no wood, no people, no text, no logos, no central monitor, no central computer, no screen in the central area. Ominous underground hacker room, not a comfortable study, not a glossy gaming setup.
