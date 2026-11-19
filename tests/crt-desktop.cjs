// Local framebuffer correctness and paired input-to-correct-pixel measurements.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.CRT_PLAYWRIGHT || 'playwright');
const base = process.env.CRT_BASE_URL || 'http://127.0.0.1:8000/';
const dir = '/tmp/jujin-crt-results';
const source = fs.readFileSync('js/modules/screen-curvature.js', 'utf8');
const benchmark = process.env.CRT_DESKTOP_BENCH === '1';
const colors = [[237, 49, 73], [23, 209, 127], [67, 103, 241]];
const text = 'Rendered row 0000: CRT selection follows pointer.';
const results = { checks: [], trials: [] };
function check(name, pass, detail) {
    results.checks.push({ name, pass: !!pass, detail });
    assert.ok(pass, `${name}: ${JSON.stringify(detail)}`);
    console.log('PASS', name);
}
function chunked(code) {
    const needle = 'for (const [from, to] of ranges) {';
    assert.ok(code.includes(needle), 'content upload loop exists');
    return code.replace(needle, `const bands = ranges.flatMap(([start, end]) => {
                const result = [], step = Math.max(1, Math.floor(64 * scale));
                for (let from = start; from < end; from += step)
                    result.push([from, Math.min(end, from + step)]);
                return result;
            });
            for (const [from, to] of bands) {`);
}
function installProbe() {
    const probe = window.desktopProbe = { paints: 0, samples: [], frames: [], renders: [], copies: [], armed: null };
    const upload = WebGL2RenderingContext.prototype.texElementSubImage2D;
    WebGL2RenderingContext.prototype.texElementSubImage2D = function (...args) {
        const start = performance.now();
        try { return upload.apply(this, args); }
        finally { probe.copyTime = (probe.copyTime || 0) + performance.now() - start; }
    };
    const listen = HTMLCanvasElement.prototype.addEventListener;
    HTMLCanvasElement.prototype.addEventListener = function (type, listener, options) {
        if (this.id !== 'crt-canvas' || type !== 'paint') return listen.call(this, type, listener, options);
        return listen.call(this, type, function (event) {
            probe.copyTime = 0;
            const start = performance.now();
            listener.call(this, event);
            probe.renders.push(performance.now() - start);
            probe.copies.push(probe.copyTime);
            probe.paints++;
            if (probe.armed?.started === undefined) return;
            const pending = probe.armed;
            const gl = this.getContext('webgl2');
            const point = crtDiagnostics.toScreen(pending.x, pending.y);
            const pixel = new Uint8Array(4);
            gl.readPixels(Math.floor(point[0] * this.width / this.clientWidth),
                this.height - 1 - Math.floor(point[1] * this.height / this.clientHeight),
                1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
            let correct = pending.color.every((v, i) => Math.abs(pixel[i] - v) <= 2);
            if (pending.outside) {
                const outside = crtDiagnostics.toScreen(pending.outside.x, pending.outside.y);
                const next = new Uint8Array(4);
                gl.readPixels(Math.floor(outside[0] * this.width / this.clientWidth),
                    this.height - 1 - Math.floor(outside[1] * this.height / this.clientHeight),
                    1, 1, gl.RGBA, gl.UNSIGNED_BYTE, next);
                correct &&= !pending.color.every((v, i) => Math.abs(next[i] - v) <= 2);
            }
            const selected = getSelection().toString();
            probe.lastPixel = { pixel: [...pixel], selected, pending };
            if (correct && (pending.kind !== 'pointermove' || selected === pending.text)) {
                probe.samples.push({ kind: pending.kind, latency: performance.now() - pending.started,
                    pixel: [...pixel], selected, render: probe.renders.at(-1), copy: probe.copyTime });
                probe.armed = null;
            }
        }, options);
    };
    for (const type of ['wheel', 'pointermove']) {
        window.addEventListener(type, (event) => {
            if (probe.armed?.kind === type && probe.armed.started === undefined)
                probe.armed.started = event.timeStamp;
        }, { capture: true, passive: true });
    }
    function tick(now) {
        if (probe.last !== undefined) probe.frames.push(now - probe.last);
        probe.last = now;
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}
async function fixture(browser, dpr, variant = 'baseline', viewport = { width: 1440, height: 1000 }) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: dpr, colorScheme: 'dark',
        reducedMotion: benchmark ? 'no-preference' : 'reduce' });
    page.errors = [];
    page.on('pageerror', (error) => page.errors.push(error.message));
    await page.route(/^https:/, (route) => route.abort());
    if (benchmark) {
        // Hold both variants at resolution 1; verify production degradation separately.
        const monitor = fs.readFileSync('js/modules/display-performance.js', 'utf8');
        assert.ok(monitor.includes('onSlow();'));
        await page.route('**/display-performance.js?*', (route) => route.fulfill({
            contentType: 'text/javascript', body: monitor.replace('onSlow();', 'void 0;')
        }));
    }
    await page.route('**/screen-curvature.js?*', (route) =>
        route.fulfill({ contentType: 'text/javascript', body: variant === 'chunk64' ? chunked(source) : source }));
    await page.addInitScript(installProbe);
    await page.goto(base + '?crt-preview=1#projects');
    const desktop = viewport.width >= 1000 && viewport.height >= 600;
    await page.waitForFunction(mode => window.crtDiagnostics?.mode === mode, desktop ? 'curved' : 'flat');
    await page.evaluate(() => document.fonts.ready);
    if (!desktop) return page;
    await page.evaluate(({ colors, text }) => {
        const style = document.createElement('style');
        style.textContent = '#terminal-content ::selection {background:rgb(255,230,0);color:rgb(255,230,0)}';
        document.head.append(style);
        const body = document.querySelector('.content-border');
        body.style.cssText = 'display:block;padding:0;border:0;min-height:0';
        body.replaceChildren(...Array.from({ length: 256 }, (_, row) => {
            const element = document.createElement('div');
            element.dataset.row = row;
            element.style.cssText = `position:relative;height:64px;padding:16px 24px;color:#fff;font:14px/32px JetBrainsMono,monospace;white-space:pre;background:rgb(${colors[row % 3]})`;
            const span = document.createElement('span');
            span.style.cssText = 'display:inline-block;line-height:32px;letter-spacing:0;word-spacing:0';
            span.textContent = text;
            element.append(span);
            return element;
        }));
        window.desktopPoint = (element, dx, dy) => {
            let x = dx, y = dy;
            for (let n = element; n && n.id !== 'crt-viewport'; n = n.offsetParent) {
                x += n.offsetLeft; y += n.offsetTop;
            }
            for (let n = element.parentElement; n && n.id !== 'crt-viewport'; n = n.parentElement) {
                x -= n.scrollLeft; y -= n.scrollTop;
            }
            const c = document.querySelector('#crt-canvas'), r = c.getBoundingClientRect();
            const screen = crtDiagnostics.toScreen(x, y);
            return { x, y, clientX: r.x + screen[0], clientY: r.y + screen[1] };
        };
        // Registered after the renderer's capture handler. Record its native Range,
        // then require both sides of the new selection endpoint in the framebuffer.
        window.addEventListener('pointermove', () => {
            const pending = desktopProbe.armed;
            if (pending?.kind !== 'pointermove') return;
            const selection = getSelection(), span = document.querySelector('[data-row="1"] span');
            const cw = span.offsetWidth / span.textContent.length, end = selection.focusOffset;
            Object.assign(pending, desktopPoint(span, cw * (end - .5), span.offsetHeight / 2));
            pending.outside = desktopPoint(span, cw * (end + .5), span.offsetHeight / 2);
            pending.text = selection.toString();
        }, { capture: true });
    }, { colors, text });
    await page.waitForTimeout(350);
    return page;
}
async function pixels(page) {
    return page.evaluate((colors) => {
        const c = document.querySelector('#crt-canvas'), gl = c.getContext('webgl2');
        const main = document.querySelector('#terminal-content');
        let tested = 0, failures = [];
        // Run synchronously after a requested paint: the drawing buffer is transient.
        return new Promise((resolve) => {
            c.addEventListener('paint', () => {
                for (let row = Math.ceil(main.scrollTop / 64); row < 256; row++) {
                    const element = document.querySelector(`[data-row="${row}"]`);
                    const point = desktopPoint(element, element.offsetWidth * .85, 32);
                    if (row * 64 + 64 > main.scrollTop + main.clientHeight) break;
                    const xy = crtDiagnostics.toScreen(point.x, point.y), pixel = new Uint8Array(4);
                    gl.readPixels(Math.floor(xy[0] * c.width / c.clientWidth),
                        c.height - 1 - Math.floor(xy[1] * c.height / c.clientHeight),
                        1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
                    tested++;
                    if (!colors[row % 3].every((v, i) => Math.abs(pixel[i] - v) <= 2))
                        failures.push({ row, pixel: [...pixel] });
                }
                resolve({ tested, failures });
            }, { once: true });
            c.requestPaint();
        });
    }, colors);
}
async function wheel(page, delta, sample = false) {
    const point = await page.evaluate(({ delta, colors, sample }) => {
        const main = document.querySelector('#terminal-content');
        const top = Math.max(0, Math.min(main.scrollHeight - main.clientHeight, main.scrollTop + delta));
        const row = Math.floor((top + main.clientHeight / 2) / 64);
        const element = document.querySelector(`[data-row="${row}"]`);
        const point = desktopPoint(element, element.offsetWidth * .85, 32);
        if (sample) desktopProbe.armed = { kind: 'wheel', x: point.x, y: point.y - (top - main.scrollTop), color: colors[row % 3] };
        return { x: point.clientX, y: desktopPoint(main, main.clientWidth / 2, main.clientHeight / 2).clientY,
            top, dpr: devicePixelRatio, samples: desktopProbe.samples.length };
    }, { delta, colors, sample });
    await page.mouse.move(point.x, point.y);
    // This prepared Chrome 157 CDP build divides wheel deltas by emulated DPR.
    await page.mouse.wheel(0, delta * point.dpr);
    try { await page.waitForFunction((top) => Math.abs(document.querySelector('#terminal-content').scrollTop - top) <= 1 / devicePixelRatio, point.top, { timeout: 4000 }); }
    catch (error) { throw new Error(`${error.message}: ${JSON.stringify({ expected: point.top, state: await page.evaluate(() => ({ top: document.querySelector('#terminal-content').scrollTop, mode: crtDiagnostics.mode, reason: crtDiagnostics.reason, last: desktopProbe.lastPixel, pending: desktopProbe.armed })) })}`); }
    if (sample) {
        try { await page.waitForFunction((n) => desktopProbe.samples.length > n, point.samples, { timeout: 4000 }); }
        catch (error) { throw new Error(`${error.message}: ${JSON.stringify(await page.evaluate(() => desktopProbe.lastPixel))}`); }
    }
}
async function drag(page, count, sample = false) {
    await page.evaluate(() => { document.querySelector('#terminal-content').scrollTop = 0; getSelection().removeAllRanges(); });
    await page.waitForTimeout(100);
    const start = await page.evaluate(() => {
        const span = document.querySelector('[data-row="1"] span');
        return desktopPoint(span, span.offsetWidth / span.textContent.length * .1, span.offsetHeight / 2);
    });
    await page.mouse.move(start.clientX, start.clientY);
    await page.mouse.down();
    for (let i = 0; i < count; i++) {
        const end = 16 + (i % 28);
        const point = await page.evaluate(({ end, sample }) => {
            const span = document.querySelector('[data-row="1"] span'), cw = span.offsetWidth / span.textContent.length;
            const point = desktopPoint(span, cw * (end + .1), span.offsetHeight / 2);
            const blank = desktopPoint(span, cw * 8.5, span.offsetHeight / 2);
            if (sample) desktopProbe.armed = { kind: 'pointermove', x: blank.x, y: blank.y,
                color: [255, 230, 0], text: span.textContent.slice(0, end) };
            return { ...point, samples: desktopProbe.samples.length };
        }, { end, sample });
        await page.mouse.move(point.clientX, point.clientY);
        if (sample) {
            try { await page.waitForFunction((n) => desktopProbe.samples.length > n, point.samples, { timeout: 4000 }); }
            catch (error) { throw new Error(`${error.message}: ${JSON.stringify(await page.evaluate(() => {
                const span = document.querySelector('[data-row="1"] span'), r = document.createRange();
                r.setStart(span.firstChild, 0); r.setEnd(span.firstChild, 20);
                return { ...desktopProbe.lastPixel, focus: getSelection().focusOffset,
                    width: span.offsetWidth, css: getComputedStyle(span).cssText,
                    font: getComputedStyle(span).font, spacing: getComputedStyle(span).letterSpacing,
                    rect: span.getBoundingClientRect().toJSON(), textRect: r.getBoundingClientRect().toJSON() };
            }))}`); }
        }
    }
    await page.mouse.up();
    return page.evaluate(() => getSelection().toString());
}
async function clicks(page) {
    const targets = [];
    for (const section of ['about', 'technologies', 'home']) {
        const point = await page.evaluate((section) => {
            const el = document.querySelector(`[data-section="${section}"]`);
            return desktopPoint(el, el.offsetWidth / 2, el.offsetHeight / 2);
        }, section);
        await page.mouse.click(point.clientX, point.clientY);
        targets.push(await page.locator('.menu-item.active').getAttribute('data-section'));
    }
    return targets;
}
function summary(values) {
    const sorted = [...values].sort((a, b) => a - b);
    return { count: sorted.length, median: sorted[Math.floor(sorted.length / 2)], p95: sorted[Math.ceil(sorted.length * .95) - 1] };
}
function acceptance(trials) {
    const comparisons = [];
    for (const dpr of [1, 1.25, 2]) for (const kind of ['wheel', 'drag']) {
        const baseline = trials.filter((t) => t.dpr === dpr && t.variant === 'baseline');
        const candidate = trials.filter((t) => t.dpr === dpr && t.variant === 'chunk64');
        if (baseline.length !== 3 || candidate.length !== 3) continue;
        const before = summary(baseline.map((t) => t[kind].p95)).median;
        const after = summary(candidate.map((t) => t[kind].p95)).median;
        comparisons.push({ dpr, kind, before, after, reduction: 1 - after / before });
    }
    const complete = trials.length === 18 && comparisons.length === 6;
    const latencyPass = complete && comparisons.every((c) => c.reduction >= .2);
    const framePass = complete && trials.filter((t) => t.variant === 'chunk64').every((t) => t.passesFrameGate);
    return { complete, comparisons, latencyPass, framePass, adopted: latencyPass && framePass };
}
(async () => {
    fs.mkdirSync(dir, { recursive: true });
    const { screenToSource, sourceToScreen } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
    let edgeError = 0, roundTripError = 0;
    for (const [w, h] of [[320, 480], [1000, 750], [3840, 2160]])
        for (const k of [.025, .04])
            for (let ix = 0; ix <= 100; ix++)
                for (let iy = 0; iy <= 100; iy++) {
                    const x = w * ix / 100, y = h * iy / 100;
                    const a = screenToSource(x, y, w, h, k), b = sourceToScreen(...a, w, h, k);
                    roundTripError = Math.max(roundTripError, Math.hypot(x - b[0], y - b[1]));
                    if (ix === 0 || ix === 100 || iy === 0 || iy === 100)
                        edgeError = Math.max(edgeError, Math.hypot(x - a[0], y - a[1]));
                }
    check('four fixed edges and corners', edgeError < 1e-9, { edgeError });
    check('coordinate round trip <= 0.25 CSS px', roundTripError <= .25, { roundTripError });
    const browser = await chromium.launch({ executablePath: process.env.CRT_CHROME_BIN, args: ['--no-sandbox'] });
    results.browser = browser.version();
    results.environment = 'Linux headless Chromium; emulated DPR; no experimental flags';
    try {
        for (const dpr of [1, 1.25, 2]) {
            if (!benchmark) {
                const page = await fixture(browser, dpr);
                check(`DPR ${dpr}: rectangular aperture`, await page.locator('#monitor-glass').evaluate((e) => getComputedStyle(e).borderRadius === '0px'));
                for (const top of [0, 384, 512, 640, 1760, 12000, 12128, 0]) {
                    await page.locator('#terminal-content').evaluate((e, top) => e.scrollTop = top, top);
                    const detail = await pixels(page);
                    check(`DPR ${dpr}: pixels at scroll ${top}`, detail.tested > 0 && !detail.failures.length, detail);
                }
                await wheel(page, 333, true);
                await wheel(page, -333, true);
                check(`DPR ${dpr}: trusted wheel correct pixels`, (await page.evaluate(() => desktopProbe.samples.length)) === 2);
                const selected = await drag(page, 12, true);
                check(`DPR ${dpr}: mapped drag selection`, selected.includes(text.slice(2, 25)) && Math.abs(selected.length - 27) <= 2, { selected });
                await page.keyboard.press('Control+c');
                await page.evaluate(() => {
                    const area = document.createElement('textarea'); area.id = 'paste-check';
                    document.body.append(area); area.focus();
                });
                await page.keyboard.press('Control+v');
                check(`DPR ${dpr}: native selection copy`, await page.locator('#paste-check').inputValue() === selected);
                const targets = await clicks(page);
                check(`DPR ${dpr}: center and edge clicks`, JSON.stringify(targets) === '["about","technologies","home"]' , targets);
                check(`DPR ${dpr}: curved without script errors`, !page.errors.length && await page.evaluate(() => crtDiagnostics.mode === 'curved'), page.errors);
                await page.screenshot({ path: `${dir}/desktop-dpr-${dpr}.png` });
                await page.close();
                continue;
            }
            for (let repeat = 0; repeat < 3; repeat++) {
                // Alternate order to reduce warmup/order bias. Curvature is identical.
                for (const variant of repeat % 2 ? ['chunk64', 'baseline'] : ['baseline', 'chunk64']) {
                    const page = await fixture(browser, dpr, variant);
                    await page.evaluate(() => {
                        desktopProbe.frames = []; desktopProbe.last = undefined;
                        desktopProbe.renders = []; desktopProbe.copies = [];
                    });
                    for (let i = 0; i < 40; i++) await wheel(page, i < 20 ? 77 : -77, true);
                    await drag(page, 40, true);
                    const raw = await page.evaluate(() => ({
                        samples: desktopProbe.samples, frames: desktopProbe.frames,
                        mode: crtDiagnostics.mode, resolution: crtDiagnostics.resolution,
                        stats: crtDiagnostics.stats, renders: desktopProbe.renders, copies: desktopProbe.copies
                    }));
                    const result = { dpr, repeat: repeat + 1, variant, ...raw,
                        wheel: summary(raw.samples.filter((s) => s.kind === 'wheel').map((s) => s.latency)),
                        drag: summary(raw.samples.filter((s) => s.kind === 'pointermove').map((s) => s.latency)),
                        render: summary(raw.renders), copy: summary(raw.copies), frame: summary(raw.frames),
                        fps: 1000 * raw.frames.length / raw.frames.reduce((a, b) => a + b, 0) };
                    const detail = await pixels(page);
                    result.passesFrameGate = result.fps >= 55 && result.frame.p95 <= 25;
                    check(`${dpr}/${repeat + 1}/${variant}: pixels/mode/cache`, !detail.failures.length &&
                        raw.mode === 'curved' && raw.resolution === 1 && raw.stats.tiles <= 24 && !page.errors.length, detail);
                    results.trials.push(result);
                    console.log(JSON.stringify({ dpr, repeat: repeat + 1, variant, wheel: result.wheel, drag: result.drag,
                        render: result.render, copy: result.copy, fps: result.fps, frame: result.frame }));
                    await page.close();
                }
            }
        }
        if (!benchmark) for (const [width, height] of [[999, 800], [1000, 599], [1000, 600], [390, 844]]) {
            const page = await fixture(browser, 1, 'baseline', { width, height });
            const state = await page.evaluate(() => {
                const canvas = document.querySelector('#crt-canvas');
                if (!canvas) return { rectangular: false, mode: crtDiagnostics.mode,
                    radius: getComputedStyle(document.querySelector('#monitor-glass')).borderRadius };
                const gl = canvas.getContext('webgl2'), program = gl.getParameter(gl.CURRENT_PROGRAM);
                return { rectangular: gl.getUniform(program, gl.getUniformLocation(program, 'rectangular')),
                    bend: gl.getUniform(program, gl.getUniformLocation(program, 'bend')),
                    width: canvas.clientWidth, radius: getComputedStyle(document.querySelector('#monitor-glass')).borderRadius };
            });
            const desktop = width >= 1000 && height >= 600;
            check(`${width}x${height}: desktop breakpoint and small-screen preservation`, !!state.rectangular === desktop &&
                state.radius === (desktop ? '0px' : '6px') &&
                (desktop ? Math.abs(state.bend - (state.width <= 768 ? .025 : .04)) < 1e-6 : state.mode === 'flat'), state);
            await page.close();
        }
    } finally { await browser.close(); }
})().catch((error) => { console.error(error); results.error = String(error); process.exitCode = 1; })
    .finally(() => {
        if (benchmark) results.acceptance = acceptance(results.trials);
        fs.writeFileSync(`${dir}/desktop-${benchmark ? 'input-performance' : 'checks'}.json`, JSON.stringify(results, null, 2));
    });
