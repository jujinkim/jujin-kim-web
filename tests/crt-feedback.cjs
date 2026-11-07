// Follow-up layout and continuous-scroll motion checks, including the LAN origin.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.CRT_PLAYWRIGHT || 'playwright');
const base = process.env.CRT_BASE_URL || 'http://127.0.0.1:8000/';
const results = [];
const dir = '/tmp/jujin-crt-results';
fs.mkdirSync(dir, { recursive: true });

(async () => {
    const browser = await chromium.launch({
        executablePath: process.env.CRT_CHROME_BIN,
        args: ['--no-sandbox']
    });
    try {
        for (const mode of ['curved', 'flat']) {
            for (const [width, height] of [
                [360, 800], [390, 844], [768, 1024], [1000, 600], [1366, 768],
                [1440, 1000], [1920, 1080], [1200, 1600], [2560, 1440], [3840, 2160]
            ]) {
                const page = await browser.newPage({
                    viewport: { width, height }, reducedMotion: 'reduce', colorScheme: 'dark'
                });
                await page.route(/^https:/, (r) => r.abort());
                await page.goto(base + '?crt-preview=1' + (mode === 'flat' ? '&crt-mode=flat' : ''));
                await page.waitForFunction((expected) => crtDiagnostics.mode === expected, mode);
                await page.evaluate(() => document.fonts.ready);
                const state = await page.evaluate(() => {
                    const shell = document.querySelector('#monitor-shell');
                    const glass = document.querySelector('#monitor-glass');
                    const nav = document.querySelector('.menu-list');
                    const border = nav.parentElement;
                    const borderStyle = getComputedStyle(border);
                    const padding = parseFloat(borderStyle.paddingLeft);
                    const items = [...nav.children];
                    return {
                        shell: shell.getBoundingClientRect().toJSON(),
                        screen: glass.getBoundingClientRect().toJSON(),
                        bezel: parseFloat(getComputedStyle(shell).paddingTop),
                        stand: Math.max(0, parseFloat(getComputedStyle(document.body).paddingBottom) - parseFloat(getComputedStyle(shell).paddingTop)),
                        navFills: Math.abs(nav.clientWidth - (border.clientWidth - padding - parseFloat(borderStyle.paddingRight))) <= 1,
                        homeLeft: items[0].offsetLeft <= padding + 1,
                        lastRight: Math.abs(items.at(-1).offsetLeft + items.at(-1).offsetWidth - padding - nav.clientWidth) <= 1,
                        rightGaps: items.slice(2).map((item, i) => item.offsetLeft - items[i + 1].offsetLeft - items[i + 1].offsetWidth),
                        overflow: document.documentElement.scrollWidth > innerWidth || nav.scrollWidth > nav.clientWidth,
                        mode: crtDiagnostics.mode,
                        secure: isSecureContext
                    };
                });
                assert.ok(!state.overflow && state.navFills && state.homeLeft && state.lastRight, JSON.stringify(state));
                assert.ok(state.rightGaps.every((gap) => gap >= 1 && gap <= 5), 'Other menus stay grouped on the right');
                if (width >= 1000 && height >= 600) {
                    assert.ok(Math.abs(state.screen.width / state.screen.height - 4 / 3) < 0.001);
                    assert.ok(state.shell.x >= state.bezel - 1 && state.shell.y >= state.bezel - 1);
                    assert.ok(Math.abs(Math.min(state.shell.x, state.shell.y) - state.bezel) <= 1, 'Monitor fills the limiting axis');
                    assert.ok(state.shell.right <= width && state.shell.bottom + state.stand <= height - state.bezel + 1);
                    assert.ok(Math.abs(state.shell.bottom + state.stand - height + state.bezel) <= 1, 'Stand rests at the desk in tall viewports too');
                }
                if (width === 1920) {
                    await page.waitForFunction(() => document.querySelector('.original-profile img')?.complete);
                    await page.screenshot({ path: `${dir}/feedback-${mode}-${width}.png` });
                }
                results.push({ mode, width, height, ...state });
                console.log('PASS layout/menu', mode, width, height, Math.round(state.screen.width));
                await page.close();
            }
            const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' });
            await page.route(/^https:/, (r) => r.abort());
            await page.goto(base + '?crt-preview=1' + (mode === 'flat' ? '&crt-mode=flat' : ''));
            await page.waitForFunction((expected) => crtDiagnostics.mode === expected && !document.querySelector('.power-on'), mode);
            await page.locator('[data-section=about]').click();
            const motion = await page.evaluate(() => new Promise((resolve) => {
                const scroller = document.querySelector('#terminal-content');
                const canvas = document.querySelector('#starfield');
                const before = canvas.toDataURL();
                const sweep = document.querySelector('.crt-sweep').getAnimations()[0];
                const startTime = sweep.currentTime;
                let first;
                function tick(time) {
                    first ??= time;
                    scroller.scrollTop = ((Math.sin((time - first) / 150) + 1) / 2) * (scroller.scrollHeight - scroller.clientHeight);
                    if (time - first < 1200) requestAnimationFrame(tick);
                    else resolve({
                        canvasChanged: canvas.toDataURL() !== before,
                        sweepAdvanced: sweep.currentTime > startTime + 1000,
                        playState: sweep.playState,
                        paused: document.querySelector('#crt-screen').classList.contains('is-scrolling'),
                        mode: crtDiagnostics.mode
                    });
                }
                requestAnimationFrame(tick);
            }));
            assert.ok(motion.canvasChanged && motion.sweepAdvanced && motion.playState === 'running' && !motion.paused && motion.mode === mode, JSON.stringify(motion));
            results.push({ mode, motion });
            console.log('PASS motion during scroll', mode, motion);
            await page.close();
        }
    } finally {
        await browser.close();
        fs.writeFileSync(`${dir}/feedback.json`, JSON.stringify(results, null, 2));
    }
})().catch((error) => { console.error(error); process.exitCode = 1; });
