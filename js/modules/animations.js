import { createWorld } from './world.js?v=20261119.11';
import { createAudio } from './audio.js?v=20261119.11';
import { room3d } from './room3d.js?v=20261119.11';

// The background of the terminal screen: an evolving particle swarm drawn on
// the #starfield canvas. It follows the pointer, evolves by a genetic
// algorithm while the visitor moves, and a still press sends a pulse through it.

let world = null;
let audio = null;
let observer = null;
let enabled = true;
let readout = null;

const listeners = { generation: [], pulse: [] };
const emit = (type, ...args) => listeners[type].forEach((fn) => fn(...args));

// Lets the room react to the swarm: 'generation' (gen, fitness) and 'pulse' (charge).
export function onSwarm(type, fn) {
    listeners[type].push(fn);
}

// Speed of the light the swarm follows, in px/s. 0 when the swarm is off.
export function swarmEnergy() {
    return world && enabled ? world.energy : 0;
}

// A pulse from the middle of the screen, as if the visitor had pressed there.
export function swarmPulse() {
    if (!world || !enabled) return false;
    const glass = document.getElementById('monitor-glass');
    world.pulse(glass.clientWidth / 2, glass.clientHeight / 2, 0.8);
    audio?.thump(0.8);
    emit('pulse', 0.8);
    return true;
}

const formatGen = (gen) => `GEN ${String(gen).padStart(4, '0')}`;

function showGeneration(gen) {
    if (readout) readout.textContent = world && enabled ? formatGen(gen) : '';
}

export function swarmGeneration() {
    return world && enabled ? world.lineage.gen : null;
}

export function resetSwarm() {
    if (!world) return false;
    world.resetLineage();
    return true;
}

export function toggleSwarm() {
    if (!world) return false;
    enabled = !enabled;
    const canvas = document.getElementById('starfield');
    canvas.hidden = !enabled;
    if (enabled) world.start(true);
    else {
        world.stop();
        audio?.disable();
    }
    showGeneration(world.lineage.gen);
    return enabled;
}

// Returns true when sound is on afterwards, null when the swarm is not running.
export function toggleSound() {
    if (!world || !enabled) return null;
    audio ??= createAudio();
    if (audio.enabled) audio.disable();
    else audio.enable();
    return audio.enabled;
}

// With the 3D room on a desktop the swarm is the sky outside the window: its
// canvas leaves the monitor and sits full-viewport behind the room canvas,
// which is transparent where the window shows sky. Otherwise it is the
// screen's background.
let inSky = false;
let skyCheck = 0;
let home = null;

function followSky(canvas) {
    const rect = room3d.skyRect();
    if (!rect !== !inSky) {
        inSky = !!rect;
        if (inSky) {
            home ??= canvas.parentNode;
            document.body.insertBefore(canvas, document.getElementById('room3d'));
        } else home.prepend(canvas);
        canvas.classList.toggle('in-sky', inSky);
        world.setSky(rect);
        world.resize();
        return;
    }
    if (inSky) world.setSky(rect);
}

export function setAnimationResolution(value) {
    world?.renderer.setQuality({ trailScale: Math.max(0.5, Math.min(1, value)) });
}

export function initAnimations() {
    if (world || document.body.dataset.displayMode === 'web1') return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = document.getElementById('starfield');
    const glass = document.getElementById('monitor-glass');
    if (!canvas || !glass) return;
    readout = document.getElementById('swarm-gen');

    const giveUp = () => {
        world?.stop();
        audio?.disable();
        canvas.hidden = true;
        enabled = false;
        showGeneration(0);
    };
    world = createWorld(canvas, {
        bounds: () => (inSky ? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight } : glass.getBoundingClientRect()),
        // In the sky it is drawn in the room's chunky pixels.
        dpr: () => (inSky ? room3d.pixelRatio() : 0),
        onGeneration: (gen, genomes, fitness) => {
            showGeneration(gen);
            audio?.tick(gen);
            emit('generation', gen, fitness);
        },
        onPulse: (charge) => {
            audio?.thump(charge);
            emit('pulse', charge);
        },
        onFrame: () => {
            if (audio?.enabled) audio.update(world.energy, world.breath);
            if (++skyCheck % 12 === 0) followSky(canvas);
        },
        onGiveUp: giveUp,
        onContextLost: giveUp
    });
    if (!world) return;

    observer = new ResizeObserver(() => world?.resize());
    observer.observe(glass);
    // The entrance scales the monitor; a transform never fires the observer.
    window.addEventListener('entrance-done', () => world?.resize());
    document.addEventListener('visibilitychange', onVisibility);
    world.start(true);
    showGeneration(world.lineage.gen);
    if (new URLSearchParams(location.search).get('debug') === '1') window.swarmDebug = world;
}

function onVisibility() {
    if (document.hidden) audio?.suspend();
    else audio?.resume();
}

export function cleanup() {
    world?.stop();
    audio?.disable();
    observer?.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    observer = null;
    enabled = false;
    showGeneration(0);
}
