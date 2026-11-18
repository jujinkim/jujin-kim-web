// Verify the displayed screen reaches the bezel, including glass-overlay corners.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.CRT_PLAYWRIGHT || 'playwright');
const base = process.env.CRT_BASE_URL || 'http://127.0.0.1:8000/';
const dir = '/tmp/jujin-crt-results';
const phase = process.env.CRT_EDGE_PHASE || 'after';
const diagnose = process.env.CRT_EDGE_DIAGNOSE === '1';
const results = [];
const background = [100, 190, 135];

(async () => {
    fs.mkdirSync(dir, { recursive: true });
    const browser = await chromium.launch({ executablePath: process.env.CRT_CHROME_BIN, args: ['--no-sandbox'] });
    try {
        for (const [width, height, dpr] of [[1000, 600, 1], [1440, 1000, 1], [1440, 1000, 1.25], [1920, 1080, 2]]) {
            for (const theme of ['dark', 'light']) for (const mode of ['curved', 'flat']) {
                const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr,
                    colorScheme: theme, reducedMotion: 'reduce' });
                const errors = [];
                page.on('pageerror', error => errors.push(error.message));
                await page.route(/^https:/, route =>
                    new URL(route.request().url()).origin === new URL(base).origin
                        ? route.continue() : route.abort());
                if (process.env.CRT_EDGE_CURVATURE_SOURCE) {
                    const source = fs.readFileSync(process.env.CRT_EDGE_CURVATURE_SOURCE, 'utf8');
                    await page.route('**/screen-curvature.js?*', route => route.fulfill({
                        contentType: 'text/javascript', body: source
                    }));
                }
                await page.goto(base + '?crt-preview=1' + (mode === 'flat' ? '&crt-mode=flat' : ''));
                await page.waitForFunction(mode => crtDiagnostics.mode === mode, mode);
                await page.evaluate(() => document.fonts.ready);
                if (width === 1440 && dpr === 1 && mode === 'curved')
                    await page.screenshot({ path: `${dir}/screen-edge-${phase}-${theme}-page.png` });
                await page.addStyleTag({ content: `
                    #crt-screen > :not(.crt-glass) { display:none !important; }
                    #terminal-container, #terminal-container * {
                        color:transparent !important; border-color:transparent !important;
                        background:transparent !important; box-shadow:none !important; text-shadow:none !important;
                    }
                    #terminal-container img { opacity:0; }
                    ${process.env.CRT_EDGE_HIDE_GLASS === '1' ? '.crt-glass { display:none !important; }' : ''}
                ` });
                await page.evaluate(background => {
                    document.querySelector('#crt-viewport').style.background = `rgb(${background})`;
                }, background);
                await page.waitForTimeout(200);
                const box = await page.locator('#monitor-glass').boundingBox();
                const canvas = await page.locator(mode === 'curved' ? '#crt-canvas' : '#crt-viewport').boundingBox();
                const png = await page.screenshot({ clip: box,
                    path: `${dir}/screen-edge-${phase}-${width}-${dpr}-${theme}-${mode}.png` });
                const samples = await page.evaluate(async ({ png, background, dpr }) => {
                    const img = new Image();
                    img.src = 'data:image/png;base64,' + png;
                    await img.decode();
                    const c = document.createElement('canvas');
                    c.width = img.naturalWidth; c.height = img.naturalHeight;
                    const ctx = c.getContext('2d', { willReadFrequently: true });
                    ctx.drawImage(img, 0, 0);
                    const edge = Math.ceil(2 * dpr);
                    const points = [
                        ['top-left', edge, edge], ['top-right', c.width - edge - 1, edge],
                        ['bottom-left', edge, c.height - edge - 1], ['bottom-right', c.width - edge - 1, c.height - edge - 1],
                        ['top', Math.floor(c.width / 2), edge], ['bottom', Math.floor(c.width / 2), c.height - edge - 1],
                        ['left', edge, Math.floor(c.height / 2)], ['right', c.width - edge - 1, Math.floor(c.height / 2)]
                    ];
                    return points.map(([name, x, y]) => {
                        const pixel = [...ctx.getImageData(x, y, 1, 1).data].slice(0, 3);
                        return { name, pixel, ratio: pixel.reduce((a, b) => a + b, 0) / background.reduce((a, b) => a + b, 0) };
                    });
                }, { png: png.toString('base64'), background, dpr });
                const aligned = ['x', 'y', 'width', 'height'].every(k => Math.abs(canvas[k] - box[k]) < .02);
                // Existing translucent glass darkens corners; empty shader wedges are
                // nearly black (about 0.05 of the fixture brightness), not shaded green.
                const pass = aligned && samples.every(p => p.ratio >= .45) && !errors.length;
                const result = { width, height, dpr, theme, mode, pass, aligned, samples, errors };
                results.push(result);
                console.log(pass ? 'PASS' : 'FAIL', width, dpr, theme, mode, JSON.stringify(samples));
                await page.close();
                if (!diagnose) assert.ok(pass, `${width}/${dpr}/${theme}/${mode}: screen must reach all bezel corners`);
            }
        }
    } finally {
        await browser.close();
        fs.writeFileSync(`${dir}/screen-edge-${phase}.json`, JSON.stringify(results, null, 2));
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
