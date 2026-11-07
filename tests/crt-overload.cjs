// Real main-thread overload verifies measured degradation, not injected samples.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.CRT_PLAYWRIGHT || 'playwright');
(async () => {
    const browser = await chromium.launch({
        executablePath: process.env.CRT_CHROME_BIN,
        args: ['--no-sandbox']
    });
    try {
        const page = await browser.newPage({
            viewport: { width: 1440, height: 1000 },
            reducedMotion: 'reduce'
        });
        await page.route(/^https:/, (route) => route.abort());
        await page.goto((process.env.CRT_BASE_URL || 'http://127.0.0.1:8000/') + '?crt-preview=1', {
            waitUntil: 'domcontentloaded'
        });
        await page.waitForFunction(() => window.crtDiagnostics?.mode === 'curved');
        await page.locator('[data-section=about]').click();
        await page.waitForTimeout(3200);
        const result = await page.evaluate(
            () =>
                new Promise((resolve) => {
                    let count = 0,
                        first,
                        previous = '';
                    const transitions = [],
                        scroller = document.querySelector('#terminal-content');
                    function tick(time) {
                        first ??= time;
                        const state = crtDiagnostics.mode + ':' + crtDiagnostics.resolution;
                        if (state !== previous) {
                            transitions.push({ afterMs: time - first, state });
                            previous = state;
                        }
                        if (crtDiagnostics.mode === 'web1' || time - first > 24000) {
                            resolve({
                                transitions,
                                samples: crtDiagnostics.samples,
                                canvas: !!document.querySelector('#crt-canvas'),
                                noise: !!document.querySelector('.crt-noise'),
                                reason: crtDiagnostics.reason
                            });
                            return;
                        }
                        scroller.scrollTop = (count++ % 20) * 20;
                        const end = performance.now() + 40;
                        while (performance.now() < end) {}
                        requestAnimationFrame(tick);
                    }
                    requestAnimationFrame(tick);
                })
        );
        assert.deepEqual(
            result.transitions.map((step) => step.state),
            ['curved:1', 'curved:0.8', 'curved:0.6', 'web1:0.6']
        );
        assert.equal(result.canvas, false);
        assert.equal(result.noise, false);
        assert.equal(result.reason, 'sustained-low-performance');
        fs.mkdirSync('/tmp/jujin-crt-results', { recursive: true });
        fs.writeFileSync('/tmp/jujin-crt-results/overload.json', JSON.stringify(result, null, 2));
        console.log('PASS measured overload', result.transitions);
    } finally {
        await browser.close();
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
