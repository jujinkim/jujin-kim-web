// Browser smoke test. Serve the site first:
//   python3 -m http.server 8000 --bind 127.0.0.1
// then run:
//   SWARM_PLAYWRIGHT=/path/to/playwright node tests/swarm-smoke.cjs
// Optional: SWARM_BASE_URL, SWARM_BROWSER (chromium|firefox|webkit), SWARM_EXECUTABLE.
const assert = require('node:assert/strict');
const playwright = require(process.env.SWARM_PLAYWRIGHT || 'playwright');

const base = process.env.SWARM_BASE_URL || 'http://127.0.0.1:8000/';
const browserName = process.env.SWARM_BROWSER || 'chromium';
// Software GL keeps this runnable on machines without a GPU.
const args = browserName === 'chromium' ? ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [];
let failures = 0;

let hasWebGL2 = true;

// Checks marked live need a real WebGL2 context; headless browsers without
// one are reported as skipped rather than failed.
async function check(name, run, live = false) {
    if (live && !hasWebGL2) return console.log('SKIP', name, '(no WebGL2 in this browser)');
    try {
        await run();
        console.log('PASS', name);
    } catch (error) {
        failures++;
        console.log('FAIL', name, '\n    ', String(error.message).split('\n')[0]);
    }
}

async function open(browser, path, options = {}) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...options });
    const page = await context.newPage();
    page.errors = [];
    page.on('pageerror', (error) => page.errors.push(error.message));
    page.on('console', (message) => message.type() === 'error' && page.errors.push(message.text()));
    await page.route(/^https:/, (route) => route.abort());
    await page.goto(base + path, { waitUntil: 'load' });
    return page;
}

const mode = (page) => page.evaluate(() => document.documentElement.dataset.mode);
const stats = (page) => page.evaluate(() => window.swarmDebug.stats());
const live = '?debug=1&quality=off';

(async () => {
    const browser = await playwright[browserName].launch({ executablePath: process.env.SWARM_EXECUTABLE || undefined, args });

    const probe = await open(browser, '?static=1');
    hasWebGL2 = await probe.evaluate(() => !!document.createElement('canvas').getContext('webgl2'));
    await probe.context().close();

    await check('starts dormant, then wakes on pointer movement', async () => {
        const page = await open(browser, live);
        await page.waitForFunction(() => window.swarmDebug?.state === 'dormant');
        assert.equal(await mode(page), 'live');
        assert.equal((await stats(page)).count, 600);
        assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#home .reading')).opacity), '0');
        await page.mouse.move(400, 400);
        await page.mouse.move(520, 430, { steps: 6 });
        await page.waitForFunction(() => window.swarmDebug.state !== 'dormant');
        assert.ok((await stats(page)).count > 600);
        await page.waitForFunction(() => 'revealed' in document.documentElement.dataset, null, { timeout: 9000 });
        await page.waitForFunction(() => window.swarmDebug.state === 'condensed', null, { timeout: 9000 });
        assert.deepEqual(page.errors, []);
        await page.context().close();
    }, true);

    await check('any key wakes it, so keyboard users are never stuck', async () => {
        const page = await open(browser, live);
        await page.waitForFunction(() => window.swarmDebug?.state === 'dormant');
        await page.keyboard.press('Tab');
        await page.waitForFunction(() => window.swarmDebug.state !== 'dormant');
        await page.context().close();
    }, true);

    await check('moving raises energy and a held press strikes particles', async () => {
        const page = await open(browser, live + '&enter=0');
        await page.waitForFunction(() => window.swarmDebug?.stats().frames > 5);
        for (let i = 0; i < 40; i++) {
            await page.mouse.move(700 + Math.cos(i / 6) * 250, 400 + Math.sin(i / 6) * 200);
            await page.waitForTimeout(16);
        }
        assert.ok((await stats(page)).energy > 50);
        await page.waitForTimeout(1500);
        await page.mouse.down();
        await page.waitForTimeout(700);
        await page.mouse.up();
        await page.waitForFunction(() => window.swarmDebug.stats().caught > 0, null, { timeout: 5000 });
        assert.deepEqual(page.errors, []);
        await page.context().close();
    }, true);

    await check('generations advance, persist, and resume after reload', async () => {
        const page = await open(browser, live + '&enter=0');
        await page.waitForFunction(() => window.swarmDebug?.stats().frames > 5);
        await page.evaluate(() => window.swarmDebug.forceGeneration(5));
        assert.equal((await stats(page)).gen, 5);
        assert.equal(await page.textContent('#readout .gen-value'), '0005');
        const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('swarm.v1')));
        assert.equal(saved.gen, 5);
        assert.equal(saved.genomes.length, 24);
        await page.reload({ waitUntil: 'load' });
        await page.waitForFunction(() => window.swarmDebug?.stats().frames > 2);
        assert.equal((await stats(page)).gen, 5);
        assert.equal(await page.textContent('#readout .gen-value'), '0005');
        await page.evaluate(() => window.swarmDebug.resetLineage());
        assert.equal((await stats(page)).gen, 0);
        await page.context().close();
    }, true);

    await check('hash and keyboard navigation switch sections', async () => {
        const page = await open(browser, live + '#lab');
        await page.waitForFunction(() => window.swarmDebug?.stats().frames > 2);
        assert.equal(await page.getAttribute('#nav [aria-current]', 'data-section'), 'lab');
        assert.equal(await page.isVisible('#lab .reading'), true);
        assert.equal(await page.isVisible('#home .reading'), false);
        await page.keyboard.press('Digit2');
        assert.equal(await page.getAttribute('#nav [aria-current]', 'data-section'), 'work');
        assert.ok(page.url().endsWith('#work'));
        await page.keyboard.press('ArrowRight');
        assert.equal(await page.getAttribute('#nav [aria-current]', 'data-section'), 'projects');
        await page.goBack();
        assert.equal(await page.getAttribute('#nav [aria-current]', 'data-section'), 'work');
        await page.keyboard.press('Escape');
        assert.equal(await page.getAttribute('#nav [aria-current]', 'data-section'), 'home');
        await page.goto(base + live + '#technologies');
        await page.waitForFunction(() => window.swarmDebug?.stats().frames > 2);
        assert.equal(await page.getAttribute('#nav [aria-current]', 'data-section'), 'about');
        assert.deepEqual(page.errors, []);
        await page.context().close();
    }, true);

    await check('reduced motion gets a still frame with everything readable', async () => {
        const page = await open(browser, '?debug=1', { reducedMotion: 'reduce' });
        await page.waitForFunction(() => document.documentElement.dataset.mode === 'static');
        // window.swarmDebug is the canvas element here; the debug world is never installed.
        assert.equal(await page.evaluate(() => typeof window.swarmDebug?.stats), 'undefined');
        assert.equal(await page.isVisible('#home .reading'), true);
        assert.equal(await page.isVisible('#still'), true);
        assert.notEqual(await page.evaluate(() => getComputedStyle(document.querySelector('#home .heading')).color), 'rgba(0, 0, 0, 0)');
        await page.click('#nav [data-section="projects"]');
        assert.equal(await page.isVisible('#projects .reading'), true);
        assert.deepEqual(page.errors, []);
        await page.context().close();
    });

    await check('without WebGL2 the page falls back to static', async () => {
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        await context.addInitScript(() => {
            const original = HTMLCanvasElement.prototype.getContext;
            HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
                return type === 'webgl2' ? null : original.call(this, type, ...rest);
            };
        });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(base, { waitUntil: 'load' });
        await page.waitForFunction(() => document.documentElement.dataset.mode === 'static');
        assert.equal(await page.isVisible('#home .reading'), true);
        assert.deepEqual(errors, []);
        await context.close();
    });

    await check('a lost WebGL context falls back to static', async () => {
        const page = await open(browser, live + '&enter=0');
        await page.waitForFunction(() => window.swarmDebug?.stats().frames > 5);
        await page.evaluate(() => window.swarmDebug.renderer.loseContext());
        await page.waitForFunction(() => document.documentElement.dataset.mode === 'static');
        assert.equal(await page.isVisible('#home .reading'), true);
        await page.context().close();
    }, true);

    await check('with scripts disabled every section is readable', async () => {
        const page = await open(browser, '', { javaScriptEnabled: false });
        for (const id of ['home', 'work', 'projects', 'lab', 'about']) assert.equal(await page.isVisible(`#${id} .reading`), true, id);
        await page.context().close();
    });

    await check('a phone-sized touch viewport runs with fewer particles', async () => {
        const page = await open(browser, live + '&enter=0', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: browserName !== 'firefox' });
        await page.waitForFunction(() => window.swarmDebug?.stats().frames > 5);
        const s = await stats(page);
        if (await page.evaluate(() => matchMedia('(pointer: coarse)').matches)) assert.ok(s.count <= 7000, `count ${s.count}`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
        assert.deepEqual(page.errors, []);
        await page.context().close();
    }, true);

    await browser.close();
    console.log(failures ? `\n${failures} failed` : '\nall passed');
    process.exit(failures ? 1 : 0);
})();
