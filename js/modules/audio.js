// Everything is synthesized; there are no audio files. The AudioContext is
// only created by enable(), which must be called from a user gesture.

const MASTER = 0.2;
const PENTATONIC = [220, 246.94, 293.66, 329.63, 392, 440, 493.88, 587.33];

function noiseBuffer(ctx, seconds, shape) {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);
        for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * shape(i / length);
    }
    return buffer;
}

export function createAudio() {
    let ctx = null;
    let master = null;
    let wet = null;
    let droneFilter = null;
    let moveFilter = null;
    let moveGain = null;
    let enabled = false;

    function build() {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) return false;
        ctx = new Context();

        master = ctx.createGain();
        master.gain.value = 0;
        const compressor = ctx.createDynamicsCompressor();
        master.connect(compressor).connect(ctx.destination);

        // A generated impulse response stands in for a room.
        const reverb = ctx.createConvolver();
        reverb.buffer = noiseBuffer(ctx, 3, (t) => (1 - t) ** 2.6);
        wet = ctx.createGain();
        wet.gain.value = 0.55;
        wet.connect(reverb).connect(master);

        // Drone: two low fifths, slightly detuned, breathing through a lowpass.
        droneFilter = ctx.createBiquadFilter();
        droneFilter.type = 'lowpass';
        droneFilter.frequency.value = 220;
        droneFilter.Q.value = 0.6;
        const droneGain = ctx.createGain();
        droneGain.gain.value = 0.5;
        droneFilter.connect(droneGain);
        droneGain.connect(master);
        droneGain.connect(wet);
        for (const [frequency, type, detune, level] of [
            [55, 'sine', -4, 0.9],
            [55, 'triangle', 5, 0.35],
            [82.41, 'sine', 3, 0.5],
            [82.41, 'triangle', -6, 0.2]
        ]) {
            const osc = ctx.createOscillator();
            osc.type = type;
            osc.frequency.value = frequency;
            osc.detune.value = detune;
            const gain = ctx.createGain();
            gain.gain.value = level;
            osc.connect(gain).connect(droneFilter);
            osc.start();
        }

        // Movement: filtered noise that rises with the visitor's speed.
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer(ctx, 2, () => 1);
        noise.loop = true;
        moveFilter = ctx.createBiquadFilter();
        moveFilter.type = 'bandpass';
        moveFilter.frequency.value = 400;
        moveFilter.Q.value = 1.4;
        moveGain = ctx.createGain();
        moveGain.gain.value = 0;
        noise.connect(moveFilter).connect(moveGain);
        moveGain.connect(master);
        moveGain.connect(wet);
        noise.start();
        return true;
    }

    function voice(type, from, to, seconds, level, dry) {
        if (!enabled) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(from, now);
        if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, now + seconds);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(level, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
        osc.connect(gain);
        gain.connect(wet);
        if (dry) gain.connect(master);
        osc.start(now);
        osc.stop(now + seconds + 0.05);
    }

    return {
        get enabled() {
            return enabled;
        },
        // Must be called from a click or key handler.
        enable() {
            if (!ctx && !build()) return false;
            ctx.resume();
            enabled = true;
            master.gain.cancelScheduledValues(ctx.currentTime);
            master.gain.setTargetAtTime(MASTER, ctx.currentTime, 0.7);
            return true;
        },
        disable() {
            if (!ctx) return;
            enabled = false;
            master.gain.cancelScheduledValues(ctx.currentTime);
            master.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
        },
        suspend() {
            if (ctx && enabled) ctx.suspend();
        },
        resume() {
            if (ctx && enabled) ctx.resume();
        },
        // energy: light speed in px/s. breath: -1..1, in phase with the visual.
        update(energy, breath) {
            if (!enabled) return;
            const now = ctx.currentTime;
            const amount = Math.min(1, energy / 1400);
            droneFilter.frequency.setTargetAtTime(210 + 90 * breath + 260 * amount, now, 0.4);
            moveFilter.frequency.setTargetAtTime(300 + 2100 * amount, now, 0.12);
            moveGain.gain.setTargetAtTime(0.16 * amount * amount, now, 0.18);
        },
        // A soft ping each generation; the pitch walks a pentatonic scale.
        tick(generation) {
            voice('sine', PENTATONIC[generation % PENTATONIC.length], PENTATONIC[generation % PENTATONIC.length], 0.9, 0.11, false);
        },
        thump(charge) {
            voice('sine', 90 + 30 * charge, 40, 0.5 + 0.4 * charge, 0.5, true);
        }
    };
}
