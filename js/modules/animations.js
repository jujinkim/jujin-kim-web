import { createWorld } from './world.js?v=20261119.4';
import { createAudio } from './audio.js?v=20261119.4';

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
    world.sim.emitPulse(glass.clientWidth / 2, glass.clientHeight / 2, 0.8);
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
        bounds: () => glass.getBoundingClientRect(),
        onGeneration: (gen, genomes, fitness) => {
            showGeneration(gen);
            audio?.tick(gen);
            emit('generation', gen, fitness);
        },
        onPulse: (charge) => {
            audio?.thump(charge);
            emit('pulse', charge);
        },
        onFrame: () => audio?.enabled && audio.update(world.energy, world.breath),
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
