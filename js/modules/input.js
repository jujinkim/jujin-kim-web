import { TUNING as T } from './config.js?v=20261121.3';

const INTERACTIVE = 'a, button, input, textarea, select, summary, [role="button"], [contenteditable]';
const PRESS_TRAVEL = 10;

// Normalizes mouse, pen and touch into one moving light plus a press gesture.
// A press that stays put fires a pulse; a press that travels just moves the light.
export function createInput(handlers = {}) {
    const state = {
        x: 0,
        y: 0,
        seen: false,
        down: false,
        lastMove: -Infinity,
        charge: 0,
        overContent: false
    };
    let downX = 0;
    let downY = 0;
    let downAt = 0;
    let travelled = 0;
    let pressable = false;

    function move(event) {
        if (state.seen) travelled += Math.hypot(event.clientX - state.x, event.clientY - state.y);
        state.x = event.clientX;
        state.y = event.clientY;
        state.seen = true;
        state.lastMove = performance.now();
        state.overContent = !!event.target.closest?.('[data-reading]');
        handlers.onActivity?.('move', travelled);
    }

    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener(
        'pointerdown',
        (event) => {
            if (event.button > 0) return;
            move(event);
            state.down = true;
            downX = event.clientX;
            downY = event.clientY;
            downAt = performance.now();
            pressable = !event.target.closest?.(INTERACTIVE);
            handlers.onActivity?.('press', travelled);
        },
        { passive: true }
    );
    function release(event, cancelled) {
        if (!state.down) return;
        state.down = false;
        state.charge = 0;
        const still = Math.hypot(event.clientX - downX, event.clientY - downY) < PRESS_TRAVEL;
        const selecting = !!String(getSelection?.() ?? '');
        if (!cancelled && pressable && still && !selecting) {
            const held = performance.now() - downAt;
            handlers.onPress?.(event.clientX, event.clientY, Math.min(1, held / T.pulseChargeMs));
        }
        if (event.pointerType === 'touch') state.lastMove = -Infinity;
    }
    window.addEventListener('pointerup', (event) => release(event, false), { passive: true });
    window.addEventListener('pointercancel', (event) => release(event, true), { passive: true });
    document.addEventListener('pointerleave', () => {
        state.lastMove = -Infinity;
    });
    window.addEventListener('blur', () => {
        state.down = false;
        state.lastMove = -Infinity;
    });
    window.addEventListener('wheel', () => handlers.onActivity?.('wheel', travelled), { passive: true });
    window.addEventListener('keydown', (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        handlers.onActivity?.('key', travelled);
    });

    return {
        state,
        // How long the current press has been held, 0..1.
        charge(now) {
            if (!state.down || !pressable) return 0;
            if (Math.hypot(state.x - downX, state.y - downY) >= PRESS_TRAVEL) return 0;
            return Math.min(1, (now - downAt) / T.pulseChargeMs);
        },
        idleMs(now) {
            return now - state.lastMove;
        }
    };
}
