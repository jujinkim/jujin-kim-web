// First visit in a tab: a dark room, the monitor powers on, a boot log prints
// real values, then the camera moves in from a wide shot to the reading size.
// Any key, press or wheel skips it.

import { room3d } from './room3d.js?v=20261119.5';

const BOOT_AT = 520;
const LINE_EVERY = 105;
const DOLLY_MS = 1250;
const FLIGHT_MS = 2600; // the 3D camera has a room to cross
const HOLD_AFTER_LOG = 180;

const root = document.documentElement;
let finishCurrent = null;

const pad = (n) => String(n).padStart(2, '0');

function swarmLine() {
    try {
        const saved = JSON.parse(localStorage.getItem('swarm.v1'));
        if (saved && Number.isFinite(saved.gen) && saved.gen > 0)
            return `resuming generation ${String(Math.floor(saved.gen)).padStart(4, '0')}`;
    } catch {}
    return 'seeding generation 0000';
}

function storageLine() {
    try {
        localStorage.setItem('boot.probe', '1');
        localStorage.removeItem('boot.probe');
        return 'localStorage ok';
    } catch {
        return 'unavailable, lineage will not persist';
    }
}

function bootLines() {
    const now = new Date();
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const gl = !!document.createElement('canvas').getContext('webgl2');
    const theme = document.body.dataset.theme || 'dark';
    const dpr = Math.round((window.devicePixelRatio || 1) * 100) / 100;
    return [
        `JK-CRT  ${stamp}`,
        '',
        `display   ${window.innerWidth}x${window.innerHeight} @${dpr}x  ${theme}`,
        `gpu       ${gl ? 'webgl2 ok' : 'webgl2 unavailable, swarm off'}`,
        `input     ${matchMedia('(pointer: coarse)').matches ? 'touch' : 'pointer + keyboard'}`,
        `storage   ${storageLine()}`,
        `swarm     ${swarmLine()}`,
        'mount     /home/jujin  ok',
        '',
        '> ./terminal'
    ];
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function entranceActive() {
    return 'entrance' in root.dataset;
}

export function cancelEntrance() {
    finishCurrent?.();
}

// scene: object from initDesktopScene (or null). dolly: whether the room is
// on screen, so there is a camera to move. onDone fires exactly once.
export function runEntrance({ scene, dolly, onDone }) {
    cancelEntrance();
    const log = document.getElementById('boot-log');
    const timers = [];
    let frame = 0;
    let done = false;

    root.dataset.entranceOwned = '';
    root.dataset.entrance = 'dark';
    root.style.setProperty('--entrance-dark', '1');
    if (log) log.textContent = '';
    const flight = dolly && room3d.ready;
    if (dolly) scene?.setCamera(0);
    if (flight) room3d.setCamera(0);
    room3d.setMood(0, 0, true);

    function finish() {
        if (done) return;
        done = true;
        finishCurrent = null;
        timers.forEach(clearTimeout);
        cancelAnimationFrame(frame);
        for (const type of ['keydown', 'pointerdown', 'wheel']) window.removeEventListener(type, finish, true);
        scene?.setCamera(1);
        room3d.setCamera(1);
        room3d.setMood(1, 1);
        delete root.dataset.entrance;
        delete root.dataset.entranceOwned;
        root.style.removeProperty('--entrance-dark');
        if (log) log.textContent = '';
        window.dispatchEvent(new CustomEvent('entrance-done'));
        onDone?.();
    }
    finishCurrent = finish;
    for (const type of ['keydown', 'pointerdown', 'wheel']) window.addEventListener(type, finish, { capture: true, passive: true });

    const lines = bootLines();
    timers.push(
        setTimeout(() => {
            root.dataset.entrance = 'boot';
            room3d.setMood(1, 0);
        }, BOOT_AT)
    );
    lines.forEach((line, i) =>
        timers.push(setTimeout(() => log && (log.textContent += `${line}\n`), BOOT_AT + i * LINE_EVERY))
    );

    const logEnd = BOOT_AT + lines.length * LINE_EVERY + HOLD_AFTER_LOG;
    timers.push(
        setTimeout(() => {
            if (!dolly) return finish();
            root.dataset.entrance = 'dolly';
            room3d.setMood(1, 1);
            const start = performance.now();
            const duration = flight ? FLIGHT_MS : DOLLY_MS;
            const step = (now) => {
                const t = Math.min(1, (now - start) / duration);
                const p = ease(t);
                scene?.setCamera(p);
                if (flight) room3d.setCamera(p);
                root.style.setProperty('--entrance-dark', (1 - p).toFixed(3));
                if (t >= 1) finish();
                else frame = requestAnimationFrame(step);
            };
            frame = requestAnimationFrame(step);
        }, logEnd)
    );
}
