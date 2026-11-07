// Run against the local static server; see docs/crt-verification.md.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.CRT_PLAYWRIGHT || 'playwright');
const dir = '/tmp/jujin-crt-results';
fs.mkdirSync(dir, { recursive: true });
const results = { browser: null, flags: ['--no-sandbox'], checks: [], performance: [] };
const url = (process.env.CRT_BASE_URL || 'http://127.0.0.1:8000/') + '?crt-preview=1';
function check(name, value, detail) {
    results.checks.push({ name, pass: !!value, detail });
    console.log(value ? 'PASS' : 'FAIL', name, detail || '');
    assert.ok(value, name);
}
async function pageFor(b, opts = {}, mode = 'curved') {
    const p = await b.newPage({
        viewport: { width: 1440, height: 1000 },
        colorScheme: 'dark',
        reducedMotion: 'reduce',
        ...opts
    });
    await p.route(/^https:/, (r) => r.abort());
    p.errors = [];
    p.on('pageerror', (e) => p.errors.push(e.message));
    await p.goto(url + (mode === 'curved' ? '' : '&crt-mode=' + mode), { waitUntil: 'domcontentloaded' });
    await p.waitForFunction((m) => window.crtDiagnostics?.mode === m, mode, { timeout: 5000 });
    await p.waitForFunction(() => {
        const image = document.querySelector('.original-profile img');
        return image?.complete && image.naturalWidth > 0;
    });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(120);
    return p;
}
async function visualPoint(p, selector, edge = 0.5) {
    return p.evaluate(
        ({ selector, edge }) => {
            const el = document.querySelector(selector),
                c = document.querySelector('#crt-canvas');
            if (!c) {
                const r = el.getBoundingClientRect();
                return { x: r.x + r.width * edge, y: r.y + r.height / 2 };
            }
            let x = 0,
                y = 0;
            for (let n = el; n && n.id !== 'crt-viewport' && n !== c; n = n.offsetParent) {
                x += n.offsetLeft;
                y += n.offsetTop;
            }
            for (let n = el.parentElement; n && n.id !== 'crt-viewport'; n = n.parentElement) {
                x -= n.scrollLeft;
                y -= n.scrollTop;
            }
            const a = crtDiagnostics.toScreen(x + el.offsetWidth * edge, y + el.offsetHeight / 2),
                r = c.getBoundingClientRect();
            return { x: r.x + a[0], y: r.y + a[1] };
        },
        { selector, edge }
    );
}
(async () => {
    const b = await chromium.launch({ executablePath: process.env.CRT_CHROME_BIN, args: ['--no-sandbox'] });
    results.browser = b.version();
    try {
        for (const mode of ['curved', 'flat', 'web1'])
            for (const [width, height] of [
                [360, 800],
                [390, 844],
                [768, 1024],
                [1366, 768],
                [1440, 1000],
                [1920, 1080]
            ])
                for (const colorScheme of ['light', 'dark']) {
                    const p = await pageFor(b, { viewport: { width, height }, colorScheme }, mode);
                    const state = await p.evaluate(() => ({
                        overflow: document.documentElement.scrollWidth > innerWidth,
                        count: document.querySelectorAll('.menu-item').length,
                        sections: document.querySelectorAll('.content-section').length,
                        doms: document.querySelectorAll('#crt-viewport').length,
                        room: getComputedStyle(document.body).backgroundImage,
                        screen: [
                            document.querySelector('#monitor-glass').clientWidth,
                            document.querySelector('#monitor-glass').clientHeight
                        ],
                        canvas: !!document.querySelector('#crt-canvas')
                    }));
                    check(
                        `${mode} ${width} ${colorScheme}`,
                        !state.overflow &&
                            state.count === 4 &&
                            state.sections === 4 &&
                            state.doms === 1 &&
                            p.errors.length === 0,
                        state
                    );
                    if (width < 1000 || height < 600 || mode === 'web1')
                        check('no room small/web1', !state.room.includes('crt-room'));
                    if (mode === 'curved') {
                        const pt = await visualPoint(p, '[data-section="technologies"]', 0.95);
                        await p.mouse.click(pt.x, pt.y);
                        check(
                            'right edge menu',
                            (await p
                                .locator('[data-section="technologies"]')
                                .getAttribute('aria-current')) === 'page'
                        );
                    }
                    await p.screenshot({ path: `${dir}/${mode}-${width}-${colorScheme}.png` });
                    await p.close();
                }
        const p = await pageFor(b);
        await p.locator('[data-section=about]').click();
        await p.waitForTimeout(100);
        await p.evaluate(() => (document.querySelector('#terminal-content').scrollTop = 180));
        await p.locator('#terminal-toggle').click();
        await p.keyboard.type('help');
        await p.keyboard.press('Enter');
        await p.keyboard.press('ArrowUp');
        check('terminal history', (await p.locator('.terminal-input').textContent()) === 'help');
        await p.keyboard.type('123');
        check(
            'terminal digits do not navigate',
            (await p.locator('.menu-item.active').getAttribute('data-section')) === 'about'
        );
        const before = await p.evaluate(() => ({
            section: location.hash,
            scroll: document.querySelector('#terminal-content').scrollTop,
            input: document.querySelector('.terminal-input').textContent,
            focus: document.activeElement.id
        }));
        await p.evaluate(() =>
            document
                .querySelector('#crt-canvas')
                .getContext('webgl2')
                .getExtension('WEBGL_lose_context')
                .loseContext()
        );
        await p.waitForFunction(() => crtDiagnostics.mode === 'flat');
        const after = await p.evaluate(() => ({
            section: location.hash,
            scroll: document.querySelector('#terminal-content').scrollTop,
            input: document.querySelector('.terminal-input').textContent,
            focus: document.activeElement.id
        }));
        check('context loss preserves state', JSON.stringify(before) === JSON.stringify(after), {
            before,
            after
        });
        check(
            'context loss retains CRT',
            await p.evaluate(
                () =>
                    document.body.classList.contains('crt-effects-enabled') &&
                    !!document.querySelector('.crt-noise') &&
                    !document.querySelector('#starfield').hidden &&
                    document.querySelector('#starfield').parentElement.id === 'crt-viewport'
            )
        );
        await p.evaluate(() => crtDiagnostics.submitSample({ fps: 30, p95: 40, slow: true }));
        check('one poor window stays flat', await p.evaluate(() => crtDiagnostics.mode === 'flat'));
        await p.evaluate(() => crtDiagnostics.submitSample({ fps: 30, p95: 40, slow: true }));
        check(
            'two poor windows web1',
            await p.evaluate(
                () =>
                    crtDiagnostics.mode === 'web1' &&
                    !document.querySelector('#crt-canvas') &&
                    !document.querySelector('.crt-noise')
            )
        );
        check('web1 input survives', (await p.locator('.terminal-input').textContent()) === before.input);
        await p.reload({ waitUntil: 'domcontentloaded' });
        await p.waitForTimeout(100);
        check('web1 sticky visit', await p.evaluate(() => crtDiagnostics.mode === 'web1'));
        await p.close();
        const q = await pageFor(b);
        for (const expected of [0.8, 0.6]) {
            await q.evaluate(() => {
                for (let i = 0; i < 2; i++) crtDiagnostics.submitSample({ fps: 30, p95: 40, slow: true });
            });
            check(
                'resolution ' + expected,
                await q.evaluate(
                    (x) => crtDiagnostics.resolution === x && crtDiagnostics.mode === 'curved',
                    expected
                )
            );
            check(
                'animated bitmap resolution ' + expected,
                await q.evaluate((scale) => {
                    const stars = document.querySelector('#starfield');
                    const glass = document.querySelector('#monitor-glass');
                    return stars.width === Math.round(glass.clientWidth * scale) &&
                        stars.height === Math.round(glass.clientHeight * scale);
                }, expected)
            );
        }
        await q.evaluate(() => {
            for (let i = 0; i < 2; i++) crtDiagnostics.submitSample({ fps: 30, p95: 40, slow: true });
        });
        check('minimum resolution web1', await q.evaluate(() => crtDiagnostics.mode === 'web1'));
        await q.close();
        const r = await pageFor(b);
        await r.locator('[data-section=about]').click();
        await r.locator('[data-section=projects]').click();
        await r.goBack();
        check(
            'back restores hash',
            await r.evaluate(
                () =>
                    location.hash === '#about' &&
                    document.querySelector('.menu-item.active').dataset.section === 'about'
            )
        );
        await r.reload();
        check(
            'reload retains section',
            await r.evaluate(() => document.querySelector('.menu-item.active').dataset.section === 'about')
        );
        await r.waitForFunction(() => crtDiagnostics.mode === 'curved');
        check(
            'native find',
            await r.evaluate(() => window.find('Samsung') && getSelection().toString() === 'Samsung')
        );
        await r.evaluate(() => getSelection().removeAllRanges());
        const point = await visualPoint(r, '#about .section-content p', 0.05);
        await r.mouse.move(point.x, point.y);
        await r.mouse.down();
        await r.mouse.move(point.x + 170, point.y, { steps: 16 });
        await r.mouse.up();
        check(
            'inverse mapped selection',
            (await r.evaluate(() => getSelection().toString())).length > 4,
            await r.evaluate(() => getSelection().toString())
        );
        await r.close();
        const h = await pageFor(b);
        await h.locator('[data-section=about]').click();
        await h.locator('#terminal-toggle').click();
        await h.keyboard.type('unfinished');
        await h.evaluate(() => {
            document.querySelector('#terminal-content').scrollTop = 180;
        });
        await h.setViewportSize({ width: 1440, height: 800 });
        await h.waitForTimeout(200);
        check(
            'resize preserves input and focus',
            await h.evaluate(
                () =>
                    document.querySelector('.terminal-input').textContent === 'unfinished' &&
                    document.activeElement.id === 'terminal-toggle' &&
                    location.hash === '#about' &&
                    document.querySelector('#terminal-content').scrollTop === 180
            )
        );
        await h.evaluate(() => {
            Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
            document.dispatchEvent(new Event('visibilitychange'));
        });
        const frozen = await h.evaluate(() => crtDiagnostics.stats.frames);
        await h.waitForTimeout(300);
        check('hidden rendering stops', await h.evaluate((n) => crtDiagnostics.stats.frames === n, frozen));
        await h.evaluate(() => {
            delete document.hidden;
            document.dispatchEvent(new Event('visibilitychange'));
        });
        await h.waitForTimeout(100);
        check('visible rendering resumes', await h.evaluate((n) => crtDiagnostics.stats.frames > n, frozen));
        await h.close();
        const interaction = await pageFor(b);
        await interaction.evaluate(() => {
            document.caretPositionFromPoint = () => {
                throw new Error('injected selection failure');
            };
        });
        const textPoint = await visualPoint(interaction, '#home h2');
        await interaction.mouse.click(textPoint.x, textPoint.y);
        check(
            'interaction failure only removes curve',
            await interaction.evaluate(
                () =>
                    crtDiagnostics.mode === 'flat' &&
                    crtDiagnostics.reason === 'pointer-down' &&
                    document.body.classList.contains('crt-effects-enabled')
            )
        );
        await interaction.close();
    } finally {
        await b.close();
        fs.writeFileSync(dir + '/results.json', JSON.stringify(results, null, 2));
    }
})().catch((e) => {
    console.error(e);
    process.exitCode = 1;
});
