import { createCurvature } from './screen-curvature.js?v=20261119.5';
import { monitorPerformance } from './display-performance.js?v=20261119.5';
import { cleanup as stopAnimations, setAnimationResolution } from './animations.js?v=20261119.5';
import { initDesktopScene } from './desktop-scene.js?v=20261119.5';
import { runEntrance, cancelEntrance, entranceActive } from './entrance.js?v=20261119.5';
import { stillRoom } from './room-life.js?v=20261119.5';
import { room3d } from './room3d.js?v=20261119.5';

// How long a first visit waits in the dark for the 3D room before the CSS
// room takes the entrance instead.
const ROOM3D_WAIT = 1400;

const VISIT_MODE = 'crt-display-mode';
const POWER_SEEN = 'crt-power-seen';
const readSession = (key) => {
    try {
        return sessionStorage.getItem(key);
    } catch {
        return null;
    }
};
const writeSession = (key, value) => {
    try {
        sessionStorage.setItem(key, value);
        return true;
    } catch {
        return false;
    }
};

export function initCRTEffects() {
    const screen = document.getElementById('crt-screen');
    const viewport = document.getElementById('crt-viewport');
    const glass = document.getElementById('monitor-glass');
    if (!screen || !viewport || !glass) return;
    const query = new URLSearchParams(location.search);
    const preview = query.get('crt-preview') === '1';
    const forced = preview ? query.get('crt-mode') : null;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = matchMedia('(min-width: 1000px) and (min-height: 600px)');
    let renderer, performanceMonitor, powerTimer;
    let curvatureFailed = false;
    let level = 0;
    const resolutions = [1, 0.8, 0.6];
    const samples = [];
    const events = new AbortController();
    const diagnostics = {
        samples,
        reason: '',
        get stats() {
            return renderer?.stats || null;
        },
        get mode() {
            return document.body.dataset.displayMode;
        },
        get resolution() {
            return resolutions[level];
        }
    };
    window.crtDiagnostics = diagnostics;
    document.body.dataset.displayMode = 'flat';

    function flat(reason) {
        if (reason !== 'compact-viewport') curvatureFailed = true;
        renderer?.destroy();
        renderer = null;
        document.body.dataset.displayMode = 'flat';
        diagnostics.reason = reason;
        performanceMonitor?.exclude();
    }
    function web1(reason) {
        delete document.documentElement.dataset.crtStartup;
        cancelEntrance();
        delete document.documentElement.dataset.entrance;
        delete document.documentElement.dataset.entranceOwned;
        room3d.destroy();
        renderer?.destroy();
        renderer = null;
        performanceMonitor?.stop();
        events.abort();
        clearTimeout(powerTimer);
        glass.classList.remove('power-on');
        stopAnimations();
        const stars = document.getElementById('starfield');
        stars.width = stars.height = 1;
        screen.replaceChildren();
        document.body.classList.remove('crt-effects-enabled');
        document.body.dataset.displayMode = 'web1';
        diagnostics.reason = reason;
        writeSession(VISIT_MODE, 'web1');
    }
    function degrade() {
        stillRoom();
        // The 3D room is the heaviest thing on the page: quiet it, then drop
        // it, before the display itself is degraded.
        if (room3d.ready && room3d.step()) return;
        if (renderer?.ready && level < resolutions.length - 1) {
            level++;
            setAnimationResolution(resolutions[level]);
            renderer.setResolution(resolutions[level]);
        } else web1('sustained-low-performance');
    }
    if (forced === 'web1' || (!forced && readSession(VISIT_MODE) === 'web1')) {
        web1(forced ? 'preview' : 'visit-preference');
        return;
    }
    const scene = initDesktopScene(glass, events.signal);
    function startCurvature() {
        if (diagnostics.mode === 'web1' || curvatureFailed || renderer || glass.classList.contains('power-on')) return;
        if (entranceActive()) return;
        if (forced === 'flat') {
            diagnostics.reason = 'preview';
            return;
        }
        if (!desktop.matches) {
            diagnostics.reason = 'compact-viewport';
            return;
        }
        diagnostics.reason = '';
        renderer = createCurvature(viewport, flat);
        if (renderer && level > 0) renderer.setResolution(resolutions[level]);
        if (!renderer && !diagnostics.reason) {
            curvatureFailed = true;
            diagnostics.reason = 'unsupported-api';
        }
    }
    performanceMonitor = monitorPerformance(degrade, (sample) => {
        samples.push({ ...sample, mode: diagnostics.mode, resolution: resolutions[level] });
        if (samples.length > 30) samples.shift();
    }, {
        isTilted: scene.isTilted,
        // The first slow frame while tilted costs the tilt and the room's motion.
        disableOnSlowFrame() {
            const disabled = scene.disableOnSlowFrame();
            if (disabled) stillRoom();
            return disabled;
        }
    });
    desktop.addEventListener('change', () => {
        if (diagnostics.mode === 'web1') return;
        if (!desktop.matches) {
            if (renderer || !curvatureFailed) flat('compact-viewport');
        } else startCurvature();
    }, { signal: events.signal });
    function visibility() {
        screen.classList.toggle('is-paused', document.hidden);
    }
    document.addEventListener('visibilitychange', visibility, { signal: events.signal });
    visibility();
    const startupPending = document.documentElement.dataset.crtStartup === 'pending';
    delete document.documentElement.dataset.crtStartup;
    // An expired guard skips startup; CSS still reveals content if cleanup is delayed.
    const room = room3d.init();
    if (startupPending && !motion.matches && !readSession(POWER_SEEN) && writeSession(POWER_SEEN, '1')) {
        // Hold the dark frame until the 3D room is ready (or has given up), so
        // the entrance never swaps rooms halfway.
        document.documentElement.dataset.entranceOwned = '';
        const begin = () => {
            if (diagnostics.mode === 'web1') return;
            glass.classList.add('power-on');
            powerTimer = setTimeout(() => glass.classList.remove('power-on'), 600);
            runEntrance({
                scene,
                dolly: desktop.matches || room3d.ready,
                onDone: () => {
                    clearTimeout(powerTimer);
                    glass.classList.remove('power-on');
                    requestAnimationFrame(startCurvature);
                }
            });
        };
        let begun = false;
        const once = () => begun || ((begun = true), begin());
        room.then(once);
        setTimeout(once, ROOM3D_WAIT);
    } else {
        delete document.documentElement.dataset.entrance;
        writeSession(POWER_SEEN, '1');
        startCurvature();
    }
    // `reboot` replays the entrance. A running curvature renderer mirrors DOM
    // geometry, so with it the camera stays put and only the screen restarts.
    window.addEventListener('reboot-requested', () => {
        if (diagnostics.mode === 'web1' || motion.matches || entranceActive()) return;
        glass.classList.add('power-on');
        clearTimeout(powerTimer);
        powerTimer = setTimeout(() => glass.classList.remove('power-on'), 600);
        runEntrance({
            scene,
            dolly: (desktop.matches || room3d.ready) && !renderer,
            onDone: () => {
                clearTimeout(powerTimer);
                glass.classList.remove('power-on');
            }
        });
    }, { signal: events.signal });
    if (preview) {
        diagnostics.forceFlat = () => flat('preview-interaction-failure');
        diagnostics.forceWeb1 = () => web1('preview');
        diagnostics.submitSample = (sample) => performanceMonitor.submit(sample);
        diagnostics.toScreen = (x, y) => renderer?.toScreen(x, y) || [x, y];
    }
}
