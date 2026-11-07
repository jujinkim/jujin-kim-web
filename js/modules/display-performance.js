export function summarizeFrames(frames) {
    const sorted = [...frames].sort((a, b) => a - b);
    const total = frames.reduce((sum, value) => sum + value, 0);
    const fps = (frames.length * 1000) / total;
    const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
    return { fps, p95, slow: fps < 55 || p95 > 25 };
}

export function monitorPerformance(onSlow, onSample) {
    const controller = new AbortController();
    let raf,
        previous,
        start,
        frames = [],
        consecutive = 0,
        stopped = false;
    let activeUntil = 0,
        excludedUntil = performance.now() + 3000;
    function reset() {
        previous = start = undefined;
        frames = [];
    }
    function exclude() {
        excludedUntil = performance.now() + 1500;
        consecutive = 0;
        reset();
    }
    function submit(sample) {
        onSample(sample);
        consecutive = sample.slow ? consecutive + 1 : 0;
        if (consecutive >= 2) {
            consecutive = 0;
            onSlow();
            exclude();
        }
    }
    function frame(now) {
        raf = null;
        if (stopped || document.hidden || now > activeUntil) {
            consecutive = 0;
            reset();
            return;
        }
        if (now < excludedUntil) reset();
        else {
            start ??= now;
            if (previous !== undefined) frames.push(now - previous);
            previous = now;
            if (now - start >= 2000) {
                submit(summarizeFrames(frames));
                reset();
            }
        }
        if (!stopped) raf = requestAnimationFrame(frame);
    }
    function interact(event) {
        if (event.type === 'pointermove' && !event.buttons) return;
        activeUntil = performance.now() + 650;
        if (raf == null && !document.hidden) raf = requestAnimationFrame(frame);
    }
    for (const type of ['scroll', 'wheel', 'touchmove', 'keydown', 'pointerdown', 'pointermove']) {
        document.addEventListener(type, interact, {
            capture: true,
            passive: true,
            signal: controller.signal
        });
    }
    window.addEventListener('resize', exclude, { signal: controller.signal });
    document.addEventListener(
        'visibilitychange',
        () => {
            cancelAnimationFrame(raf);
            raf = null;
            activeUntil = 0;
            exclude();
        },
        { signal: controller.signal }
    );
    return {
        submit,
        exclude,
        stop() {
            stopped = true;
            controller.abort();
            cancelAnimationFrame(raf);
            reset();
        }
    };
}
