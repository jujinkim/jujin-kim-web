// Smoke test for the entrance, the living room and the terminal presentation.
// Serve the site first:
//   python3 -m http.server 8000 --bind 127.0.0.1
// then run:
//   ALIVE_PLAYWRIGHT=/path/to/playwright node tests/alive-smoke.cjs
// Optional: ALIVE_BASE_URL, ALIVE_EXECUTABLE. Runs in flat display mode, so it
// does not need the HTML-in-Canvas API the curvature tests need.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.ALIVE_PLAYWRIGHT || 'playwright');

const base = process.env.ALIVE_BASE_URL || 'http://127.0.0.1:8000/';
const args = ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
let failures = 0;

async function check(name, run) {
    try {
        await run();
        console.log('PASS', name);
    } catch (error) {
        failures++;
        console.log('FAIL', name, '\n    ', String(error.message).split('\n')[0]);
    }
}

async function open(browser, { path = '?debug=1&quality=off', seen = true, ...options } = {}) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options });
    if (seen) await context.addInitScript(() => sessionStorage.setItem('crt-power-seen', '1'));
    const page = await context.newPage();
    page.errors = [];
    page.on('pageerror', (error) => page.errors.push(error.message));
    await page.route(/^https:/, (route) => route.abort());
    await page.goto(base + path, { waitUntil: 'domcontentloaded' });
    return page;
}

const entrance = (page) => page.evaluate(() => document.documentElement.dataset.entrance ?? null);
const rigTransform = (page) => page.evaluate(() => getComputedStyle(document.getElementById('monitor-rig')).transform);
async function command(page, text) {
    if (!(await page.evaluate(() => document.body.classList.contains('terminal-open')))) await page.keyboard.press('/');
    await page.keyboard.type(text);
    await page.keyboard.press('Enter');
}
const lastOutput = (page) => page.evaluate(() => document.querySelector('.terminal-output').lastElementChild?.textContent ?? '');

(async () => {
    const browser = await chromium.launch({ executablePath: process.env.ALIVE_EXECUTABLE || undefined, args });

    await check('first visit: dark, boot log, dolly, then the monitor is back at rest', async () => {
        const page = await open(browser, { seen: false });
        const seen = new Set();
        const started = Date.now();
        let log = '';
        while (Date.now() - started < 8000) {
            const phase = await entrance(page);
            seen.add(phase);
            if (phase === 'boot') log = await page.textContent('#boot-log');
            if (phase === null && seen.size > 1) break;
            await page.waitForTimeout(60);
        }
        assert.deepEqual([...seen], ['dark', 'boot', 'dolly', null]);
        assert.match(log, /display\s+1440x900/);
        assert.match(log, /swarm\s+seeding generation 0000/);
        assert.equal(await rigTransform(page), 'none');
        assert.equal(await page.evaluate(() => document.getElementById('starfield').width), await page.evaluate(() => document.getElementById('monitor-glass').clientWidth));
        await page.reload();
        await page.waitForTimeout(300);
        assert.equal(await entrance(page), null, 'no replay in the same tab');
        assert.deepEqual(page.errors, []);
        await page.context().close();
    });

    await check('any key skips the entrance', async () => {
        const page = await open(browser, { seen: false });
        await page.waitForFunction(() => 'entranceOwned' in document.documentElement.dataset);
        await page.keyboard.press('Shift');
        assert.equal(await entrance(page), null);
        assert.equal(await rigTransform(page), 'none');
        await page.context().close();
    });

    await check('reduced motion: no entrance, no room animation, sections appear at once', async () => {
        const page = await open(browser, { seen: false, reducedMotion: 'reduce' });
        await page.waitForTimeout(500);
        assert.equal(await entrance(page), null);
        assert.equal(await page.evaluate(() => 'roomLive' in document.body.dataset), false);
        await page.keyboard.press('2');
        assert.equal(await page.evaluate(() => document.querySelectorAll('.is-pending').length), 0);
        assert.equal(await page.textContent('.command-typed'), 'cat about.md');
        await page.context().close();
    });

    await check('a phone-sized screen gets power and boot log but no room and no dolly', async () => {
        const page = await open(browser, { seen: false, viewport: { width: 390, height: 844 } });
        const seen = new Set();
        const started = Date.now();
        while (Date.now() - started < 6000) {
            const phase = await entrance(page);
            seen.add(phase);
            if (phase === null && seen.size > 1) break;
            await page.waitForTimeout(60);
        }
        assert.ok(!seen.has('dolly'));
        assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('room-scene')).display), 'none');
        await page.context().close();
    });

    // The 3D room refuses software GL unless forced, so these runs force it.
    const FORCED = '?debug=1&quality=off&room3d=force';
    const shellTransform = (page) => page.evaluate(() => getComputedStyle(document.getElementById('monitor-shell')).transform);
    const spot = (page, id) => page.evaluate((id) => window.roomDebug.spot(id), id);
    const room3dOn = (page) => page.waitForFunction(() => document.documentElement.dataset.room3d === 'on', null, { timeout: 15000 });

    await check('without a real GPU the CSS room is used', async () => {
        const page = await open(browser);
        await page.waitForFunction(() => !('room3d' in document.documentElement.dataset), null, { timeout: 5000 });
        assert.notEqual(await page.evaluate(() => getComputedStyle(document.getElementById('room-scene')).visibility), 'hidden');
        await page.context().close();
    });

    await check('3D room: the screen is untransformed at rest, also while the pointer moves', async () => {
        const page = await open(browser, { path: FORCED });
        await room3dOn(page);
        assert.equal(await shellTransform(page), 'none');
        assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('room3d')).display), 'block');
        await page.mouse.move(60, 60);
        await page.mouse.move(1300, 800, { steps: 6 });
        await page.waitForTimeout(300);
        assert.equal(await shellTransform(page), 'none');
        assert.equal(await rigTransform(page), 'none');
        assert.deepEqual(page.errors, []);
        await page.context().close();
    });

    await check('3D room: pressing the room steps back, Escape or the monitor returns', async () => {
        const page = await open(browser, { path: FORCED });
        await room3dOn(page);
        // Where the room is pressed decides which side the camera steps back to.
        const views = [];
        for (const x of [6, 1434]) {
            await page.mouse.click(x, 300);
            await page.waitForFunction(() => getComputedStyle(document.getElementById('monitor-shell')).transform.startsWith('matrix3d'), null, { timeout: 8000 });
            assert.ok(await page.evaluate(() => 'roomLook' in document.documentElement.dataset));
            await page.waitForTimeout(1800);
            views.push(await shellTransform(page));
            // Only Escape returns; any other key leaves the view alone.
            await page.keyboard.press('Shift');
            await page.waitForTimeout(200);
            assert.ok(await page.evaluate(() => 'roomLook' in document.documentElement.dataset));
            await page.keyboard.press('Escape');
            await page.waitForFunction(() => !('roomLook' in document.documentElement.dataset), null, { timeout: 15000 });
            assert.equal(await shellTransform(page), 'none');
        }
        assert.notEqual(views[0], views[1]);
        await command(page, 'room');
        await page.waitForFunction(() => 'roomLook' in document.documentElement.dataset);
        // A drag orbits and does not leave the view; nor does pressing bare
        // wall. Pressing the monitor returns.
        await page.waitForTimeout(1600);
        const before = await shellTransform(page);
        await page.mouse.move(700, 450);
        await page.mouse.down();
        await page.mouse.move(400, 380, { steps: 8 });
        await page.mouse.up();
        await page.waitForTimeout(900);
        assert.ok('roomLook' in (await page.evaluate(() => ({ ...document.documentElement.dataset }))));
        assert.notEqual(await shellTransform(page), before);
        await page.mouse.click(720, 12);
        await page.waitForTimeout(400);
        assert.ok(await page.evaluate(() => 'roomLook' in document.documentElement.dataset));
        const monitor = await spot(page, 'monitor');
        await page.mouse.click(monitor.x, monitor.y);
        await page.waitForFunction(() => !('roomLook' in document.documentElement.dataset), null, { timeout: 15000 });
        assert.equal(await shellTransform(page), 'none');
        assert.deepEqual(page.errors, []);
        await page.context().close();
    });

    await check('3D room: the window, the handheld, the phone and the books come up close', async () => {
        const page = await open(browser, { path: FORCED });
        await room3dOn(page);
        const data = () => page.evaluate(() => ({ ...document.documentElement.dataset }));
        const settled = (ms = 1500) => page.waitForTimeout(ms);
        await command(page, 'room');
        await page.waitForFunction(() => 'roomLook' in document.documentElement.dataset);
        await settled(1800);

        // A hand over what can be pressed, the move cursor elsewhere.
        const cursor = () => page.evaluate(() => getComputedStyle(document.body).cursor);
        await page.mouse.move(720, 12);
        await settled(200);
        assert.equal(await cursor(), 'move');
        const shelf = await spot(page, 'books');
        await page.mouse.move(shelf.x, shelf.y);
        await page.waitForFunction(() => document.documentElement.dataset.roomHover === 'books', null, { timeout: 5000 });
        assert.equal(await cursor(), 'pointer');

        // Books: each linked book can be pressed, and the links are listed.
        await page.mouse.click(shelf.x, shelf.y);
        assert.equal((await data()).roomFocus, 'books');
        await settled();
        const book = await spot(page, 'book:0');
        await page.mouse.move(book.x, book.y);
        await page.waitForFunction(() => document.documentElement.dataset.roomHover === 'book', null, { timeout: 5000 });
        assert.equal(await cursor(), 'pointer');
        assert.equal(await page.textContent('#focus-book-label'), 'Blog');
        assert.equal(await page.getAttribute('#focus-books a', 'href'), 'https://blog.jujin.kim');
        assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('focus-books')).cursor), 'default');
        const popup = page.waitForEvent('popup');
        await page.mouse.click(book.x, book.y);
        await (await popup).close();
        assert.equal((await data()).roomFocus, 'books', 'opening a book stays at the shelf');
        // Hovering beside the shelf shows zoom-out; over the shelf itself shows default.
        await page.mouse.move(40, 860);
        await page.waitForFunction(() => 'roomOut' in document.documentElement.dataset, null, { timeout: 5000 });
        assert.equal(await cursor(), 'zoom-out');
        // Escape steps back one level at a time.
        await page.keyboard.press('Escape');
        await settled();
        assert.ok(!('roomFocus' in (await data())) && !('roomOut' in (await data())) && 'roomLook' in (await data()));

        // The drink is pressable too, without an outline or a hand cursor.
        const drink = await spot(page, 'drink');
        await page.mouse.move(drink.x, drink.y);
        await settled(300);
        assert.ok(!('roomHover' in (await data())));
        await page.mouse.click(drink.x, drink.y);
        assert.equal((await data()).roomFocus, 'drink');
        await settled();
        assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('focus-drink')).visibility), 'visible');
        const drinkClose = await spot(page, 'drink');
        await page.mouse.move(drinkClose.x, drinkClose.y);
        await page.waitForFunction(() => !('roomOut' in document.documentElement.dataset), null, { timeout: 5000 });
        assert.equal(await cursor(), 'default');
        await page.mouse.move(40, 860);
        await page.waitForFunction(() => 'roomOut' in document.documentElement.dataset, null, { timeout: 5000 });
        assert.equal(await cursor(), 'zoom-out');
        await page.keyboard.press('Escape');
        await settled();

        // Handheld: a panel on each screen.
        const handheld = await spot(page, 'console');
        await page.mouse.click(handheld.x, handheld.y);
        assert.equal((await data()).roomFocus, 'console');
        await settled();
        for (const id of ['focus-console-top', 'focus-console-bottom']) {
            const panel = await page.evaluate((id) => {
                const el = document.getElementById(id), style = getComputedStyle(el), box = el.getBoundingClientRect();
                return { text: el.textContent, display: style.display, transform: style.transform, inside: box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight };
            }, id);
            assert.equal(panel.text, 'TODO: implement');
            assert.equal(panel.display, 'block');
            assert.ok(panel.transform.startsWith('matrix3d') && panel.inside, id);
        }
        const handheldClose = await spot(page, 'console');
        await page.mouse.move(handheldClose.x, handheldClose.y);
        await page.waitForFunction(() => !('roomOut' in document.documentElement.dataset), null, { timeout: 5000 });
        assert.equal(await cursor(), 'default');
        // Pressing beside it shows zoom-out and steps back to the room.
        await page.mouse.move(40, 860);
        await page.waitForFunction(() => 'roomOut' in document.documentElement.dataset, null, { timeout: 5000 });
        assert.equal(await cursor(), 'zoom-out');
        await page.mouse.click(40, 860);
        await settled();
        assert.ok(!('roomFocus' in (await data())) && !('roomOut' in (await data())) && 'roomLook' in (await data()));
        assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('focus-console-top')).display), 'none');

        // Phone: the home screen is laid on it and its apps are links.
        const phone = await spot(page, 'phone');
        await page.mouse.click(phone.x, phone.y);
        assert.equal((await data()).roomFocus, 'phone');
        await settled();
        const home = await page.evaluate(() => {
            const el = document.getElementById('focus-phone'), style = getComputedStyle(el), box = el.getBoundingClientRect();
            const links = [...el.querySelectorAll('.phone-apps a')];
            const first = links[0].getBoundingClientRect();
            return {
                display: style.display, transform: style.transform, links: links.map((a) => a.href),
                inside: box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight,
                hit: document.elementFromPoint(first.left + first.width / 2, first.top + first.height / 2)?.closest('a')?.href
            };
        });
        assert.equal(home.display, 'block');
        assert.ok(home.transform.startsWith('matrix3d') && home.inside);
        assert.deepEqual(home.links, ['https://www.instagram.com/lbldsk/', 'https://www.threads.com/@lbldsk', 'https://blog.naver.com/ciiwol']);
        assert.equal(home.hit, home.links[0], 'an app can be pressed');
        const phoneClose = await spot(page, 'phone');
        await page.mouse.move(phoneClose.x, phoneClose.y);
        await page.waitForFunction(() => !('roomOut' in document.documentElement.dataset), null, { timeout: 5000 });
        assert.equal(await cursor(), 'default');
        await page.mouse.move(40, 860);
        await page.waitForFunction(() => 'roomOut' in document.documentElement.dataset, null, { timeout: 5000 });
        assert.equal(await cursor(), 'zoom-out');
        await page.keyboard.press('Escape');
        await settled();
        assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('focus-phone')).display), 'none');

        // Window: the swarm fills the view and a press inside it stays there.
        const win = await spot(page, 'window');
        await page.mouse.click(win.x, win.y);
        assert.equal((await data()).roomFocus, 'window');
        await settled();
        await page.mouse.move(720, 400);
        await settled(200);
        assert.equal(await cursor(), 'default');
        await page.mouse.click(720, 400);
        await settled(300);
        assert.equal((await data()).roomFocus, 'window');
        await page.click('#focus-back');
        await settled();
        assert.ok(!('roomFocus' in (await data())) && 'roomLook' in (await data()));
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !('roomLook' in document.documentElement.dataset), null, { timeout: 15000 });
        assert.equal(await shellTransform(page), 'none');
        assert.deepEqual(page.errors, []);
        await page.context().close();
    });

    await check('3D room: the entrance flies in and leaves the screen at rest', async () => {
        const page = await open(browser, { path: FORCED, seen: false });
        const seen = new Set();
        let carried = false;
        const started = Date.now();
        while (Date.now() - started < 25000) {
            const phase = await entrance(page);
            seen.add(phase);
            if (phase && (await shellTransform(page)).startsWith('matrix3d')) carried = true;
            if (phase === null && seen.size > 1) break;
            await page.waitForTimeout(60);
        }
        assert.ok(seen.has('dolly') && seen.has(null));
        assert.ok(carried, 'the shell follows the camera');
        assert.equal(await shellTransform(page), 'none');
        assert.deepEqual(page.errors, []);
        await page.context().close();
    });

    await check('3D room on a phone: the entrance has a room, reading does not', async () => {
        const page = await open(browser, { path: FORCED, seen: false, viewport: { width: 390, height: 844 } });
        const seen = new Set();
        const started = Date.now();
        while (Date.now() - started < 25000) {
            const phase = await entrance(page);
            seen.add(phase);
            if (phase === null && seen.size > 1) break;
            await page.waitForTimeout(60);
        }
        assert.ok(seen.has('dolly'));
        assert.equal(await shellTransform(page), 'none');
        assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('room3d')).display), 'none');
        await page.context().close();
    });

    await check('a generation moves the rack meter and blinks a drive', async () => {
        const page = await open(browser);
        await page.waitForFunction(() => window.swarmDebug?.stats().frames > 5);
        const before = await page.evaluate(() => [...document.querySelectorAll('.rack-meter i')].map((bar) => bar.style.getPropertyValue('--level')));
        for (let i = 0; i < 30; i++) await page.mouse.move(500 + Math.cos(i / 4) * 200, 400 + Math.sin(i / 4) * 150);
        await page.evaluate(() => window.swarmDebug.forceGeneration(1));
        const busy = await page.evaluate(() => document.querySelector('.rack-drives i').classList.contains('is-busy'));
        const after = await page.evaluate(() => [...document.querySelectorAll('.rack-meter i')].map((bar) => bar.style.getPropertyValue('--level')));
        assert.ok(busy);
        assert.notDeepEqual(after, before);
        assert.ok((await page.evaluate(() => document.querySelectorAll('.room-skyline b').length)) > 20);
        await page.context().close();
    });

    await check('section change runs as a typed command and prints the section', async () => {
        const page = await open(browser);
        await page.waitForTimeout(900);
        await page.click('[data-section="projects"]');
        assert.notEqual(await page.evaluate(() => getComputedStyle(document.getElementById('projects')).display), 'none');
        assert.ok((await page.evaluate(() => document.querySelectorAll('#projects .is-pending').length)) > 0);
        await page.waitForFunction(() => document.querySelector('.command-typed').textContent === 'ls -l projects/');
        await page.waitForFunction(() => document.querySelectorAll('.is-pending').length === 0, null, { timeout: 3000 });
        await page.keyboard.press('1');
        await page.mouse.wheel(0, 10);
        await page.waitForTimeout(80);
        assert.equal(await page.evaluate(() => document.querySelectorAll('.is-pending').length), 0, 'input finishes printing');
        await page.context().close();
    });

    await check('terminal commands navigate and act on the room and the swarm', async () => {
        const page = await open(browser);
        await page.waitForFunction(() => window.swarmDebug?.stats().frames > 5);
        await command(page, 'cd projects');
        assert.equal(await page.evaluate(() => location.hash), '#projects');
        await command(page, 'cat about.md');
        assert.equal(await page.evaluate(() => location.hash), '#about');
        await command(page, 'cd nowhere');
        assert.match(await lastOutput(page), /no such file/);
        assert.equal(await page.evaluate(() => document.body.dataset.lamp), 'off');
        await command(page, 'lamp on');
        assert.equal(await page.evaluate(() => document.body.dataset.lamp), 'on');
        await command(page, 'sky sunset');
        assert.match(await lastOutput(page), /KST: sunset/);
        await command(page, 'sky now');
        assert.match(await lastOutput(page), /Sunrise \d\d:\d\d, sunset \d\d:\d\d/);
        await command(page, 'pulse');
        assert.match(await lastOutput(page), /Pulse sent/);
        await command(page, 'theme light');
        assert.equal(await page.evaluate(() => document.body.dataset.theme), 'light');
        await command(page, 'help');
        assert.match(await lastOutput(page), /reboot/);
        await page.keyboard.type('LS');
        assert.equal(await page.textContent('.terminal-input'), 'LS', 'shifted characters can be typed');
        await page.keyboard.press('Enter');
        await command(page, 'reboot');
        assert.equal(await entrance(page), 'dark');
        await page.waitForFunction(() => !('entrance' in document.documentElement.dataset), null, { timeout: 8000 });
        assert.equal(await rigTransform(page), 'none');
        assert.deepEqual(page.errors, []);
        await page.context().close();
    });

    await browser.close();
    console.log(failures ? `\n${failures} failed` : '\nall passed');
    process.exit(failures ? 1 : 0);
})();
