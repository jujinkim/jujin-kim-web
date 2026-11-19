// Compact screens use the native DOM and never initialize curvature/WebGL.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.CRT_PLAYWRIGHT || 'playwright');
const base = process.env.CRT_BASE_URL || 'http://127.0.0.1:8000/';
const results = [];
function check(name, pass, detail) {
    results.push({ name, pass: !!pass, detail });
    console.log(pass ? 'PASS' : 'FAIL', name, JSON.stringify(detail || {}));
    assert.ok(pass, name);
}
async function pageFor(browser, viewport, options = {}, query = '') {
    const page = await browser.newPage({ viewport, colorScheme: 'dark', reducedMotion: 'reduce', ...options });
    page.errors = [];
    page.on('pageerror', e => page.errors.push(e.message));
    await page.route(/^https:/, route => new URL(route.request().url()).origin === new URL(base).origin
        ? route.continue() : route.abort());
    await page.addInitScript(() => {
        window.webglRequests = 0;
        const get = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
            if (kind.includes('webgl')) webglRequests++;
            return get.call(this, kind, ...args);
        };
    });
    await page.goto(base + '?crt-preview=1' + query);
    if (options.reducedMotion === 'no-preference') await page.waitForFunction(() => !!window.crtDiagnostics);
    else await page.waitForFunction(() => !!window.crtDiagnostics?.reason || crtDiagnostics.mode === 'curved');
    return page;
}
(async () => {
    fs.mkdirSync('/tmp/jujin-crt-results', { recursive: true });
    const browser = await chromium.launch({ executablePath: process.env.CRT_CHROME_BIN, args: ['--no-sandbox'] });
    try {
        for (const [width, height] of [[360, 800], [390, 844], [844, 390], [768, 1024], [999, 800], [1000, 599]]) {
            for (const colorScheme of ['dark', 'light']) {
                const page = await pageFor(browser, { width, height }, { colorScheme, hasTouch: true, deviceScaleFactor: 3 });
                const state = await page.evaluate(() => ({ mode: crtDiagnostics.mode, reason: crtDiagnostics.reason,
                    canvas: !!document.querySelector('#crt-canvas'), webglRequests,
                    parent: document.querySelector('#crt-viewport').parentElement.id,
                    glass: getComputedStyle(document.querySelector('.crt-glass')).display,
                    scanlines: getComputedStyle(document.querySelector('.crt-scanlines')).display,
                    effects: document.body.classList.contains('crt-effects-enabled'),
                    overflow: document.documentElement.scrollWidth > innerWidth }));
                check(`${width}x${height} ${colorScheme}: flat CRT without WebGL`, state.mode === 'flat' &&
                    state.reason === 'compact-viewport' && !state.canvas && state.webglRequests === 0 &&
                    state.parent === 'monitor-glass' && state.glass === 'none' && state.scanlines !== 'none' &&
                    state.effects && !state.overflow, state);
                await page.locator('[data-section=about]').tap();
                await page.locator('#terminal-content').evaluate(e => e.scrollTop = 180);
                check(`${width}x${height} ${colorScheme}: native content and scrolling`, await page.evaluate(() =>
                    location.hash === '#about' && document.querySelector('#terminal-content').scrollTop > 0 &&
                    window.find('Samsung') && getSelection().toString() === 'Samsung'));
                if (width === 390) {
                    await page.keyboard.press('Control+c');
                    await page.evaluate(() => {
                        const area = document.createElement('textarea'); area.id = 'compact-paste';
                        area.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px';
                        document.body.append(area); area.focus();
                    });
                    await page.keyboard.press('Control+v');
                    check(`${colorScheme}: native copy`, await page.locator('#compact-paste').inputValue() === 'Samsung');
                    await page.locator('#compact-paste').evaluate(e => e.remove());
                    await page.screenshot({ path: `/tmp/jujin-crt-results/compact-${colorScheme}.png` });
                }
                check(`${width}x${height} ${colorScheme}: no script errors`, !page.errors.length, page.errors);
                await page.close();
            }
        }
        const page = await pageFor(browser, { width: 1440, height: 1000 });
        await page.locator('[data-section=about]').click();
        await page.evaluate(() => {
            document.querySelector('.terminal-input').textContent = 'unfinished';
            document.querySelector('#terminal-content').scrollTop = 20;
            document.querySelector('#terminal-content').focus({ preventScroll: true });
        });
        for (const [width, height, mode] of [[390, 844, 'flat'], [1440, 1000, 'curved'], [999, 800, 'flat'], [1000, 600, 'curved']]) {
            await page.setViewportSize({ width, height });
            await page.waitForFunction(mode => crtDiagnostics.mode === mode, mode);
            const state = await page.evaluate(() => ({ mode: crtDiagnostics.mode, canvas: !!document.querySelector('#crt-canvas'),
                count: document.querySelectorAll('#crt-viewport').length, section: location.hash,
                input: document.querySelector('.terminal-input').textContent,
                scroll: document.querySelector('#terminal-content').scrollTop,
                focus: document.activeElement.id, power: !!document.querySelector('.power-on') }));
            check(`${width}x${height}: resize preserves DOM and state`, state.canvas === (mode === 'curved') &&
                state.count === 1 && state.section === '#about' && state.input === 'unfinished' &&
                state.scroll === 20 && state.focus === 'terminal-content' && !state.power, state);
        }
        await page.evaluate(() => {
            crtDiagnostics.submitSample({ fps: 30, p95: 40, slow: true });
            crtDiagnostics.submitSample({ fps: 30, p95: 40, slow: true });
        });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForFunction(() => crtDiagnostics.reason === 'compact-viewport');
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.waitForFunction(() => crtDiagnostics.mode === 'curved');
        check('quality level survives resize', await page.evaluate(() => crtDiagnostics.resolution === .8 && crtDiagnostics.stats.resolution === .8));
        await page.evaluate(() => crtDiagnostics.forceFlat());
        await page.setViewportSize({ width: 390, height: 844 });
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.waitForTimeout(150);
        check('render failure stays flat across resize', await page.evaluate(() => crtDiagnostics.mode === 'flat' && !document.querySelector('#crt-canvas')));
        await page.evaluate(() => crtDiagnostics.forceWeb1());
        await page.setViewportSize({ width: 390, height: 844 });
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.waitForTimeout(150);
        check('Web 1.0 remains sticky across resize', await page.evaluate(() => crtDiagnostics.mode === 'web1' && !document.querySelector('#crt-canvas')));
        await page.close();
        const startup = await pageFor(browser, { width: 1440, height: 1000 }, { reducedMotion: 'no-preference' });
        await startup.waitForFunction(() => !!document.querySelector('.power-on'));
        await startup.setViewportSize({ width: 390, height: 844 });
        await startup.waitForFunction(() => !document.querySelector('.power-on') && crtDiagnostics.reason === 'compact-viewport');
        check('resize during startup never initializes mobile WebGL', await startup.evaluate(() => webglRequests === 0 && !document.querySelector('#crt-canvas')));
        await startup.close();
    } finally {
        await browser.close();
        fs.writeFileSync('/tmp/jujin-crt-results/compact.json', JSON.stringify(results, null, 2));
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
