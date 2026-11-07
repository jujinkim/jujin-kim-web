// Run against the local static server; see docs/crt-verification.md.
const fs = require('fs'),
    assert = require('assert/strict'),
    { chromium, webkit } = require(process.env.CRT_PLAYWRIGHT || 'playwright');
const results = [];
fs.mkdirSync('/tmp/jujin-crt-results', { recursive: true });
function check(name, value, details) {
    results.push({ name, pass: !!value, details });
    console.log(value ? 'PASS' : 'FAIL', name, details || '');
    assert.ok(value, name);
}
async function newPage(b, opts = {}, init) {
    const p = await b.newPage({ viewport: { width: 1440, height: 1000 }, ...opts });
    await p.route(/^https:/, (r) => r.abort());
    if (init) await p.addInitScript(init);
    return p;
}
const url = (process.env.CRT_BASE_URL || 'http://127.0.0.1:8000/') + '?crt-preview=1';
(async () => {
    const b = await chromium.launch({ executablePath: process.env.CRT_CHROME_BIN, args: ['--no-sandbox'] });
    try {
        let p = await newPage(b, {}, () => {
            Object.defineProperty(HTMLCanvasElement.prototype, 'content', {
                get() {
                    return 'fallback';
                },
                configurable: true
            });
        });
        await p.goto(url, { waitUntil: 'domcontentloaded' });
        await p.waitForTimeout(1600);
        check(
            'unsupported API keeps CRT',
            await p.evaluate(
                () =>
                    crtDiagnostics.mode === 'flat' &&
                    crtDiagnostics.reason === 'unsupported-api' &&
                    document.body.classList.contains('crt-effects-enabled')
            )
        );
        await p.close();
        p = await newPage(b, {}, () => {
            Storage.prototype.getItem = function () {
                throw new DOMException('blocked', 'SecurityError');
            };
            Storage.prototype.setItem = function () {
                throw new DOMException('blocked', 'SecurityError');
            };
        });
        await p.goto(url, { waitUntil: 'domcontentloaded' });
        await p.waitForFunction(() => crtDiagnostics.mode === 'curved');
        await p.evaluate(() => setTheme('light'));
        check(
            'blocked storage stays usable',
            await p.evaluate(
                () =>
                    !document.querySelector('.power-on') &&
                    document.body.dataset.theme === 'light' &&
                    document.querySelector('#home').innerText.includes('Jujin')
            )
        );
        await p.close();
        p = await newPage(b, { javaScriptEnabled: false });
        await p.goto(url, { waitUntil: 'domcontentloaded' });
        await p.locator('[data-section=technologies]').click();
        check(
            'no JS content and anchors',
            await p.evaluate(
                () =>
                    document.querySelector('#home').innerText.includes('Jujin') &&
                    document.querySelector('#technologies').innerText.includes('mobile') &&
                    location.hash === '#technologies' &&
                    !document.querySelector('.power-on')
            )
        );
        await p.screenshot({ path: '/tmp/jujin-crt-results/nojs.png' });
        await p.close();
        p = await newPage(b);
        await p.route('**/js/**', (r) => r.abort());
        await p.goto(url, { waitUntil: 'domcontentloaded' });
        check(
            'script network failure visible',
            (await p.locator('#home').isVisible()) &&
                !(await p.locator('#monitor-glass').evaluate((e) => e.classList.contains('power-on')))
        );
        await p.close();
        p = await newPage(b);
        await p.route(/\/img\//, (r) => r.abort());
        await p.goto(url, { waitUntil: 'domcontentloaded' });
        await p.waitForTimeout(1600);
        check(
            'image failures keep text',
            (await p.locator('.profile-meta').isVisible()) &&
                (await p.locator('.original-profile img').getAttribute('alt')) === 'Jujin Kim'
        );
        await p.close();
        p = await newPage(b);
        await p.goto(url, { waitUntil: 'domcontentloaded' });
        const animation = await p.evaluate(() => ({
            power: !!document.querySelector('.power-on'),
            animations: document
                .getAnimations()
                .filter((a) => a.animationName?.startsWith('monitor-'))
                .map((a) => a.effect.getTiming().duration)
        }));
        check(
            'power exact 1000ms',
            animation.power &&
                animation.animations.length === 2 &&
                animation.animations.every((n) => n === 1000),
            animation
        );
        await p.waitForTimeout(1200);
        check('power finished', await p.evaluate(() => !document.querySelector('.power-on')));
        await p.reload({ waitUntil: 'domcontentloaded' });
        check('power once per tab', await p.evaluate(() => !document.querySelector('.power-on')));
        await p.close();
        p = await newPage(b, { reducedMotion: 'reduce' });
        await p.goto(url, { waitUntil: 'domcontentloaded' });
        await p.waitForFunction(() => crtDiagnostics.mode === 'curved');
        check(
            'reduced motion stays curved without startup',
            await p.evaluate(
                () =>
                    !document.querySelector('.power-on') &&
                    document
                        .getAnimations()
                        .every((a) => !['crt-grain', 'crt-sweep'].includes(a.animationName))
            )
        );
        await p.evaluate(() => window.find('Jujin Kim'));
        const selected = await p.evaluate(() => getSelection().toString());
        await p.keyboard.press('Control+c');
        await p.evaluate(() => {
            const target = document.createElement('textarea');
            target.id = 'copy-check';
            target.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0';
            document.body.appendChild(target);
            target.focus();
        });
        await p.keyboard.press('Control+v');
        check(
            'native copy',
            selected.length > 0 && (await p.locator('#copy-check').inputValue()) === selected
        );
        await p.close();
        p = await newPage(b, {
            viewport: { width: 390, height: 844 },
            hasTouch: true,
            reducedMotion: 'reduce'
        });
        await p.goto(url, { waitUntil: 'domcontentloaded' });
        await p.waitForFunction(() => crtDiagnostics.mode === 'curved');
        await p.locator('[data-section=about]').tap();
        const cdp = await p.context().newCDPSession(p);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 650 }] });
        for (let y = 630; y >= 300; y -= 20)
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        check(
            'native touch scroll through curve',
            await p.evaluate(() => document.querySelector('#terminal-content').scrollTop > 200)
        );
        await p.close();
    } finally {
        await b.close();
        fs.writeFileSync('/tmp/jujin-crt-results/failures.json', JSON.stringify(results, null, 2));
    }
    const wk = await webkit.launch({
        headless: true,
        executablePath: process.env.CRT_WEBKIT_BIN,
        env: { ...process.env, WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS: '1', LIBGL_ALWAYS_SOFTWARE: '1' }
    });
    try {
        const p = await newPage(wk, { reducedMotion: 'reduce' });
        p.on('pageerror', (e) => console.log('WEBKIT ERROR', e.message));
        await p.goto(url, { waitUntil: 'domcontentloaded' });
        await p.waitForTimeout(300);
        check(
            'WebKit automatic flat fallback',
            await p.evaluate(
                () => crtDiagnostics.mode === 'flat' && crtDiagnostics.reason === 'unsupported-api'
            )
        );
        await p.locator('[data-section=projects]').click();
        await p.evaluate(() => setTheme('dark'));
        check(
            'WebKit navigation and theme',
            await p.evaluate(
                () =>
                    document.querySelector('.menu-item.active').dataset.section === 'projects' &&
                    document.body.dataset.theme === 'dark'
            )
        );
        await p.screenshot({ path: '/tmp/jujin-crt-results/webkit-flat.png' });
        await p.close();
    } finally {
        await wk.close();
        fs.writeFileSync('/tmp/jujin-crt-results/failures.json', JSON.stringify(results, null, 2));
    }
})().catch((e) => {
    console.error(e);
    process.exitCode = 1;
});
