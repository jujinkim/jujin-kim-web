import { createCurvature } from './screen-curvature.js?v=20261118.2';
import { monitorPerformance } from './display-performance.js?v=20261118.2';
import { cleanup as stopAnimations, setAnimationResolution } from './animations.js?v=20261118.2';
import { initDesktopScene } from './desktop-scene.js?v=20261118.2';

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
    }, scene);
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
    if (startupPending && !motion.matches && !readSession(POWER_SEEN) && writeSession(POWER_SEEN, '1')) {
        glass.classList.add('power-on');
        powerTimer = setTimeout(() => {
            glass.classList.remove('power-on');
            requestAnimationFrame(startCurvature);
        }, 600);
    } else {
        writeSession(POWER_SEEN, '1');
        startCurvature();
    }
    if (preview) {
        diagnostics.forceFlat = () => flat('preview-interaction-failure');
        diagnostics.forceWeb1 = () => web1('preview');
        diagnostics.submitSample = (sample) => performanceMonitor.submit(sample);
        diagnostics.toScreen = (x, y) => renderer?.toScreen(x, y) || [x, y];
    }
}
