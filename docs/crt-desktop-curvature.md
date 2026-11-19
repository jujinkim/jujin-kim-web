# Desktop curvature and input experiment — 2026-11-15

Release key: `20261114.1`. Target reported by the user: Windows 11 / Edge 157.

## Implemented geometry

At viewport sizes of at least 1000 x 600, the aperture is rectangular. Its four edges and four corners stay fixed. The shader samples normalized source coordinates using `p * (1 - k * (1 - p.x²) * (1 - p.y²))`. Large internal screens use `k=0.04`, replacing `0.055`; internal widths up to 768px retain `0.025`. Existing glass shading supplies the curved-glass appearance without bending the aperture.

The JavaScript source mapping, eight-step inverse, pointer mapping, native selection geometry, and shader share this transform. Tile scissors include a conservative expansion bound of `k * dimension / (3 * sqrt(3))`, plus the existing raster-pixel allowance. This bounds interior extrema between sampled tile corners. Small viewports retain their previous barrel mapping, strength, rounded aperture, and scissor calculation. The terminal, four tabs, palette, background, public APIs, and input handlers remain.

## Upload experiment and decision

The only performance candidate splits content uploads into bands of at most 64 CSS px. The experiment retains 512px tiles, valid row intervals, the 24-tile / 64MiB cache cap, and all input handling. Each band's texture boundaries are integral raster rows, using `floor(64 * scale)` as the step, so fractional DPR never creates a band taller than 64 CSS px.

`tests/crt-desktop.cjs` serves the candidate through a test-only module interception. Both variants use the new curvature. Runtime source keeps the existing upload loop unless the acceptance gate passes. The gate requires at least 20% improvement in both wheel and drag p95 latency at every tested DPR, plus correctness and the existing >=55fps / p95 <=25ms frame limits.

Three paired repeats run serially at 1440 x 1000 with DPR 1, 1.25, and 2. Each repeat uses 40 trusted wheel inputs and 40 native drag moves. The second repeat reverses variant order. Normal decorative motion stays enabled. A test-only interception suppresses automatic quality changes in **both** variants so all comparisons stay curved at resolution 1; unmodified quality fallback is tested separately. This prevents a slower baseline from silently switching resolution during a trial.

Latency starts at the trusted browser input event's `timeStamp` and ends after synchronous WebGL pixel readback confirms the expected result. Wheel checks require the expected document-row color. Drag checks record the native Range after the renderer handles the event, then require selected and unselected pixels on opposite sides of the new selection endpoint. The probe also times paint and DOM-to-GPU calls. These are instrumented local input-to-framebuffer measurements, not hardware presentation timing or physical-device INP. Native caret rounding and accessibility bounds retain the existing affine approximation.

The prepared Chrome 157 CDP build scales injected wheel deltas by emulated DPR. The driver compensates so each trial receives the same CSS delta. Scroll-position assertions allow native fractional-DPR rounding.

**Decision: reject the performance candidate.** Keep the original content-upload loop and input handlers; deliver the curvature/aperture change only. All 18 trial correctness/mode/cache checks completed. Neither input type reached the required 20% p95 improvement. Values below are the median of three per-trial p95 measurements, in milliseconds; positive percentages mean improvement.

| DPR | Input | Existing uploads | 64 CSS px bands | Improvement |
| --- | --- | ---: | ---: | ---: |
| 1 | Wheel | 66.9 | 66.9 | 0.0% |
| 1 | Drag | 42.7 | 42.5 | 0.5% |
| 1.25 | Wheel | 74.8 | 72.9 | 2.5% |
| 1.25 | Drag | 54.9 | 51.2 | 6.7% |
| 2 | Wheel | 172.5 | 175.7 | -1.9% |
| 2 | Drag | 185.7 | 202.7 | -9.2% |

The fixed-resolution, synchronous-readback experiment also failed the frame gate at higher DPR in both variants. It must not be presented as passing >=55fps / p95 <=25ms, or as a hardware presentation measurement. Ordinary scrolling with the unmodified production monitor is measured separately below. Reduced upload-call cost in some conditions is insufficient evidence of lower end-to-end input delay. The earlier plan's approximate 9.3ms redraw / 8.1ms copy diagnosis remains a prior local observation, not proof of the Windows/Edge cause; fresh per-trial and per-input timings are retained in the measurement report.

## Functional checks and evidence limits

`tests/crt-desktop.cjs` checks 61,206 coordinate samples across strengths 0.025 and 0.04, four edges/corners, and sizes up to 3840 x 2160. Browser checks cover the desktop breakpoint, the small internal-screen coefficient, and unchanged compact aperture. At all three desktop DPRs, framebuffer probes check initial content, tile boundaries, partial coverage, jumps to 12,000/12,128px and return trips, trusted wheel input, native drag highlighting/copy, and actual menu clicks near the left/right edges and middle of the screen.

Additional stress diagnostics used temporary 24 x 16px buttons at the content's extreme left/right edges. Some clicks missed despite matching DOM bounds; the same failure reproduced with the previous barrel mapping. Native caret endpoints can also differ from ideal character positions. These pre-existing input/HTML-in-Canvas geometry limits are recorded rather than changing the authorized input flow. Product menu checks and native selection/copy are separate from this synthetic small-target diagnostic. Whole-column exact-color probes also encountered fractional-DPR and edge-color differences; the retained regression checks use known row-interior samples, as the existing scroll suite does. They do not establish that every framebuffer pixel is identical to an untransformed DOM raster.

Final functional suites passed **253 assertions**: 48 desktop/geometry checks, 105 existing browser assertions, 51 mobile scroll-pixel checks, 13 failure/compatibility checks, 22 layout/motion checks, and 14 startup checks. Coordinate edge displacement was <=2.3e-13 CSS px (floating-point rounding); maximum round-trip error was 3.6e-9 CSS px, below the 0.25px limit. Runtime/test syntax, module resolution, the single release key, and `git diff --check` also passed.

## Ordinary scroll frame measurements

These six-second samples use the existing About & Career scroll workload, normal decorative motion, and the unmodified production quality monitor. No synchronous framebuffer probe or quality suppression is installed. The previous-renderer run serves the `aab3b0e` module in the same current layout. Values are single local runs, not a statistical equivalence claim.

| Renderer | Viewport / DPR | Mean rAF fps | p95 interval | End resolution |
| --- | --- | ---: | ---: | ---: |
| Previous | Desktop / 1 | 60.0 | 16.8ms | 1.0 |
| Current | Desktop / 1 | 58.5 | 16.8ms | 1.0 |
| Previous | Desktop / 1.25 | 52.5 | 33.4ms | 0.8 |
| Current | Desktop / 1.25 | 51.0 | 33.3ms | 0.8 |
| Previous | Desktop / 2 | 22.4 | 66.7ms | 0.8 |
| Current | Desktop / 2 | 21.8 | 66.7ms | 0.8 |
| Current | Mobile / 3 (raster DPR capped at 2) | 57.2 | 16.8ms | 0.8 |

**The complete >=55fps / p95 <=25ms gate did not pass.** Both old and new renderers miss it at desktop DPR 1.25 and 2 on this host and lower quality. The new DPR 1 result passes the aggregate gate. Mobile passes the aggregate gate after two slow initial windows trigger resolution 0.8; it is not a clean full-resolution pass. The older renderer was also slightly faster in the desktop samples, so these runs do not prove performance equivalence or a performance fix from the curvature change.

Firefox flat desktop measured 56.2fps / 33.2ms and missed the interval gate; mobile flat and both Web 1.0 samples passed. WebKit flat samples transitioned to Web 1.0 (desktop 44.8fps / 31ms, mobile 37.1fps / 53ms); stable Web 1.0 measured about 61.8–61.9fps / 17ms. Compatibility and automatic fallback assertions passed independently of these frame misses. All per-run values, quality samples, geometry results, and input acceptance calculations are in [the measurement report](crt-desktop-results.json).

All browser evidence is local Linux automation with the prepared Chrome 157.0.8103.38, `--no-sandbox`, and no experimental feature flags. DPR values are emulated. WebKit compatibility and Firefox/other-mode frame sampling are separate from native Chromium curvature. Windows 11 / Edge 157 hardware was unavailable: neither its original cause nor perceived input-delay resolution is established here. No commit, push, deployment, or public-site verification is implied.

## Reproduction

Use the external browser/tooling paths in [initial verification](crt-verification.md#reproduction). Start the local static server, then run serially:

```sh
node tests/crt-desktop.cjs
CRT_DESKTOP_BENCH=1 node tests/crt-desktop.cjs
node tests/crt-browser.cjs
node tests/crt-scroll-rendering.cjs
node tests/crt-failures.cjs
node tests/crt-feedback.cjs
node tests/crt-startup.cjs
CRT_PERF_BROWSERS=chrome157 CRT_PERF_MODES=curved node tests/crt-performance.cjs
CRT_PERF_BROWSERS=firefox,webkit CRT_PERF_VIEWPORTS=desktop,mobile-retina node tests/crt-performance.cjs
```

The previous-renderer comparison intercepts only its module in the current layout:

```sh
git show aab3b0e:js/modules/screen-curvature.js > /tmp/jujin-crt-original.js
CRT_CURVATURE_SOURCE=/tmp/jujin-crt-original.js CRT_PERF_BROWSERS=chrome157 CRT_PERF_MODES=curved CRT_PERF_VIEWPORTS=desktop,desktop-dpr-1.25,desktop-retina node tests/crt-performance.cjs
```

Temporary full samples, pixel checks, and screenshots live under `/tmp/jujin-crt-results`. The checked-in measurement report accompanies this document. API geometry behavior follows [Chrome's HTML-in-Canvas WebGL guide](https://developer.chrome.com/docs/web-platform/html-in-canvas/webgl); the guide is not evidence of Windows/Edge behavior.
