// Desktop-only camera motion and projected input, using the static preview.
const assert = require('node:assert/strict');
const { chromium, webkit } = require(process.env.CRT_PLAYWRIGHT || 'playwright');
const base = process.env.CRT_BASE_URL || 'http://127.0.0.1:8000/';
const rig = '#monitor-rig';

async function open(browser, mode, options = {}) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', ...options });
    page.on('pageerror', (error) => { throw error; });
    await page.route(/^https:/, (route) => route.abort());
    await page.addInitScript(() => sessionStorage.setItem('crt-power-seen', '1'));
    await page.goto(`${base}?crt-preview=1&crt-mode=${mode}`);
    await page.waitForFunction((value) => window.crtDiagnostics?.mode === value, mode);
    return page;
}

async function tilt(page, x, y) {
    await page.mouse.move(x, y);
    await page.waitForFunction(() => document.querySelector('#monitor-rig').hasAttribute('data-scene-tilted'), null, { timeout: 3000 });
    await page.waitForTimeout(650);
}

async function projectedPoint(page, selector, fraction = 0.5) {
    return page.locator(selector).evaluate((element, fraction) => {
        if (crtDiagnostics.mode === 'flat') {
            const rect = element.getBoundingClientRect();
            return { x: rect.x + rect.width * fraction, y: rect.y + rect.height / 2 };
        }
        let x = element.offsetWidth * fraction, y = element.offsetHeight / 2;
        for (let node = element; node && node.id !== 'crt-viewport'; node = node.offsetParent) {
            x += node.offsetLeft;
            y += node.offsetTop;
        }
        for (let node = element.parentElement; node && node.id !== 'crt-viewport'; node = node.parentElement) {
            x -= node.scrollLeft;
            y -= node.scrollTop;
        }
        const [screenX, screenY] = crtDiagnostics.toScreen(x, y);
        const marker = document.createElement('span');
        marker.style.cssText = `position:absolute;width:0;height:0;left:${screenX}px;top:${screenY}px;pointer-events:none`;
        document.querySelector('#monitor-glass').appendChild(marker);
        const rect = marker.getBoundingClientRect();
        marker.remove();
        return { x: rect.x, y: rect.y };
    }, fraction);
}

async function click(page, selector) {
    const point = await projectedPoint(page, selector);
    await page.mouse.click(point.x, point.y);
}

async function interactions(browser, mode, name) {
    const page = await open(browser, mode);
    await tilt(page, 1438, 2);
    await click(page, '[data-section=about]');
    await page.waitForFunction(() => location.hash === '#about');
    await page.evaluate(() => {
        const text = document.createElement('span');
        text.id = 'scene-test-selection';
        text.style.cssText = 'display:inline-block;font:16px/24px monospace';
        text.textContent = 'A selection on the angled CRT screen.';
        document.querySelector('#about').prepend(text);
    });
    const source = await projectedPoint(page, '#scene-test-selection', 0.06);
    await tilt(page, source.x, source.y);
    const start = await projectedPoint(page, '#scene-test-selection', 0.06);
    const end = await projectedPoint(page, '#scene-test-selection', 0.72);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    const heldTransform = await page.locator(rig).evaluate((element) => element.style.transform);
    await page.mouse.move(end.x, end.y, { steps: 12 });
    assert.equal(await page.locator(rig).evaluate((element) => element.style.transform), heldTransform);
    await page.mouse.up();
    assert.match(await page.evaluate(() => getSelection().toString()), /on the angled/);
    await page.mouse.wheel(0, 165);
    await page.waitForFunction(() => document.querySelector('#terminal-content').scrollTop > 0);
    const toggle = await page.locator('#terminal-toggle').boundingBox();
    await page.mouse.click(toggle.x + toggle.width / 2, toggle.y + toggle.height / 2);
    await page.waitForFunction(() => document.querySelector('#terminal-toggle').getAttribute('aria-expanded') === 'true');
    await page.keyboard.type('unfinished');
    assert.equal(await page.locator('.terminal-input').textContent(), 'unfinished');

    if (mode === 'curved') {
        const scroll = await page.locator('#terminal-content').evaluate((element) => element.scrollTop);
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForFunction(() => crtDiagnostics.mode === 'flat');
        assert.equal(await page.locator(rig).getAttribute('data-scene-tilted'), null);
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.waitForFunction(() => crtDiagnostics.mode === 'curved');
        assert.equal(await page.locator('.terminal-input').textContent(), 'unfinished');
        assert.equal(await page.locator('#terminal-content').evaluate((element) => element.scrollTop), scroll);
        assert.equal(new URL(page.url()).hash, '#about');
    }
    await tilt(page, 1438, 2);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => !document.querySelector('#monitor-rig').hasAttribute('data-scene-tilted'));
    await page.mouse.move(2, 898);
    assert.equal(await page.locator(rig).evaluate((element) => getComputedStyle(element).transform), 'none');
    await page.close();

    const fallback = await open(browser, mode);
    await tilt(fallback, 1438, 2);
    await fallback.evaluate(() => crtDiagnostics.submitSample({ fps: 35, p95: 40, slow: true }));
    await fallback.waitForFunction(() => !document.querySelector('#monitor-rig').hasAttribute('data-scene-tilted'));
    assert.equal(await fallback.evaluate(() => crtDiagnostics.mode), mode);
    await fallback.mouse.move(2, 898);
    assert.equal(await fallback.locator(rig).evaluate((element) => getComputedStyle(element).transform), 'none');
    console.log('PASS', name, 'menu click, selection, wheel, input, motion preference, performance fallback');
    await fallback.close();
}

(async () => {
    const browser = await chromium.launch({ executablePath: process.env.CRT_CHROME_BIN, args: ['--no-sandbox'] });
    try {
        for (const [width, height] of [[1000, 600], [1440, 900], [1920, 1080], [3840, 2160]]) {
            const page = await open(browser, 'flat', { viewport: { width, height } });
            for (const [x, y] of [[1, 1], [width - 2, 1], [1, height - 2], [width - 2, height - 2]]) {
                await tilt(page, x, y);
                const state = await page.evaluate(() => {
                    const rig = document.querySelector('#monitor-rig');
                    const pose = new DOMMatrix(getComputedStyle(rig).transform);
                    const withinViewport = [rig, ...rig.querySelectorAll('.monitor-depth')].every((element) => {
                        const box = element.getBoundingClientRect();
                        return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight;
                    });
                    return { x: pose.m41, y: pose.m42, horizontal: pose.m31, vertical: pose.m32, withinViewport,
                        overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight };
                });
                assert.ok(state.withinViewport && !state.overflow, JSON.stringify(state));
                assert.ok(Math.abs(state.x) > 10 && Math.abs(state.y) > 6);
                assert.equal(Math.sign(state.x), x === 1 ? 1 : -1);
                assert.equal(Math.sign(state.y), y === 1 ? 1 : -1);
                assert.ok(Math.abs(state.horizontal) > .1 && Math.abs(state.vertical) > .07);
            }
            await page.mouse.move(-5, -5);
            await page.waitForFunction(() => !document.querySelector('#monitor-rig').hasAttribute('data-scene-tilted'));
            console.log('PASS', `${width}x${height}`, 'four corners and return to neutral');
            await page.close();
        }
        await interactions(browser, 'curved', 'Chromium curved');
        await interactions(browser, 'flat', 'Chromium flat');
    } finally {
        await browser.close();
    }
    if (process.env.CRT_FIREFOX_BIN) {
        const { firefox } = require(process.env.CRT_FIREFOX_PLAYWRIGHT || process.env.CRT_PLAYWRIGHT || 'playwright');
        const browser = await firefox.launch({ executablePath: process.env.CRT_FIREFOX_BIN });
        try { await interactions(browser, 'flat', 'Firefox flat'); }
        finally { await browser.close(); }
    }
    if (process.env.CRT_WEBKIT_BIN) {
        const browser = await webkit.launch({ executablePath: process.env.CRT_WEBKIT_BIN,
            env: { ...process.env, WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS: '1', LIBGL_ALWAYS_SOFTWARE: '1' } });
        try { await interactions(browser, 'flat', 'WebKit flat'); }
        finally { await browser.close(); }
    }
})().catch((error) => { console.error(error); process.exitCode = 1; });
