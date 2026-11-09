// Pixel regression for native scrollport clipping and missing changedElements notifications.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.CRT_PLAYWRIGHT || 'playwright');
const dir = '/tmp/jujin-crt-results';
const results = [];
const colors = [
    [237, 49, 73],
    [23, 209, 127],
    [67, 103, 241]
];

function installProbe() {
    const probe = (window.scrollProbe = { omitChanges: false, sequence: 0 });
    const listen = HTMLCanvasElement.prototype.addEventListener;
    HTMLCanvasElement.prototype.addEventListener = function (type, listener, options) {
        if (this.id !== 'crt-canvas' || type !== 'paint') return listen.call(this, type, listener, options);
        return listen.call(
            this,
            type,
            function (event) {
                listener.call(this, probe.omitChanges ? { changedElements: [] } : event);
                const gl = this.getContext('webgl2');
                const pixels = new Uint8Array(this.width * this.height * 4);
                gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                probe.pixels = pixels;
                probe.width = this.width;
                probe.height = this.height;
                probe.sequence++;
            },
            options
        );
    };
}

async function frame(page, action, value) {
    const before = await page.evaluate(() => scrollProbe.sequence);
    await page.evaluate(action, value);
    await page.waitForFunction((n) => scrollProbe.sequence > n, before);
}

async function checkRow(page, row, name, expected = colors[row % colors.length]) {
    const detail = await page.evaluate(
        ({ row, expected }) => {
            const canvas = document.querySelector('#crt-canvas');
            const element = document.querySelector(`[data-probe-row="${row}"]`);
            let x = 0,
                y = 0;
            for (
                let node = element;
                node && node.id !== 'crt-viewport' && node !== canvas;
                node = node.offsetParent
            ) {
                x += node.offsetLeft;
                y += node.offsetTop;
            }
            for (
                let node = element.parentElement;
                node && node.id !== 'crt-viewport';
                node = node.parentElement
            ) {
                x -= node.scrollLeft;
                y -= node.scrollTop;
            }
            function pixel(sx, sy) {
                const point = crtDiagnostics.toScreen(sx, sy);
                const px = Math.floor((point[0] * scrollProbe.width) / canvas.clientWidth);
                const py = Math.floor((point[1] * scrollProbe.height) / canvas.clientHeight);
                const index = ((scrollProbe.height - py - 1) * scrollProbe.width + px) * 4;
                return [...scrollProbe.pixels.slice(index, index + 3)];
            }
            const actual = pixel(x + element.offsetWidth * 0.85, y + 32);
            let ink = 0;
            for (let dy = 18; dy < 46; dy++)
                for (let dx = 24; dx < 150; dx++)
                    if (pixel(x + dx, y + dy).every((channel) => channel > 220)) ink++;
            return { row, actual, expected, ink, mode: crtDiagnostics.mode };
        },
        { row, expected }
    );
    const pass =
        detail.mode === 'curved' &&
        detail.actual.length === 3 &&
        detail.actual.every((channel, i) => Math.abs(channel - detail.expected[i]) <= 2) &&
        detail.ink > 20;
    results.push({ name, pass, ...detail });
    console.log(pass ? 'PASS' : 'FAIL', name, JSON.stringify(detail));
    if (!pass) await page.screenshot({ path: `${dir}/scroll-rendering-failure.png` });
    assert.ok(pass, name);
}

async function fixture(page, viewport) {
    const p = await page.newPage({
        viewport,
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 3,
        colorScheme: 'dark',
        reducedMotion: 'reduce'
    });
    await p.route(/^https:/, (route) => route.abort());
    await p.addInitScript(installProbe);
    await p.goto((process.env.CRT_BASE_URL || 'http://127.0.0.1:8000/') + '?crt-preview=1#projects');
    await p.waitForFunction(() => window.crtDiagnostics?.mode === 'curved');
    await p.evaluate(() => document.fonts.ready);
    await frame(
        p,
        (colors) => {
            const body = document.querySelector('.content-border');
            body.style.cssText = 'display:block;padding:0;border:0;min-height:0';
            body.replaceChildren(
                ...Array.from({ length: 256 }, (_, row) => {
                    const element = document.createElement('div');
                    element.dataset.probeRow = row;
                    element.style.cssText = `height:64px;line-height:64px;padding-left:24px;color:#fff;font-size:16px;background:rgb(${colors[row % colors.length]})`;
                    element.textContent = `Rendered row ${row}`;
                    return element;
                })
            );
            document.querySelector('#terminal-content').scrollTop = 0;
        },
        colors
    );
    await p.waitForTimeout(150);
    await p.evaluate(() => {
        scrollProbe.omitChanges = true;
    });
    return p;
}

(async () => {
    fs.mkdirSync(dir, { recursive: true });
    const browser = await chromium.launch({
        executablePath: process.env.CRT_CHROME_BIN,
        args: ['--no-sandbox']
    });
    try {
        for (const height of [360, 600, 844]) {
            const p = await fixture(browser, { width: 390, height });
            const clientHeight = await p.locator('#terminal-content').evaluate((el) => el.clientHeight);
            await checkRow(p, Math.floor(clientHeight / 128), `${height}: initial text and color`);
            for (const top of [384, 256, 128, 640, 1760, 0, 128, 12000, 0]) {
                await frame(
                    p,
                    (top) => {
                        document.querySelector('#terminal-content').scrollTop = top;
                    },
                    top
                );
                const row = Math.floor((top + clientHeight - 96) / 64);
                await checkRow(p, row, `${height}: scroll ${top}, visible text and color`);
            }
            // A changed snapshot can be missed while hidden or restored from navigation.
            for (const [index, lifecycle] of ['visibilitychange', 'pageshow'].entries()) {
                const row = Math.floor((clientHeight - 96) / 64);
                const color = colors[index * 2];
                await p.evaluate(
                    ({ row, color, lifecycle }) => {
                        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
                        document.dispatchEvent(new Event('visibilitychange'));
                        const element = document.querySelector(`[data-probe-row="${row}"]`);
                        element.style.background = `rgb(${color})`;
                        element.textContent = `Restored ${lifecycle}`;
                    },
                    { row, color, lifecycle }
                );
                await p.waitForTimeout(80);
                await frame(
                    p,
                    (lifecycle) => {
                        delete document.hidden;
                        if (lifecycle === 'pageshow')
                            window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
                        else document.dispatchEvent(new Event('visibilitychange'));
                    },
                    lifecycle
                );
                await checkRow(p, row, `${height}: ${lifecycle} refreshes visible pixels`, color);
            }
            const rect = await p.locator('#terminal-content').boundingBox();
            const cdp = await p.context().newCDPSession(p);
            const x = rect.x + rect.width / 2;
            const startY = rect.y + rect.height * 0.8;
            await cdp.send('Input.dispatchTouchEvent', {
                type: 'touchStart',
                touchPoints: [{ x, y: startY }]
            });
            for (let i = 1; i <= 10; i++) {
                await cdp.send('Input.dispatchTouchEvent', {
                    type: 'touchMove',
                    touchPoints: [{ x, y: startY - i * 20 }]
                });
                await p.waitForTimeout(16);
            }
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            await p.waitForFunction(() => {
                const top = document.querySelector('#terminal-content').scrollTop;
                scrollProbe.stableFrames =
                    top === scrollProbe.lastTop ? (scrollProbe.stableFrames || 0) + 1 : 0;
                scrollProbe.lastTop = top;
                return scrollProbe.stableFrames >= 4;
            });
            const top = await p.locator('#terminal-content').evaluate((el) => el.scrollTop);
            assert.ok(top > 0, 'native touch scroll moves content');
            const row = Math.floor((top + clientHeight / 2) / 64);
            const restoredRow = Math.floor((clientHeight - 96) / 64);
            await checkRow(
                p,
                row,
                `${height}: native touch scroll displays text`,
                row === restoredRow ? colors[2] : colors[row % colors.length]
            );
            const before = await p.evaluate(() => crtDiagnostics.stats.frames);
            await frame(p, () => {
                for (const top of [64, 512, 1800, 12000, 128, 640]) {
                    const scroller = document.querySelector('#terminal-content');
                    scroller.scrollTop = top;
                    scroller.dispatchEvent(new Event('scroll'));
                }
            });
            const frames = await p.evaluate((before) => crtDiagnostics.stats.frames - before, before);
            assert.ok(frames <= 2, `scroll requests coalesce: ${frames} frames`);
            const finalRow = Math.floor((640 + clientHeight / 2) / 64);
            await checkRow(p, finalRow, `${height}: rapid scroll displays final content`);
            await frame(
                p,
                (row) => {
                    const element = document.querySelector(`[data-probe-row="${row}"]`);
                    element.style.background = 'rgb(231, 201, 41)';
                    element.textContent = 'Updated cached text';
                },
                finalRow
            );
            await checkRow(p, finalRow, `${height}: source edits invalidate cached pixels`, [231, 201, 41]);
            for (const resolution of [0.8, 0.6]) {
                await frame(p, () => {
                    for (let i = 0; i < 2; i++) crtDiagnostics.submitSample({ fps: 30, p95: 40, slow: true });
                    document.querySelector('#terminal-content').scrollTop = 12000;
                });
                await frame(p, () => {
                    document.querySelector('#terminal-content').scrollTop = 12128;
                });
                await checkRow(
                    p,
                    Math.floor((12128 + clientHeight - 96) / 64),
                    `${height}: resolution ${resolution} exposes fresh pixels`
                );
            }
            await p.close();
        }
    } finally {
        await browser.close();
        fs.writeFileSync(
            `${dir}/scroll-rendering.json`,
            JSON.stringify({ version: browser.version(), results }, null, 2)
        );
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
