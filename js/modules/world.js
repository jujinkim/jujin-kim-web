import { TUNING as T, COUNT_LADDER, PIXEL_BUDGET, GENOMES, GENE_COUNT } from './config.js?v=20261119.3';
import { createSim } from './sim.js?v=20261119.3';
import { createRenderer } from './renderer.js?v=20261119.3';
import { createInput } from './input.js?v=20261119.3';
import { sampleText, sampleKnot } from './text-targets.js?v=20261119.3';
import { createQuality } from './quality.js?v=20261119.3';
import { decode, evolve, loadState, saveState, clearState, seedPopulation } from './evolution.js?v=20261119.3';

// Owns the frame loop and the state machine:
//
//   dormant -> waking -> roaming <-> condensed
//                          ^            ^
//                          +-- transit -+   (section change)
//
// dormant    a small sleeping knot, waiting for the visitor's first move
// waking     the knot bursts open toward the visitor
// roaming    the swarm follows the light; fitness accrues, generations pass
// condensed  the visitor is still; the swarm settles into the heading
// transit    the old heading scatters and the new one forms
//
// Returns null when WebGL2 is unavailable.
export function createWorld(canvas, hooks = {}) {
    const coarse = matchMedia('(pointer: coarse)').matches;
    const ladder = COUNT_LADDER[coarse ? 'coarse' : 'fine'];
    const budget = PIXEL_BUDGET[coarse ? 'coarse' : 'fine'];
    const query = new URLSearchParams(location.search);

    const renderer = createRenderer(canvas, ladder[0], {
        forceRGBA8: query.get('rgba8') === '1',
        onLost: () => hooks.onContextLost?.(),
        onRestored: () => hooks.onContextRestored?.()
    });
    if (!renderer) return null;

    const sim = createSim(ladder[0]);
    const decoded = new Float32Array(GENOMES * GENE_COUNT);
    const fitness = new Float32Array(GENOMES);
    let lineage = loadState();
    sim.applyParams(decode(lineage.genomes, decoded), true);

    let width = 0;
    let height = 0;
    // Top-left of the canvas in client coordinates; pointer positions are
    // client-space, the simulation is canvas-space.
    let originX = 0;
    let originY = 0;
    let scale = 1;
    let raf = 0;
    let last = 0;
    let time = 0;
    let running = false;
    let frames = 0;
    let count = ladder[0];

    let presence = 0;
    let lightX = 0;
    let lightY = 0;
    let lightVx = 0;
    let lightVy = 0;
    let lightK = 0;
    let energy = 0;

    let state = 'idle';
    let stateAt = 0;
    let condense = 0;
    let bornAt = 0;
    let wokeAt = -1;
    let revealed = false;
    let hinted = false;
    let condensedAt = -1;

    // The heading the swarm forms: its text, where the DOM heading sits, and
    // whether that spot is on screen.
    const heading = { text: '', box: null, visible: false };
    let pending = null;

    // Where the text is; the renderer dims the swarm there.
    const shade = { left: 0, top: 0, right: 0, bottom: 0, strength: 0 };
    let shadeOn = false;
    const frameInfo = { dt: 0, time: 0, tau: T.trailTau, gain: 1, pulses: sim.pulses, shade };

    function enter(next) {
        if (state === next) return;
        state = next;
        stateAt = time;
        if (next === 'condensed') condensedAt = time;
        hooks.onState?.(next);
    }

    function reveal() {
        if (revealed) return;
        revealed = true;
        hooks.onReveal?.();
    }

    function formHeading() {
        if (!heading.box || !heading.text) return sim.releaseTargets();
        const want = Math.floor(count * T.condenseShare);
        sim.setTargets(sampleText(heading.text, heading.box, want), T.condenseShare);
    }

    function formKnot() {
        sim.setCount(T.dormantCount);
        sim.setTargets(sampleKnot(width / 2, height * 0.46, 38 * scale, T.dormantCount), 1);
    }

    function wake() {
        if (state !== 'dormant') return;
        wokeAt = time;
        const aimX = input.state.seen ? input.state.x - originX : width / 2;
        const aimY = input.state.seen ? input.state.y - originY : height / 2;
        sim.burst(width / 2, height * 0.46, T.dormantCount, aimX, aimY);
        sim.setCount(count);
        sim.scatter(0, 0, 260);
        formHeading();
        condense = 0;
        hooks.onHint?.('');
        hooks.onWake?.();
        enter('waking');
    }

    // When frames run slow, give things up one at a time: trail resolution,
    // then particles, then the far bloom, and finally the simulation itself.
    const ladderSteps = [
        () => renderer.setQuality({ trailScale: 0.75 }),
        () => renderer.setQuality({ trailScale: 0.6 }),
        ...ladder.slice(1).map((next) => () => {
            count = next;
            if (state === 'dormant') return;
            sim.setCount(count);
            formHeading();
        }),
        () => renderer.setQuality({ farBloom: false })
    ];
    let ladderStep = 0;
    const quality = createQuality(() => {
        if (query.get('quality') === 'off') return;
        if (ladderStep < ladderSteps.length) return ladderSteps[ladderStep++]();
        stop();
        hooks.onGiveUp?.();
    });

    const input = createInput({
        onPress(x, y, charge) {
            if (state === 'dormant') return wake();
            sim.emitPulse(x - originX, y - originY, charge);
            hooks.onPulse?.(charge);
        },
        onActivity(kind, travelled) {
            if (state !== 'dormant') return;
            if (kind !== 'move' || travelled > 24) wake();
        }
    });

    function resize() {
        const bounds = hooks.bounds?.();
        const w = Math.round(bounds ? bounds.width : window.innerWidth);
        const h = Math.round(bounds ? bounds.height : window.innerHeight);
        originX = bounds ? bounds.left : 0;
        originY = bounds ? bounds.top : 0;
        if (w < 2 || h < 2) return;
        // Mobile URL bars change the height constantly; don't rebuild for that.
        if (w === width && Math.abs(h - height) < height * 0.15) return;
        const first = width === 0;
        width = w;
        height = h;
        scale = Math.min(w, h) / 900;
        let dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (w * h * dpr * dpr > budget) dpr = Math.sqrt(budget / (w * h));
        if (!bounds) canvas.style.height = `${h}px`;
        renderer.resize(w, h, dpr);
        sim.resize(w, h);
        if (first) {
            lightX = w / 2;
            lightY = h / 2;
        }
        quality.exclude();
        hooks.onResize?.(w, h);
        if (state === 'dormant') formKnot();
    }

    let resizeTimer = 0;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resize, 150);
    });

    function nextGeneration() {
        sim.takeFitness(fitness);
        const result = evolve(lineage.genomes, fitness);
        lineage = { gen: lineage.gen + 1, genomes: result.genomes };
        sim.applyParams(decode(lineage.genomes, decoded), false);
        saveState(lineage.gen, lineage.genomes);
        hooks.onGeneration?.(lineage.gen, lineage.genomes, fitness);
    }

    function updateState(now, driven) {
        const idle = input.idleMs(now);
        const since = time - stateAt;
        if (state === 'dormant') {
            const waited = now - bornAt;
            if (!hinted && waited > T.hintMs) {
                hinted = true;
                hooks.onHint?.(coarse ? 'Touch to wake it' : 'Move to wake it');
            }
            if (waited > T.autoWakeMs) wake();
        } else if (state === 'waking') {
            if (since > T.wakeSeconds) enter(heading.visible && idle > T.idleCondenseMs ? 'condensed' : 'roaming');
        } else if (state === 'roaming') {
            if (heading.visible && (!driven || idle > T.idleCondenseMs)) enter('condensed');
        } else if (state === 'condensed') {
            const moving = driven && idle < 250 && energy > T.wakeEnergy * scale && !input.state.overContent;
            if (!heading.visible || moving) enter('roaming');
        } else if (state === 'transit') {
            if (pending && since > 0.35) {
                heading.text = pending.text;
                heading.box = pending.box;
                heading.visible = true;
                pending = null;
                formHeading();
            }
            if (since > T.transitSeconds) enter(heading.visible ? 'condensed' : 'roaming');
        }

        if (!revealed && wokeAt >= 0) {
            const settled = state === 'condensed' && time - condensedAt > T.revealMs / 1000;
            if (settled || time - wokeAt > T.revealFailsafeMs / 1000) reveal();
        }
    }

    function frame(now) {
        raf = requestAnimationFrame(frame);
        const interval = now - last;
        const dt = Math.min(interval / 1000, 1 / 30);
        last = now;
        if (dt <= 0) return;
        quality.frame(now, interval);
        time += dt;
        frames++;

        const driven = input.state.seen && input.idleMs(now) < T.ghostAfterMs;
        updateState(now, driven);

        // With no visitor driving it, the light wanders on its own.
        presence += ((driven ? 1 : 0) - presence) * (1 - Math.exp(-dt * 1.6));
        const ghostX = width * (0.5 + 0.3 * Math.sin(time * 0.19));
        const ghostY = height * (0.5 + 0.26 * Math.sin(time * 0.27 + 1.3));
        // The canvas can drift with the monitor; re-anchor a few times a second.
        if (hooks.bounds && frames % 20 === 0) {
            const bounds = hooks.bounds();
            originX = bounds.left;
            originY = bounds.top;
        }
        const targetX = ghostX + (input.state.x - originX - ghostX) * presence;
        const targetY = ghostY + (input.state.y - originY - ghostY) * presence;
        const follow = 1 - Math.exp(-dt * T.lightFollow);
        const nx = lightX + (targetX - lightX) * follow;
        const ny = lightY + (targetY - lightY) * follow;
        lightVx = (nx - lightX) / dt;
        lightVy = (ny - lightY) / dt;
        lightX = nx;
        lightY = ny;
        energy += (Math.hypot(lightVx, lightVy) - energy) * (1 - Math.exp(-dt * 4));

        const dormant = state === 'dormant';
        const lightGoal = dormant ? 0 : input.state.overContent && driven ? T.contentLight : 1;
        lightK += (lightGoal - lightK) * (1 - Math.exp(-dt * 3));

        const settle = dormant || state === 'condensed' || (state === 'transit' && !pending);
        const goal = settle ? 1 : 0;
        condense += (goal - condense) * (1 - Math.exp(-dt * (goal ? T.condenseIn : T.condenseOut)));

        const accrue = state === 'roaming' && driven;
        sim.step(dt, lightX, lightY, lightVx, lightVy, lightK, condense, accrue);
        if (sim.activeTime >= T.generationSeconds) nextGeneration();

        shade.strength += ((shadeOn && revealed ? T.shade : 0) - shade.strength) * (1 - Math.exp(-dt * 3));
        frameInfo.dt = dt;
        frameInfo.time = time;
        frameInfo.tau = T.trailTau + (T.trailTauCondensed - T.trailTau) * condense * (dormant ? 0.4 : 1);
        frameInfo.gain = dormant ? 0.8 + 0.2 * Math.sin(time * 0.9) : 1;
        renderer.draw(sim.render, sim.count, frameInfo);
        hooks.onFrame?.(now, dt);
    }

    // skipEntrance: go straight to the heading instead of the dormant knot.
    function start(skipEntrance) {
        if (running) return;
        running = true;
        if (!width) resize();
        bornAt = performance.now();
        if (skipEntrance) {
            wokeAt = 0;
            sim.setCount(count);
            formHeading();
            enter(heading.visible ? 'condensed' : 'roaming');
            condense = 0.6;
            reveal();
        } else {
            formKnot();
            condense = 1;
            enter('dormant');
        }
        last = performance.now();
        raf = requestAnimationFrame(frame);
    }

    function stop() {
        running = false;
        cancelAnimationFrame(raf);
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) cancelAnimationFrame(raf);
        else if (running) {
            quality.exclude();
            last = performance.now();
            raf = requestAnimationFrame(frame);
        }
    });
    window.addEventListener('pagehide', () => saveState(lineage.gen, lineage.genomes));

    return {
        start,
        stop,
        resize,
        wake,
        sim,
        renderer,
        tuning: T,
        get state() {
            return state;
        },
        get energy() {
            return energy;
        },
        // -1..1, in phase with the renderer's slow brightening and dimming.
        get breath() {
            return Math.sin(time * Math.PI * 2 * T.breathHz);
        },
        get running() {
            return running;
        },
        get lineage() {
            return lineage;
        },
        // The heading for the section being shown. With a direction, the old
        // heading scatters that way first.
        setSection(text, box, direction) {
            if (state === 'dormant' || state === 'idle') {
                heading.text = text;
                heading.box = box;
                heading.visible = !!box;
                return;
            }
            sim.scatter(direction || 0, 0, 340);
            pending = { text, box };
            enter('transit');
            stateAt = time;
        },
        // Swap the word without leaving the section (hovering a project).
        retitle(text) {
            if (state === 'dormant' || state === 'transit' || text === heading.text) return;
            heading.text = text;
            formHeading();
        },
        // The DOM heading moved (scroll) or changed size (resize).
        moveHeading(box, visible) {
            const previous = heading.box;
            heading.visible = visible;
            if (pending) {
                pending.box = box;
                return;
            }
            heading.box = box;
            if (state === 'dormant' || !previous || !box) return;
            if (previous.height === box.height && previous.maxWidth === box.maxWidth)
                sim.offsetTargets(box.left - previous.left, box.top - previous.top);
            else formHeading();
        },
        // rect: DOMRect-like of the visible reading column, or null for none.
        setShade(rect) {
            shadeOn = !!rect;
            if (!rect) return;
            shade.left = rect.left;
            shade.top = rect.top;
            shade.right = rect.right;
            shade.bottom = rect.bottom;
        },
        stats() {
            return {
                state,
                gen: lineage.gen,
                count: sim.count,
                energy,
                presence,
                condense,
                frames,
                caught: sim.caughtTotal,
                halfFloat: renderer.halfFloat,
                ladderStep,
                fps: quality.last.fps,
                light: [lightX, lightY]
            };
        },
        forceGeneration(times = 1) {
            for (let i = 0; i < times; i++) nextGeneration();
        },
        resetLineage() {
            clearState();
            lineage = { gen: 0, genomes: seedPopulation() };
            sim.applyParams(decode(lineage.genomes, decoded), false);
            saveState(lineage.gen, lineage.genomes);
            hooks.onGeneration?.(lineage.gen, lineage.genomes, null);
        }
    };
}
