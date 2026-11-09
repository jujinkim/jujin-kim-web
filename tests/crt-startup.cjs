// First-paint and fail-open checks; use the external tooling in docs/crt-verification.md.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.CRT_PLAYWRIGHT || 'playwright');
const results = [];
const url = (process.env.CRT_BASE_URL || 'http://127.0.0.1:8000/') + '?crt-preview=1';

function check(name, value, detail) {
    results.push({ name, pass: !!value, detail });
    console.log(value ? 'PASS' : 'FAIL', name, JSON.stringify(detail || {}));
    assert.ok(value, name);
}

function probe() {
    window.powerProbe = { frames: [], starts: [] };
    document.addEventListener(
        'animationstart',
        (event) => {
            if (event.animationName.startsWith('monitor-'))
                powerProbe.starts.push({ name: event.animationName, time: performance.now() });
        },
        true
    );
    function sample() {
        const viewport = document.querySelector('#crt-viewport');
        if (
            viewport &&
            getComputedStyle(document.documentElement).getPropertyValue('--terminal-shell-width')
        ) {
            powerProbe.frames.push({
                time: performance.now(),
                visible: getComputedStyle(viewport).visibility === 'visible',
                pending: document.documentElement.dataset.crtStartup === 'pending',
                power: document.querySelector('#monitor-glass').classList.contains('power-on')
            });
        }
        if (powerProbe.frames.length < 300) requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
}

async function pageFor(browser, options = {}) {
    const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
        colorScheme: 'dark',
        ...options
    });
    await page.route(/^https:/, (route) => route.abort());
    await page.addInitScript(probe);
    return page;
}

async function holdModules(page) {
    let release;
    const barrier = new Promise((resolve) => {
        release = resolve;
    });
    await page.route('**/js/main.js?*', async (route) => {
        await barrier;
        await route.continue();
    });
    await page.goto(url, { waitUntil: 'commit' });
    await page.waitForFunction(
        () => window.powerProbe?.frames.length && performance.getEntriesByName('first-paint').length
    );
    return release;
}

(async () => {
    fs.mkdirSync('/tmp/jujin-crt-results', { recursive: true });
    const browser = await chromium.launch({
        executablePath: process.env.CRT_CHROME_BIN,
        args: ['--no-sandbox']
    });
    try {
        let page = await pageFor(browser);
        const release = await holdModules(page);
        const held = await page.evaluate(() => powerProbe.frames);
        check(
            'first painted screen stays hidden while modules load',
            held.length > 0 && held.every((frame) => frame.pending && !frame.visible && !frame.power),
            held
        );
        await page.screenshot({ path: '/tmp/jujin-crt-results/startup-before-modules.png' });
        release();
        await page.waitForFunction(() => document.querySelector('.power-on'));
        const durations = await page.evaluate(() =>
            document
                .getAnimations()
                .filter((animation) => animation.animationName?.startsWith('monitor-'))
                .map((animation) => animation.effect.getTiming().duration)
        );
        check(
            'both power animations last 600ms',
            durations.length === 2 && durations.every((duration) => duration === 600),
            durations
        );
        await page.waitForFunction(
            () => window.crtDiagnostics?.mode === 'curved' && !document.querySelector('.power-on')
        );
        const sequence = await page.evaluate(() => powerProbe);
        const start = sequence.starts.find((entry) => entry.name === 'monitor-start')?.time;
        check(
            'no fully lit frame before the power animation',
            start && !sequence.frames.some((frame) => frame.time < start && frame.visible && !frame.power)
        );
        check(
            'power completes and curvature starts',
            await page.evaluate(
                () =>
                    !document.documentElement.dataset.crtStartup &&
                    getComputedStyle(document.querySelector('#crt-viewport')).visibility === 'visible'
            )
        );
        await page.reload({ waitUntil: 'load' });
        await page.waitForFunction(() => window.crtDiagnostics?.mode === 'curved');
        check(
            'reload never arms the guard or repeats power',
            await page.evaluate(
                () =>
                    !document.querySelector('.power-on') &&
                    !powerProbe.starts.length &&
                    powerProbe.frames.every((frame) => !frame.pending)
            )
        );
        await page.close();

        page = await pageFor(browser, { colorScheme: 'light' });
        const releaseLight = await holdModules(page);
        check(
            'light theme starts with a dark hidden screen',
            await page.evaluate(
                () =>
                    getComputedStyle(document.querySelector('#monitor-glass')).backgroundColor ===
                        'rgb(12, 13, 15)' &&
                    getComputedStyle(document.querySelector('#crt-viewport')).visibility === 'hidden'
            )
        );
        releaseLight();
        await page.waitForFunction(() => document.querySelector('.power-on'));
        check(
            'light power animation retains a dark backdrop',
            await page.evaluate(
                () =>
                    getComputedStyle(document.querySelector('#monitor-glass')).backgroundColor ===
                    'rgb(12, 13, 15)'
            )
        );
        await page.waitForFunction(
            () => window.crtDiagnostics?.mode === 'curved' && !document.querySelector('.power-on')
        );
        check(
            'light theme restores after power completes',
            await page.evaluate(
                () =>
                    getComputedStyle(document.querySelector('#monitor-glass')).backgroundColor ===
                    'rgb(246, 248, 246)'
            )
        );
        await page.close();

        page = await pageFor(browser);
        const releaseLate = await holdModules(page);
        await page.waitForFunction(() => !document.documentElement.dataset.crtStartup);
        check(
            'slow modules fail open without an animation',
            await page.evaluate(
                () =>
                    getComputedStyle(document.querySelector('#crt-viewport')).visibility === 'visible' &&
                    !document.querySelector('.power-on') &&
                    !powerProbe.starts.length
            )
        );
        releaseLate();
        await page.waitForFunction(() => window.crtDiagnostics?.mode === 'curved');
        check(
            'late modules do not hide the screen and replay power',
            await page.evaluate(
                () =>
                    !document.querySelector('.power-on') &&
                    !powerProbe.starts.length &&
                    getComputedStyle(document.querySelector('#crt-viewport')).visibility === 'visible'
            )
        );
        await page.close();

        for (const kind of ['reduced-motion', 'blocked-storage', 'module-failure', 'web1']) {
            page = await pageFor(browser, kind === 'reduced-motion' ? { reducedMotion: 'reduce' } : {});
            if (kind === 'blocked-storage')
                await page.addInitScript(() => {
                    Storage.prototype.getItem = Storage.prototype.setItem = () => {
                        throw new Error('blocked');
                    };
                });
            if (kind === 'module-failure') await page.route('**/js/**', (route) => route.abort());
            await page.goto(url + (kind === 'web1' ? '&crt-mode=web1' : ''), { waitUntil: 'load' });
            check(
                `${kind} leaves content visible and no power animation`,
                await page.evaluate(
                    () =>
                        !document.documentElement.dataset.crtStartup &&
                        !document.querySelector('.power-on') &&
                        !powerProbe.starts.length &&
                        getComputedStyle(document.querySelector('#crt-viewport')).visibility === 'visible'
                )
            );
            await page.close();
        }
    } finally {
        await browser.close();
        fs.writeFileSync('/tmp/jujin-crt-results/startup.json', JSON.stringify(results, null, 2) + '\n');
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
