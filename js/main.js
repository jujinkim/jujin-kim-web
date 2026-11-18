import { ENTERED_KEY, SECTIONS } from './modules/config.js?v=20261119.1';
import { initNavigation, currentSection } from './modules/navigation.js?v=20261119.1';
import { createWorld } from './modules/world.js?v=20261119.1';
import { createHud } from './modules/hud.js?v=20261119.1';
import { createAudio } from './modules/audio.js?v=20261119.1';
import { renderStatic } from './modules/static-frame.js?v=20261119.1';

const root = document.documentElement;
const query = new URLSearchParams(location.search);

const visibleSection = () => document.getElementById(currentSection());

// Where the swarm should write the heading: the invisible DOM heading's spot.
function headingBox(section) {
    const el = section?.querySelector('.heading');
    if (!el) return { box: null, visible: false };
    const rect = el.getBoundingClientRect();
    const size = parseFloat(getComputedStyle(el).fontSize);
    const box = {
        left: rect.left,
        top: rect.bottom - size,
        height: size,
        maxWidth: Math.max(120, window.innerWidth - rect.left * 2)
    };
    return { box, visible: rect.bottom > size * 0.5 && box.top < window.innerHeight };
}

function sessionFlag(key, value) {
    try {
        if (value === undefined) return sessionStorage.getItem(key);
        sessionStorage.setItem(key, value);
    } catch {}
    return null;
}

function boot() {
    let world = null;
    let hoverWord = null;
    let hoverTimer = 0;

    initNavigation((previous, next) => {
        if (!world) return;
        const section = document.getElementById(next);
        const direction = previous ? Math.sign(SECTIONS.indexOf(next) - SECTIONS.indexOf(previous)) : 0;
        hoverWord = null;
        world.setSection(section.dataset.heading, headingBox(section).box, direction);
        syncLayout();
    });

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canvas = document.getElementById('swarm');
    const audio = createAudio();

    // One still frame stands in whenever the live swarm cannot run.
    let stillTimer = 0;
    const redrawStill = () => {
        clearTimeout(stillTimer);
        stillTimer = setTimeout(() => root.dataset.mode === 'static' && renderStatic(canvas), 150);
    };
    function goStatic() {
        root.dataset.mode = 'static';
        audio.disable();
        renderStatic(canvas);
        window.addEventListener('resize', redrawStill);
    }

    world = reduced || query.get('static') === '1' ? null : createWorld(canvas, hooks());
    if (!world) return goStatic();
    root.dataset.mode = 'live';

    const setSound = (on) => {
        const active = on ? audio.enable() : (audio.disable(), false);
        hud.setSound(active);
    };
    const hud = createHud(document.getElementById('chrome'), {
        onReset: () => world.resetLineage(),
        onSound: () => setSound(!audio.enabled)
    });
    hud.update(world.lineage.gen, world.lineage.genomes, null);
    document.addEventListener('keydown', (event) => {
        if (event.code !== 'KeyS' || event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.target.closest('input, textarea, select, [contenteditable]')) return;
        setSound(!audio.enabled);
    });
    document.addEventListener('visibilitychange', () => (document.hidden ? audio.suspend() : audio.resume()));

    function hooks() {
        return {
            onState: (state) => (root.dataset.state = state),
            onReveal: () => (root.dataset.revealed = ''),
            onWake: () => sessionFlag(ENTERED_KEY, '1'),
            onHint: (text) => hud.showHint(text),
            onGeneration: (gen, genomes, fitness) => {
                hud.update(gen, genomes, fitness);
                audio.tick(gen);
            },
            onPulse: (charge) => audio.thump(charge),
            onFrame: () => audio.update(world.energy, world.breath),
            onResize: () => syncLayout(),
            onGiveUp: goStatic,
            onContextLost: goStatic,
            onContextRestored: () => {
                if (!world.running) return;
                root.dataset.mode = 'live';
                syncLayout();
            }
        };
    }

    // Keep the world informed about where the heading and the text are.
    let layoutQueued = false;
    function syncLayout() {
        layoutQueued = false;
        const section = visibleSection();
        const { box, visible } = headingBox(section);
        world.moveHeading(box, visible);
        const reading = section?.querySelector('.reading');
        world.setShade(reading ? reading.getBoundingClientRect() : null);
    }
    const queueLayout = () => {
        if (layoutQueued) return;
        layoutQueued = true;
        requestAnimationFrame(syncLayout);
    };
    window.addEventListener('scroll', queueLayout, { passive: true });
    window.addEventListener('resize', queueLayout);
    document.fonts?.ready.then(queueLayout);

    // Pointing at a project makes the swarm spell its name.
    const setHover = (word) => {
        if (word === hoverWord) return;
        hoverWord = word;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(
            () => world.retitle(hoverWord ?? visibleSection().dataset.heading),
            hoverWord ? 140 : 420
        );
    };
    const wordAt = (target) => target.closest?.('[data-condense]')?.dataset.condense ?? null;
    document.addEventListener('pointerover', (event) => event.pointerType === 'mouse' && setHover(wordAt(event.target)));
    document.addEventListener('focusin', (event) => setHover(wordAt(event.target)));
    document.addEventListener('focusout', () => setHover(null));

    const section = visibleSection();
    const { box, visible } = headingBox(section);
    world.setSection(section.dataset.heading, box, 0);
    world.moveHeading(box, visible);
    syncLayout();

    const skipEntrance = currentSection() !== 'home' || !!sessionFlag(ENTERED_KEY) || query.get('enter') === '0';
    world.start(skipEntrance);
    if (query.get('debug') === '1') window.swarmDebug = world;
}

try {
    boot();
} catch (error) {
    root.dataset.mode = 'static';
    console.error(error);
}
