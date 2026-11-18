const TRACKING_TIME = 90;
const WHEEL_HOLD = 120;
const SETTLED_DISTANCE = 0.001;

export function initDesktopScene(glass, signal) {
    const rig = document.getElementById('monitor-rig');
    const backdrop = document.querySelector('.room-backdrop');
    const foreground = document.querySelector('.room-foreground');
    const available = matchMedia(
        'screen and (min-width: 1000px) and (min-height: 600px) and ' +
        '(any-hover: hover) and (any-pointer: fine) and (prefers-reduced-motion: no-preference)'
    );
    let targetX = 0, targetY = 0, x = 0, y = 0;
    let frame = null, wheelTimer = null, lastFrame = 0, pressed = false, disabled = false;

    function isTilted() {
        return x !== 0 || y !== 0;
    }

    function render() {
        const tilted = isTilted();
        rig.toggleAttribute('data-scene-tilted', tilted);
        if (!tilted) {
            rig.style.removeProperty('transform');
            backdrop.style.removeProperty('transform');
            foreground.style.removeProperty('transform');
            return;
        }
        const perspective = 'perspective(max(8000px, 1000vw))';
        const overscan = 1 + 0.04 * Math.max(Math.abs(x), Math.abs(y));
        rig.style.transform = `${perspective} translate3d(${-12 * x}px, ${-8 * y}px, 0) rotateX(${5 * y}deg) rotateY(${-7 * x}deg)`;
        backdrop.style.transform = `${perspective} translate3d(${-4 * x}px, ${-3 * y}px, 0) rotateX(${0.4 * y}deg) rotateY(${-0.6 * x}deg) scale(${overscan})`;
        foreground.style.transform = `${perspective} translate3d(${-16 * x}px, ${-10 * y}px, 0) rotateX(${1.2 * y}deg) rotateY(${-1.6 * x}deg) scale(${overscan})`;
    }

    function pause() {
        cancelAnimationFrame(frame);
        frame = null;
    }

    function tick(now) {
        const elapsed = Math.max(0, now - lastFrame);
        const blend = 1 - Math.exp(-elapsed / TRACKING_TIME);
        x += (targetX - x) * blend;
        y += (targetY - y) * blend;
        const settled = Math.hypot(targetX - x, targetY - y) < SETTLED_DISTANCE;
        if (settled) {
            x = targetX;
            y = targetY;
        }
        render();
        lastFrame = now;
        frame = settled ? null : requestAnimationFrame(tick);
    }

    function schedule() {
        if (pressed || wheelTimer !== null) return;
        if (disabled) {
            if (isTilted()) reset();
            return;
        }
        if (frame !== null || (x === targetX && y === targetY)) return;
        lastFrame = performance.now();
        frame = requestAnimationFrame(tick);
    }

    function reset() {
        pause();
        clearTimeout(wheelTimer);
        wheelTimer = null;
        pressed = false;
        targetX = targetY = x = y = 0;
        render();
    }

    function canTrack() {
        return !disabled && available.matches && !document.hidden && !glass.classList.contains('power-on');
    }

    function move(event) {
        if (event.pointerType !== 'mouse' || !canTrack()) return;
        pressed = event.buttons !== 0;
        targetX = Math.max(-1, Math.min(1, 2 * event.clientX / window.innerWidth - 1));
        targetY = Math.max(-1, Math.min(1, 2 * event.clientY / window.innerHeight - 1));
        if (pressed) pause();
        else schedule();
    }

    function holdPointer(event) {
        if (event.pointerType !== 'mouse' || !canTrack()) return;
        pressed = true;
        pause();
    }

    function releasePointer(event) {
        if (event.pointerType !== 'mouse') return;
        pressed = event.buttons !== 0;
        schedule();
    }

    function leave(event) {
        if (event.pointerType !== 'mouse' || event.relatedTarget !== null) return;
        targetX = targetY = 0;
        schedule();
    }

    function holdWheel() {
        if (!canTrack() && !isTilted()) return;
        pause();
        clearTimeout(wheelTimer);
        wheelTimer = setTimeout(() => {
            wheelTimer = null;
            schedule();
        }, WHEEL_HOLD);
    }

    const capture = { capture: true, passive: true, signal };
    window.addEventListener('pointermove', move, capture);
    window.addEventListener('pointerdown', holdPointer, capture);
    window.addEventListener('pointerup', releasePointer, capture);
    window.addEventListener('pointercancel', releasePointer, capture);
    window.addEventListener('pointerout', leave, capture);
    window.addEventListener('wheel', holdWheel, capture);
    window.addEventListener('blur', reset, { signal });
    window.addEventListener('beforeprint', reset, { signal });
    document.addEventListener('visibilitychange', reset, { signal });
    available.addEventListener('change', () => {
        if (!available.matches) reset();
    }, { signal });
    signal.addEventListener('abort', reset, { once: true });
    return {
        isTilted,
        disableOnSlowFrame() {
            if (disabled || !isTilted()) return false;
            disabled = true;
            pause();
            schedule();
            return true;
        }
    };
}
