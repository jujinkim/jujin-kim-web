# First-paint startup correction — 2026-11-10

Release key: `20261110.2`.

## Behavior

Previously, the static screen was visible before `DOMContentLoaded` initialized the CRT module and added `power-on`. A slow module graph could therefore show the full screen, hide it again, and then play the power animation.

A small synchronous head script now arms a pending state before the body is painted. Screen content stays hidden against a dark glass background until the CRT module consumes that state and starts the effect. Both the content reveal and light pulse last **600ms**, followed by curvature setup. Light and Dark themes share the dark power-off background; Light returns to its chosen background after startup.

The guard applies only when the existing first-visit session policy permits the effect. Reloads, reduced motion, blocked storage, and Web 1.0 skip it. JavaScript-disabled pages never arm it. Load completion or a 1500ms watchdog releases an unconsumed guard if initialization fails or stalls. Late modules skip the effect instead of hiding an already visible screen. CSS also finishes the reveal if animation cleanup is delayed.

No public interfaces, storage keys, or steady-state rendering/performance policies changed.

## Local verification

Chrome **157.0.8103.38**, `--no-sandbox`, HTTP at `127.0.0.1:8000`, no experimental feature flags. Existing compatibility checks also use the prepared WebKit **27.2** launcher.

- `tests/crt-startup.cjs`: **14 checks** for the first painted frame with module requests held, both 600ms animation durations, absence of a fully lit frame before animation, completion/curvature setup, once-per-tab behavior, Light-theme backgrounds, slow-module fail-open behavior, no late replay, reduced motion, blocked storage/modules, and Web 1.0.
- Existing suites: **105** browser assertions, **13** failure/compatibility assertions, **51** scroll pixel checks, and **22** layout/motion checks passed. The existing power-duration assertion now requires 600ms.
- Runtime/test and inline bootstrap syntax, synchronized cache keys, and `git diff --check` passed.

Total: **205** checks. Results: `/tmp/jujin-crt-results/startup.json`. The first-paint screenshot with modules held is `/tmp/jujin-crt-results/startup-before-modules.png`.

Use the external browser/tooling paths in [initial verification](crt-verification.md#reproduction), serve the checkout, and run `node tests/crt-startup.cjs` plus the existing suites.

These are local browser checks, including mobile viewport emulation. No physical Instagram/Android test or new steady-state FPS benchmark was performed. Earlier scroll measurements belong to release `20261110.1`. Remote Git and public deployment are verified separately.
