import { onSwarm, swarmEnergy } from './animations.js?v=20261119.4';

// Ties the room's objects to real signals: the swarm's generations and energy,
// terminal commands, section changes and the visitor's local time. Nothing here
// moves on its own except the curtain.

const TICK_MS = 250;
const REST_LEVELS = [0.35, 0.7, 0.5, 0.7, 0.35, 0.5, 0.9];
const desktop = matchMedia('(min-width: 1000px) and (min-height: 600px)');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

let live = false;
let still = false;
let timer = 0;
let skylineTimer = 0;
let meters = [];
let fans = [];
let drives = [];
let windows = [];
let levels = REST_LEVELS.slice();
let lamp = true;

const body = () => document.body;

function flash(element, className, ms) {
    if (!element || !live) return;
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
    setTimeout(() => element.classList.remove(className), ms);
}

// How many skyline windows are lit depends on the visitor's clock.
function litShare(hour) {
    if (hour >= 20 || hour < 5) return 0.6;
    if (hour >= 17 || hour < 8) return 0.38;
    return 0.1;
}

function buildSkyline() {
    const buildings = document.querySelectorAll('.room-skyline i');
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    buildings.forEach((building) => {
        for (let n = 0; n < 6; n++) {
            const pane = document.createElement('b');
            pane.style.left = `${10 + Math.floor(random() * 4) * 22}%`;
            pane.style.top = `${8 + Math.floor(random() * 7) * 12}%`;
            building.appendChild(pane);
            windows.push(pane);
        }
    });
    const share = litShare(new Date().getHours());
    windows.forEach((pane) => pane.classList.toggle('is-lit', random() < share));
}

// People come home and go to bed: a couple of windows change now and then,
// drifting toward the share the current hour calls for.
function driftSkyline() {
    if (!windows.length) return;
    const share = litShare(new Date().getHours());
    const lit = windows.filter((pane) => pane.classList.contains('is-lit')).length / windows.length;
    const pane = windows[Math.floor(Math.random() * windows.length)];
    pane.classList.toggle('is-lit', lit < share ? true : lit > share + 0.08 ? false : !pane.classList.contains('is-lit'));
}

function showLevels(energy) {
    meters.forEach((bar, i) => {
        const wobble = energy > 0.02 ? (Math.random() - 0.5) * 0.5 * energy : 0;
        bar.style.setProperty('--level', Math.max(0.08, Math.min(1, levels[i] + wobble)).toFixed(3));
    });
}

function tick() {
    // Swarm energy is the light's speed in px/s; a brisk pointer is ~600.
    const energy = Math.min(1, swarmEnergy() / 600);
    showLevels(energy);
    for (const fan of fans) fan.playbackRate = 0.25 + 3 * energy;
}

function run() {
    const active = live && !still && !document.hidden && desktop.matches;
    clearInterval(timer);
    clearInterval(skylineTimer);
    timer = skylineTimer = 0;
    for (const fan of fans) active ? fan.play() : fan.pause();
    if (!active) return;
    timer = setInterval(tick, TICK_MS);
    skylineTimer = setInterval(driftSkyline, 9000);
}

export function setLamp(on) {
    lamp = on === undefined ? !lamp : !!on;
    body().dataset.lamp = lamp ? 'on' : 'off';
    return lamp;
}

// Stops every room animation for good; called when frames run slow.
export function stillRoom() {
    if (still) return;
    still = true;
    body().dataset.roomStill = '';
    run();
}

export function roomPulse() {
    flash(document.querySelector('.room-neon'), 'is-jolted', 420);
    drives.forEach((drive, i) => setTimeout(() => flash(drive, 'is-busy', 500), i * 70));
    flash(document.querySelector('.room-speaker'), 'is-thumping', 360);
}

export function initRoomLife() {
    if (live || reduced.matches || !document.getElementById('room-scene')) return;
    live = true;
    meters = [...document.querySelectorAll('.rack-meter i')];
    drives = [...document.querySelectorAll('.rack-drives i')];
    fans = [...document.querySelectorAll('.rack-fans i')].map((fan, i) =>
        fan.animate([{ transform: 'rotate(0deg)' }, { transform: `rotate(${i ? -360 : 360}deg)` }], {
            duration: 1600,
            iterations: Infinity
        })
    );
    buildSkyline();
    body().dataset.roomLive = '';
    setLamp(true);
    showLevels(0);

    onSwarm('generation', (gen, fitness) => {
        if (fitness) {
            // 24 genomes folded into the rack's 7 bars.
            let top = 0;
            const sums = new Array(meters.length).fill(0);
            for (let g = 0; g < fitness.length; g++) {
                sums[g % meters.length] += fitness[g];
                top = Math.max(top, sums[g % meters.length]);
            }
            levels = sums.map((sum) => (top > 0 ? 0.12 + 0.88 * (sum / top) : 0.4));
        } else levels = REST_LEVELS.slice();
        showLevels(0);
        flash(drives[0], 'is-busy', 500);
        flash(document.querySelector('.power-led'), 'is-beating', 700);
    });
    onSwarm('pulse', () => flash(document.querySelector('.room-speaker'), 'is-thumping', 360));
    window.addEventListener('section-changed', () => {
        flash(document.querySelector('.room-neon'), 'is-jolted', 420);
        flash(drives[2], 'is-busy', 500);
    });
    window.addEventListener('terminal-command', () => flash(drives[1], 'is-busy', 500));

    document.addEventListener('visibilitychange', run);
    desktop.addEventListener('change', run);
    reduced.addEventListener('change', () => reduced.matches && stillRoom());
    run();
}
