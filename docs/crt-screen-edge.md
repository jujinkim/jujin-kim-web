# Screen corners touching the bezel — 2026-11-18

The reported defect is the rendered screen pulling away from the monitor's inner frame increasingly toward each corner. Its outer footprint must fill the rectangular opening. Changing the opening's aspect ratio does not address this defect.

On this date, the public HTML at `https://jujin.kim/` still referenced `v=20261110.2`. Its fetched curvature module used the old `p * (1 + k * p.yx²)` source mapping. At corners this samples outside the source rectangle, leaving a dark wedge; the midpoint of each outer edge still samples inside. The local `20261114.1` changes from the preceding task had not been committed or published.

The local renderer already replaces that mapping on desktop with `p * (1 - k * (1 - p.x²) * (1 - p.y²))`. Every point on all four outer edges stays fixed, including corners. Only the interior bends. The shader, inverse coordinates and tile scissors use the same mapping. The monitor's existing 4:3 opening, bezel, mobile layout and glass shading remain.

## Direct pixel evidence

`tests/crt-screen-edge.cjs` captures displayed screenshots, rather than inferring the footprint from canvas dimensions or coordinate equations. A uniform green test surface exposes missing pixels. It samples two CSS pixels inside four corners and four edge midpoints, and verifies that the rendered surface and glass bounds coincide.

- With the fetched public renderer intercepted into the current local layout and glass shading hidden, all eight curved cases reproduced four black corners (`[6, 8, 6]`, about 4.7% of the source brightness), while edge midpoints and the flat control remained filled.
- With the local renderer and glass hidden, all 16 cases filled the corners and edge midpoints.
- With the local renderer and existing glass visible, all 16 cases passed. Shaded corners are distinguished from the nearly black empty wedges; the PNG shading is intentionally retained.
- Matrix: 1000x600 at DPR 1, 1440x1000 at DPR 1 and 1.25, 1920x1080 at DPR 2; Light/Dark; curved/flat. All 128 sampled positions in the final matrix passed. No page exceptions occurred.

The old/new renderer comparison above uses local fixtures with the same layout. It is not a screenshot of an updated public deployment. Local browser: prepared Chromium 157.0.8103.38, `--no-sandbox`, no experimental flags, emulated DPR. Windows/Edge hardware remains untested. These measurements preceded commit, push and deployment; release status is verified separately. [Recorded pixels](crt-screen-edge-results.json) preserve the observed difference and public/local release keys.

## Reproduction

Use the external tooling variables documented in [initial verification](crt-verification.md#reproduction), then start the static HTTP server:

```sh
node tests/crt-screen-edge.cjs
CRT_EDGE_PHASE=geometry CRT_EDGE_HIDE_GLASS=1 node tests/crt-screen-edge.cjs
```

To reproduce the old geometry, save the old public module and set `CRT_EDGE_CURVATURE_SOURCE` to its path. `CRT_EDGE_DIAGNOSE=1` records failing cases without aborting. Screenshots and JSON are stored under `/tmp/jujin-crt-results/screen-edge-*`.
