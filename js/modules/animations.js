let enabled = false;
let frame = 0;
let refresh;
let dispose;

export function toggleMatrixRain() {
    enabled = !enabled;
    refresh?.();
    return enabled;
}

export function initAnimations() {
    cleanup();
    const canvas = document.getElementById('terminal-matrix');
    const panel = document.getElementById('terminal-panel');
    const ctx = canvas?.getContext('2d');
    if (!canvas || !panel || !ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = window.matchMedia('(min-width: 769px) and (pointer: fine)');
    let width = 0;
    let height = 0;
    let streams = [];
    let lastTime = 0;
    const isVisible = () => enabled && !panel.hidden && !document.hidden && desktop.matches;
    const draw = now => {
        frame = 0;
        if (!isVisible()) return;
        const moving = !reduced.matches;
        if (!moving || now - lastTime >= 90) {
            lastTime = now;
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = '#a7bbff';
            ctx.font = '12px monospace';
            streams.forEach(stream => {
                if (moving) stream.y = (stream.y + 17) % (height + 50);
                for (let tail = 0; tail < 3; tail++) {
                    ctx.globalAlpha = 0.7 - tail * 0.2;
                    ctx.fillText((Math.floor(stream.y / 17) + tail) % 2, stream.x, stream.y - tail * 17);
                }
            });
        }
        if (moving) frame = requestAnimationFrame(draw);
    };
    refresh = () => {
        cancelAnimationFrame(frame);
        frame = 0;
        canvas.dataset.running = String(isVisible() && !reduced.matches);
        if (!isVisible()) {
            ctx.clearRect(0, 0, width, height);
            return;
        }
        width = panel.clientWidth;
        height = panel.clientHeight;
        const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        streams = Array.from({ length: Math.ceil(width / 30) }, (_, index) => ({ x: index * 30, y: Math.random() * height }));
        lastTime = 0;
        draw(performance.now());
    };
    window.addEventListener('terminal-state-changed', refresh);
    window.addEventListener('resize', refresh, { passive: true });
    document.addEventListener('visibilitychange', refresh);
    reduced.addEventListener('change', refresh);
    desktop.addEventListener('change', refresh);
    dispose = () => {
        window.removeEventListener('terminal-state-changed', refresh);
        window.removeEventListener('resize', refresh);
        document.removeEventListener('visibilitychange', refresh);
        reduced.removeEventListener('change', refresh);
        desktop.removeEventListener('change', refresh);
    };
    refresh();
}

export function cleanup() {
    cancelAnimationFrame(frame);
    dispose?.();
    frame = 0;
    dispose = null;
    refresh = null;
}
