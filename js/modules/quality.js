const WINDOW_MS = 2000;
const STARTUP_GRACE_MS = 3000;
const SLOW_FPS = 55;
const SLOW_P95_MS = 25;
const MAX_SAMPLES = 512;

// Watches frame intervals and calls onSlow() after two slow windows in a row.
// A steady ~33ms interval is a 30Hz display cap (low power mode), not slowness.
export function createQuality(onSlow) {
    const samples = new Float32Array(MAX_SAMPLES);
    const sorted = new Float32Array(MAX_SAMPLES);
    let count = 0;
    let elapsed = 0;
    let slowWindows = 0;
    let ignoreUntil = performance.now() + STARTUP_GRACE_MS;
    let last = { fps: 0, p95: 0, slow: false, capped: false };

    function close() {
        if (count < 20) return reset();
        let sum = 0;
        for (let i = 0; i < count; i++) sum += samples[i];
        const mean = sum / count;
        let variance = 0;
        for (let i = 0; i < count; i++) variance += (samples[i] - mean) ** 2;
        const deviation = Math.sqrt(variance / count);
        sorted.set(samples.subarray(0, count));
        const view = sorted.subarray(0, count).sort();
        const p95 = view[Math.min(count - 1, Math.floor(count * 0.95))];
        const fps = 1000 / mean;
        const capped = mean > 30 && mean < 36 && deviation < 3;
        const slow = !capped && (fps < SLOW_FPS || p95 > SLOW_P95_MS);
        last = { fps, p95, slow, capped };
        slowWindows = slow ? slowWindows + 1 : 0;
        reset();
        if (slowWindows >= 2) {
            slowWindows = 0;
            onSlow(last);
        }
    }

    function reset() {
        count = 0;
        elapsed = 0;
    }

    return {
        // Call once per rendered frame with the time since the previous one.
        frame(now, intervalMs) {
            if (now < ignoreUntil) return;
            if (count < MAX_SAMPLES) samples[count++] = intervalMs;
            elapsed += intervalMs;
            if (elapsed >= WINDOW_MS) close();
        },
        // Ignore the next stretch: resizes and tab switches are not the swarm's fault.
        exclude(ms = 1500) {
            ignoreUntil = performance.now() + ms;
            slowWindows = 0;
            reset();
        },
        get last() {
            return last;
        }
    };
}
