# Scroll rendering correction — 2026-11-10

Release key: `20261110.1`.

## Problem and correction

The reported environment is Instagram's in-app browser on Android: newly exposed content remains blank while scrolling with curvature enabled, then appears after text selection or returning to the page. The device's exact engine and version were not captured.

The previous renderer captured `.content-border`, a drawable descendant inside the native scrollport. Chrome's snapshot can omit rows clipped by that scrollport. The renderer treated the entire uploaded 512px tile as valid, including its missing pixels, and scrolling only refreshed a root scrollbar strip. Re-uploading the same descendant snapshot alone did not fix the missing rows.

The drawable source is now `#terminal-content`, the native scrollport itself. Visible snapshot bands are copied into document-coordinate texture tiles; each tile tracks its valid row interval. Only newly exposed, uncached bands are uploaded during scrolling. Disjoint intervals replace the tracked interval rather than declaring the intervening gap valid. A separate 12px strip captures the current native scrollbar. Texture size, the 24-tile / 64MiB LRU limit, the barrel shader, and the original DOM/input flow remain.

Scroll events request paint independently of `changedElements`. Source mutations, image/font loading, focus, selection, and theme changes invalidate cached content. Visibility restoration and `pageshow` reset pending requests and invalidate layers. Listeners retain the renderer's existing cleanup lifecycle. Public JavaScript interfaces are unchanged.

## Functional evidence

Local Chrome **157.0.8103.38**, HTTP origin `http://127.0.0.1:8000/`, `--no-sandbox`, no experimental feature flags. Existing compatibility tests also use the prepared WebKit **27.2** launcher.

- `tests/crt-scroll-rendering.cjs`: **51 pixel checks** passed. The fixture contains a 16,384px document with colored rows and text. Checks read the rendered WebGL framebuffer, requiring both the expected row color and visible text ink; they do not infer rendering from `scrollTop`.
- Checks cover 390px width at heights 360, 600, and 844 with DPR 3; partial/disjoint tile coverage, tile boundaries, 12,000px jumps and return trips, native touch scrolling and settling, rapid/coalesced scroll requests, hidden-page edits, visibility restoration, `pageshow`, source edits, and resolutions 0.8 and 0.6. After initial paint, the test suppresses drawable-change notifications to exercise explicit invalidation.
- The same pixel test against the original renderer fails after scrolling 384px: expected row color `[23, 209, 127]`, actual `[8, 15, 11]`, with zero text ink pixels. The test does not inject blank pixels or modify the source snapshot.
- Existing suites passed: **105** browser assertions, **13** failure/compatibility assertions, and **22** layout/motion assertions. These include navigation, themes, selection/find/copy, terminal/history, resize, hidden rendering, context loss, unsupported APIs, blocked resources/storage, and automatic degradation.
- Runtime/test syntax, synchronized release keys, and `git diff --check` passed.

Total: **191** pixel and existing browser assertions passed, plus touch-movement and request-coalescing assertions within the pixel suite.

## Scroll performance

Tests ran serially with the existing interaction sampler and normal decorative motion. Desktop: 1440x1000, DPR 1. Mobile: 390x844, DPR 3, with renderer raster DPR capped at 2. The baseline used six seconds of scrolling; the final run used 24 seconds to observe sustained quality behavior. Both used About & Career after startup settling.

| Version | Viewport | Mean rAF fps | p95 interval | Final resolution | Final mode |
| --- | --- | ---: | ---: | ---: | --- |
| Before | Desktop | 60.0 | 16.7ms | 1.0 | Curved |
| Before | Mobile DPR 3 | 60.0 | 16.7ms | 1.0 | Curved |
| Corrected | Desktop | 60.0 | 16.8ms | 1.0 | Curved |
| Corrected | Mobile DPR 3 | 59.2 | 16.8ms | 1.0 | Curved |

All final sampled windows passed the existing >=55fps / p95 <=25ms thresholds. No automatic resolution reduction occurred. Raw baseline and final results are in [crt-scroll-performance-results.json](crt-scroll-performance-results.json).

## Reproduction and limits

Use the external tooling paths described in [initial verification](crt-verification.md#reproduction), start the static server, then run:

```sh
node tests/crt-scroll-rendering.cjs
node tests/crt-browser.cjs
node tests/crt-failures.cjs
node tests/crt-feedback.cjs
CRT_PERF_BROWSERS=chrome157 CRT_PERF_MODES=curved CRT_PERF_DURATION=24000 node tests/crt-performance.cjs
```

Pixel results: `/tmp/jujin-crt-results/scroll-rendering.json`. A failed pixel check saves `/tmp/jujin-crt-results/scroll-rendering-failure.png` for inspection. Existing suite results and performance output share that directory.

These results are local Linux browser automation and mobile viewport/touch emulation. They do not establish physical Android/Instagram correctness or hardware presentation fps. Physical in-app-browser verification remains outstanding. Remote Git, deployment, and public-site status are verified separately from these local checks.
