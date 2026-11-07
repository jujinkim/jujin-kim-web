// Run against the local static server; see docs/crt-verification.md.
const fs = require('fs');
const { chromium, firefox, webkit } = require(process.env.CRT_PLAYWRIGHT || 'playwright');
const results = [];
fs.mkdirSync('/tmp/jujin-crt-results', { recursive: true });
(async () => {
    for (const [name, engine, path] of [
        ['chrome157', chromium, process.env.CRT_CHROME_BIN],
        ['firefox', firefox, process.env.CRT_FIREFOX_BIN],
        ['webkit', webkit, process.env.CRT_WEBKIT_BIN]
    ]) {
        if (process.env.CRT_PERF_BROWSERS && !process.env.CRT_PERF_BROWSERS.split(',').includes(name)) continue;
        const selected =
            name === 'firefox'
                ? require(process.env.CRT_FIREFOX_PLAYWRIGHT || process.env.CRT_PLAYWRIGHT || 'playwright')
                      .firefox
                : engine;
        const b = await selected.launch({
            headless: true,
            executablePath: path,
            args: name === 'chrome157' ? ['--no-sandbox'] : [],
            env: { ...process.env, WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS: '1', LIBGL_ALWAYS_SOFTWARE: '1' }
        });
        try {
            for (const [label, width, height, dpr] of [
                ['desktop', 1440, 1000, 1],
                ['mobile-retina', 390, 844, 3]
            ])
                for (const mode of name === 'chrome157' ? ['curved', 'flat', 'web1'] : ['flat', 'web1']) {
                    if (process.env.CRT_PERF_MODES && !process.env.CRT_PERF_MODES.split(',').includes(mode)) continue;
                    if (process.env.CRT_PERF_VIEWPORTS && !process.env.CRT_PERF_VIEWPORTS.split(',').includes(label)) continue;
                    const p = await b.newPage({
                        viewport: { width, height },
                        deviceScaleFactor: dpr,
                        colorScheme: 'dark'
                    });
                    await p.route(/^https:/, (r) => r.abort());
                    await p.goto(
                        (process.env.CRT_BASE_URL || 'http://127.0.0.1:8000/') +
                            '?crt-preview=1' +
                            (mode === 'curved' ? '' : '&crt-mode=' + mode),
                        { waitUntil: 'domcontentloaded' }
                    );
                    await p.waitForTimeout(1800);
                    await p.locator('[data-section=about]').click();
                    await p.waitForTimeout(1600);
                    const sample = await p.evaluate(
                        (duration) =>
                            new Promise((resolve) => {
                                const scroller = document.querySelector('#terminal-content'),
                                    frames = [];
                                let first, last;
                                const before = { ...crtDiagnostics.stats };
                                function tick(t) {
                                    first ??= t;
                                    if (last !== undefined) frames.push(t - last);
                                    last = t;
                                    scroller.scrollTop =
                                        ((Math.sin((t - first) / 400) + 1) / 2) *
                                        (scroller.scrollHeight - scroller.clientHeight);
                                    if (t - first < duration) requestAnimationFrame(tick);
                                    else {
                                        frames.sort((a, b) => a - b);
                                        resolve({
                                            fps: (1000 * frames.length) / frames.reduce((a, b) => a + b, 0),
                                            p95: frames[Math.floor(frames.length * 0.95)],
                                            endMode: crtDiagnostics.mode,
                                            resolution: crtDiagnostics.resolution,
                                            samples: crtDiagnostics.samples,
                                            before,
                                            after: crtDiagnostics.stats
                                        });
                                    }
                                }
                                requestAnimationFrame(tick);
                            }),
                        Number(process.env.CRT_PERF_DURATION || 6000)
                    );
                    const r = { browser: name, version: b.version(), label, mode, ...sample };
                    results.push(r);
                    console.log(JSON.stringify(r));
                    await p.close();
                }
        } finally {
            await b.close();
        }
    }
    fs.writeFileSync('/tmp/jujin-crt-results/performance.json', JSON.stringify(results, null, 2));
})().catch((e) => {
    fs.writeFileSync('/tmp/jujin-crt-results/performance.json', JSON.stringify(results, null, 2));
    console.error(e);
    process.exitCode = 1;
});
