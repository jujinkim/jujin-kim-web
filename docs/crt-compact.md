# Flat CRT on compact screens — 2026-11-18

Release key: `20261118.1`.

Curvature is now enabled only when the existing desktop monitor layout applies: viewport width >=1000px and height >=600px. Smaller viewports use the original DOM directly, with native scrolling, hit testing and text selection. No curvature canvas or WebGL context is created. Curved-glass shading is hidden; thin monitor framing, scanlines, noise, themes, the four menus and the startup sequence remain.

Crossing this breakpoint destroys or recreates the renderer around the same DOM. Section, scroll position, unfinished input, focus and the selected quality level survive. A rendering failure does not retry on resize; Web 1.0 remains sticky. Resizing to mobile during the power sequence never initializes mobile WebGL. Existing initial performance grace periods remain unchanged.

## Verification

All eight local suites passed: 46 compact-screen checks, 48 desktop/coordinate checks, 105 browser checks, 51 scroll-pixel checks, 13 failure/compatibility checks, 22 layout/motion cases, 14 startup checks, and 16 desktop screen-edge cases. The scroll-pixel fixture now uses 1000px-wide desktop viewports at heights 600, 800 and 1000; curved tile caching is a desktop feature. Native mobile touch scrolling, find and copy are checked separately.

The compact matrix covers 360x800, 390x844, 844x390, 768x1024, 999x800 and 1000x599 in Light/Dark, with DPR 3 and touch emulation. Every compact startup made zero WebGL-context requests, kept one viewport directly under the glass, hid the glass shading and retained scanlines. Additional checks cover repeated desktop/compact transitions, quality restoration, sticky rendering failure/Web 1.0 and resizing during startup. No script errors were observed.

`tests/crt-compact.cjs` can run against the static preview or a public origin through `CRT_BASE_URL`. It verifies native DOM scrolling, browser find/copy and renderer lifetime. `tests/crt-performance.cjs` separately samples the existing six-second About & Career scroll workload; its `mode` field is the requested preview mode, while `endMode` records the actual mode. A compact request for curvature stays flat.

The local 390x844 / DPR 3 programmatic scroll sample measured 60.0fps with a 16.8ms p95 frame interval. It stayed flat at quality 1, with no curvature stats or quality downgrade; both sampled interaction windows passed the existing frame thresholds. This is rAF cadence in the local test, not a physical-device input-latency measurement.

Measurements are Linux browser automation with prepared Chromium 157.0.8103.38 and emulated viewports/touch/DPR, not physical Android or iOS devices. No new claim is made about Windows/Edge input latency or the earlier high-DPR desktop frame limits. The desktop shader and upload/cache implementation are unchanged by this release.

## Reproduction

Use the external browser/tool paths from [initial verification](crt-verification.md#reproduction), then run against the static server:

```sh
node tests/crt-compact.cjs
node tests/crt-desktop.cjs
node tests/crt-browser.cjs
node tests/crt-scroll-rendering.cjs
node tests/crt-failures.cjs
node tests/crt-feedback.cjs
node tests/crt-startup.cjs
node tests/crt-screen-edge.cjs
CRT_PERF_BROWSERS=chrome157 CRT_PERF_MODES=curved CRT_PERF_VIEWPORTS=mobile-retina node tests/crt-performance.cjs
```

Local outputs and screenshots are under `/tmp/jujin-crt-results`. The [recorded compact checks](crt-compact-results.json) preserve the state and WebGL counts. Earlier mobile curvature measurements describe previous releases and do not apply to the new compact mode.
