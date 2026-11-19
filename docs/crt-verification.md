# CRT implementation verification — 2026-11-07

Branch: `feat/crt-monitor-shell`. Release key: `20261107.1`. Local HTTP server: `127.0.0.1:8000`.

This records the initial implementation. Release `20261107.2` enlarges the monitor, replaces the room asset, and keeps animations running during scrolling. See [follow-up verification](crt-feedback-verification.md) for the current asset and fresh results.

## Evidence boundary

All results below are local browser automation on this Linux host. Chrome is the prepared **157.0.8103.38** headless binary, launched with `--no-sandbox` and **no experimental feature flags**. Firefox is **155.0**. WebKit is **27.2**. Mobile means viewport/touch/DPR emulation, not a physical phone. Frame rates describe interaction `requestAnimationFrame` cadence, not hardware display presentation or a field Core Web Vitals measurement.

No commit, push, CI run, deployment, or public-site verification was performed as part of this implementation.

## Functional checks

81 browser assertions and 13 failure/compatibility assertions passed. A final targeted check also passed for the curved theme notice, Escape while typing, preserved input, and absence of JavaScript exceptions.

- 360, 390, 768, 1440, and 1920px widths; Light and Dark; curved CRT, flat CRT, and Web 1.0: **30 layout combinations**. Four menus and one source DOM in every mode, no document horizontal overflow. Room image absent from small-screen and Web 1.0 computed backgrounds.
- Curved right-edge menu activation, native Range drag selection, clipboard copy, browser `window.find()` search, touch tap and scrolling, menu hashes, reload, back navigation, terminal input/history, and digits inside terminal input.
- Resize preserves section, scroll, input, and focus. Simulated hidden-document events stop renderer frame counters; returning visible resumes them.
- Real `WEBGL_lose_context` restores flat CRT while preserving section, exact scroll offset, terminal input, and focused element. Injected caret/selection failure removes only curvature.
- Forced unsupported API retains the monitor and CRT effects. WebKit's unsupported API follows the same automatic flat fallback. Unsupported API and reduced motion never select Web 1.0 by themselves.
- Blocked local/session storage, blocked images, blocked module requests, JavaScript disabled, reduced motion, and first-tab/reload startup. Both power animations report exactly **1000ms**. Storage failure skips the sequence; static content survives failed JavaScript.
- Slow-window policy: first failure alone does not switch modes; two consecutive failures lower resolution. After 1.0, 0.8, and 0.6, sustained failure chooses Web 1.0 and stays there across reload in the same tab. WebGL canvas and noise elements are removed.

The JavaScript-disabled fallback contains introductory content, contact links, and four section summaries. Full dynamic portfolio content and terminal commands require JavaScript, as in the existing architecture. Native find was checked through the browser API and visible selection; browser toolbar UI and physical touch selection handles were not tested.

## Performance

Six seconds of continuous scrolling in About & Career, after startup settling. Desktop: 1440x1000, DPR 1. Mobile Retina: 390x844, DPR 3 (renderer raster DPR capped at 2). Tests run serially. Exact results are recorded in `crt-performance-results.json` next to this document.

| Browser | Viewport | Mode | Mean rAF fps | p95 ms | End mode |
| --- | --- | --- | ---: | ---: | --- |
| chrome157 157.0.8103.38 | desktop | curved | 60.0 | 16.7 | curved |
| chrome157 157.0.8103.38 | desktop | flat | 60.0 | 16.7 | flat |
| chrome157 157.0.8103.38 | desktop | web1 | 60.0 | 16.7 | web1 |
| chrome157 157.0.8103.38 | mobile-retina | curved | 59.3 | 16.8 | curved |
| chrome157 157.0.8103.38 | mobile-retina | flat | 60.0 | 16.7 | flat |
| chrome157 157.0.8103.38 | mobile-retina | web1 | 60.0 | 16.8 | web1 |
| firefox 155.0 | desktop | flat | 59.0 | 17.4 | flat |
| firefox 155.0 | desktop | web1 | 60.2 | 17.3 | web1 |
| firefox 155.0 | mobile-retina | flat | 60.0 | 17.2 | flat |
| firefox 155.0 | mobile-retina | web1 | 60.2 | 17.3 | web1 |
| webkit 27.2 | desktop | flat | 62.1 | 17.0 | flat |
| webkit 27.2 | desktop | web1 | 61.7 | 17.0 | web1 |
| webkit 27.2 | mobile-retina | flat (mixed transition) | 48.0 | 26.0 | web1 |
| webkit 27.2 | mobile-retina | web1 | 61.9 | 17.0 | web1 |

For Chrome's repeated scroll range, cached body tiles required no additional body texture uploads after warmup. Root scrollbar updates upload a narrow strip; headers, footer, and body tiles stay cached. Scissor rectangles avoid shading the entire screen for each small layer. Cache limit: 24 tiles and 64MiB of RGBA texture storage.

WebKit's mobile flat-CRT row contains an automatic transition: its two initial slow windows triggered Web 1.0. Its stable Web 1.0 result is listed separately. This is expected behavior on this test host, not a claim about Safari on physical iPhones.

Real overload test (40ms main-thread work per animation frame): resolution changed **1.0 → 0.8 → 0.6 → Web 1.0**, with observed transitions around 4.2, 9.9, and 15.5 seconds after measurement began. All six slow windows were measured by the runtime monitor. This test did not call `submitSample()`. Exact events are in `crt-overload-results.json`. Final reason: `sustained-low-performance`; WebGL canvas and noise absent.

## Reproduction

Serve the checkout with `python3 -m http.server 8000 --bind 127.0.0.1`. Use an external Playwright installation; no package or build step is needed by the website. Set paths for the browser builds installed on the host:

```sh
export CRT_PLAYWRIGHT=/tmp/jujin-crt-testing/node_modules/playwright
export CRT_CHROME_BIN=/home/jujin/.cache/jujin-crt-browser/157.0.8103.38/chrome-headless-shell-linux64/chrome-headless-shell
export CRT_FIREFOX_PLAYWRIGHT=/home/jujin/.npm-global/lib/node_modules/@playwright/cli/node_modules/playwright
export CRT_FIREFOX_BIN=/home/jujin/.cache/ms-playwright/firefox-1543/firefox/firefox
export CRT_WEBKIT_BIN=/tmp/jujin-webkit-deps/run-webkit.sh
node tests/crt-browser.cjs
node tests/crt-failures.cjs
node tests/crt-performance.cjs
node tests/crt-overload.cjs
```

`CRT_BASE_URL` can override the server URL; include its trailing slash. Temporary Playwright/loader paths above are specific to this run. JSON output, logs, and screenshots are under `/tmp/jujin-crt-results`. Reinstall external tooling if those temporary directories are removed. The Firefox package override accommodates the installed Firefox build's older automation protocol.

WebKit was initially missing shared libraries. Dependencies were downloaded with `apt-get download` and extracted with `dpkg-deb -x` into `/tmp/jujin-webkit-deps/root`, without changing system packages. These included libevent, GStreamer base/GL/bad/extra, avif, harfbuzz-icu, soup, enchant, backtrace, wayland-server, manette, hyphen, orc, yuv, gav1, hidapi, absl, GLES2, secret, and graphene. A local launcher points `LD_LIBRARY_PATH` to those libraries and the WebKit bundle, then executes `minibrowser-wpe/bin/MiniBrowser`. `WEBKIT_EXEC_PATH`, `WEBKIT_INJECTED_BUNDLE_PATH`, and `WEBKIT_INSPECTOR_RESOURCES_PATH` point to that same bundle. Tests use software GL and disable the unsupported sandbox on this host.

The final gate also runs `node --check` for runtime modules and test scripts, validates the single cache key, and runs `git diff --check`.

## Asset provenance

Room: built-in **imagegen**, saved as `img/crt-room.webp`, **35,388 bytes**, 1672x941. FFmpeg WebP encoding at quality 78, no generated monitor composited into the room. Original generation remains under the tool's generated-images directory; the website uses its checked-in WebP.

Exact generation prompt:

> Use case: photorealistic-natural. Asset type: wide desktop website room background, 16:9. Create a realistic dim late-night study with charcoal walls and a dark wood desk across bottom quarter, subtle muted green ambient light. Camera straight on at seated eye level. The entire central 75 percent must be empty dark wall and empty desk, reserved for a real HTML CRT monitor composited separately. Peripheral shelves, a few books at far left, soft lamp glow at far right. Understated realistic materials, low contrast, deep shadows, no monitor, no computer, no screen, no keyboard, no people, no text, no logos. Sharp photographic environmental texture, not illustration. No central object.

The existing `fonts/JetBrainsMono-Regular.woff2` was an HTML error document. Replaced it with the real 92,380-byte WOFF2 from the [official JetBrains Mono repository](https://github.com/JetBrains/JetBrainsMono), with its OFL license in `fonts/OFL.txt`. The website now uses this local font without a Google Fonts network dependency.

Native canvas API reference: [Chrome HTML-in-Canvas WebGL guide](https://developer.chrome.com/docs/web-platform/html-in-canvas/webgl). Canvas geometry uses an affine approximation for browser accessibility bounds; inverse mapping handles mouse/tap coordinates against the curved surface. This limitation does not create a second text or interaction tree.
