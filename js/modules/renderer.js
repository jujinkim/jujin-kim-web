import { TUNING as T, RAMP } from './config.js?v=20261119.11';
import {
    SCREEN_VERT,
    POINT_VERT,
    POINT_FRAG,
    DECAY_FRAG,
    DOWN_FRAG,
    BLUR_FRAG,
    COMPOSITE_FRAG
} from './shaders.js?v=20261119.11';

const CONTEXT_OPTIONS = {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance'
};

function compile(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
}

function program(gl, vert, frag, names) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vert));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    for (const name of names) u[name] = gl.getUniformLocation(p, name);
    return { p, u };
}

// Returns null when WebGL2 is unavailable; the caller falls back to a static frame.
export function createRenderer(canvas, maxN, options = {}) {
    const gl = canvas.getContext('webgl2', CONTEXT_OPTIONS);
    if (!gl) return null;

    let res = null;
    let half = false;
    let cssW = 1;
    let cssH = 1;
    let dpr = 1;
    let trailScale = 1;
    let farBloom = true;
    let lost = false;
    const pulseData = new Float32Array(16);

    function target(w, h) {
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        if (half) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
        else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        return { tex, fbo, w, h, ok };
    }

    function free(t) {
        if (!t) return;
        gl.deleteTexture(t.tex);
        gl.deleteFramebuffer(t.fbo);
    }

    // Half-float targets keep faint trails smooth. They are only used when the
    // browser can really render to and read back from one.
    function probeHalfFloat() {
        if (options.forceRGBA8) return false;
        if (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float'))
            return false;
        half = true;
        const t = target(4, 4);
        let ok = t.ok;
        if (ok) {
            gl.clearColor(2, 0.5, 0.25, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);
            const px = new Float32Array(4);
            gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, px);
            ok = gl.getError() === gl.NO_ERROR && Math.abs(px[0] - 2) < 0.01;
        }
        free(t);
        half = false;
        return ok;
    }

    function createResources() {
        half = probeHalfFloat();
        const r = {
            points: program(gl, POINT_VERT, POINT_FRAG, ['uRes', 'uDpr', 'uGain', 'uSize', 'uRamp']),
            decay: program(gl, SCREEN_VERT, DECAY_FRAG, ['uTex', 'uPx', 'uKeep', 'uBleed', 'uFloor']),
            down: program(gl, SCREEN_VERT, DOWN_FRAG, ['uTex', 'uPx']),
            blur: program(gl, SCREEN_VERT, BLUR_FRAG, ['uTex', 'uStep']),
            composite: program(gl, SCREEN_VERT, COMPOSITE_FRAG, [
                'uTrail',
                'uNear',
                'uFar',
                'uBloom',
                'uExposure',
                'uAspect',
                'uRes',
                'uShade',
                'uShadeK',
                'uPulse',
                'uEmber',
                'uWhiteAt'
            ]),
            vao: gl.createVertexArray(),
            empty: gl.createVertexArray(),
            buffer: gl.createBuffer(),
            targets: null
        };
        gl.bindVertexArray(r.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, r.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, maxN * 16, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
        gl.bindVertexArray(null);
        gl.useProgram(r.points.p);
        gl.uniform3fv(r.points.u.uRamp, new Float32Array(RAMP.flat()));
        gl.disable(gl.DEPTH_TEST);
        res = r;
        allocate();
    }

    function allocate() {
        if (!res) return;
        const t = res.targets;
        if (t) for (const key of Object.keys(t)) free(t[key]);
        const w = Math.max(2, Math.round(canvas.width * trailScale));
        const h = Math.max(2, Math.round(canvas.height * trailScale));
        const qw = Math.max(2, w >> 2);
        const qh = Math.max(2, h >> 2);
        const ew = Math.max(2, w >> 3);
        const eh = Math.max(2, h >> 3);
        res.targets = {
            a: target(w, h),
            b: target(w, h),
            near: target(qw, qh),
            nearTmp: target(qw, qh),
            far: target(ew, eh),
            farTmp: target(ew, eh)
        };
    }

    function resize(width, height, ratio) {
        cssW = width;
        cssH = height;
        dpr = ratio;
        canvas.width = Math.max(2, Math.round(width * ratio));
        canvas.height = Math.max(2, Math.round(height * ratio));
        allocate();
    }

    function setQuality(next) {
        if (next.trailScale !== undefined && next.trailScale !== trailScale) {
            trailScale = next.trailScale;
            allocate();
        }
        if (next.farBloom !== undefined) farBloom = next.farBloom;
    }

    function pass(prog, dest) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, dest ? dest.fbo : null);
        gl.viewport(0, 0, dest ? dest.w : canvas.width, dest ? dest.h : canvas.height);
        gl.useProgram(prog.p);
    }

    function bind(unit, t) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, t.tex);
    }

    function blur(src, tmp) {
        pass(res.blur, tmp);
        bind(0, src);
        gl.uniform1i(res.blur.u.uTex, 0);
        gl.uniform2f(res.blur.u.uStep, 1 / src.w, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        pass(res.blur, src);
        bind(0, tmp);
        gl.uniform2f(res.blur.u.uStep, 0, 1 / src.h);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    // frame: { dt, time, tau, pulses }
    function draw(data, count, frame) {
        if (lost || !res) return;
        const t = res.targets;
        const dt = frame.dt;
        // 8-bit targets need larger steps to register at all, so they run hotter
        // and clip sooner; the exposure below compensates.
        const gainScale = half ? 1 : 1.5;

        // 1. Fade the previous trail into the back buffer.
        gl.disable(gl.BLEND);
        gl.bindVertexArray(res.empty);
        pass(res.decay, t.b);
        bind(0, t.a);
        gl.uniform1i(res.decay.u.uTex, 0);
        gl.uniform2f(res.decay.u.uPx, 1 / t.a.w, 1 / t.a.h);
        gl.uniform1f(res.decay.u.uKeep, Math.exp(-dt / frame.tau));
        gl.uniform1f(res.decay.u.uBleed, T.bleed);
        // Multiplying alone never reaches zero in 8 bits; subtract a little too.
        gl.uniform1f(res.decay.u.uFloor, half ? 0 : 0.6 / 255);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        // 2. Add this frame's light on top.
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.useProgram(res.points.p);
        gl.bindVertexArray(res.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, res.buffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, count * 4);
        gl.uniform2f(res.points.u.uRes, cssW, cssH);
        gl.uniform1f(res.points.u.uDpr, dpr * trailScale);
        gl.uniform1f(res.points.u.uGain, T.deposit * dt * gainScale * (frame.gain ?? 1));
        gl.uniform2f(res.points.u.uSize, T.pointMin, T.pointMax);
        gl.drawArrays(gl.POINTS, 0, count);
        gl.disable(gl.BLEND);
        gl.bindVertexArray(res.empty);

        // 3. Two bloom levels.
        pass(res.down, t.near);
        bind(0, t.b);
        gl.uniform1i(res.down.u.uTex, 0);
        gl.uniform2f(res.down.u.uPx, 1 / t.b.w, 1 / t.b.h);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        blur(t.near, t.nearTmp);
        if (farBloom) {
            pass(res.down, t.far);
            bind(0, t.near);
            gl.uniform2f(res.down.u.uPx, 0.5 / t.near.w, 0.5 / t.near.h);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            blur(t.far, t.farTmp);
            blur(t.far, t.farTmp);
        }

        // 4. Composite to the screen.
        pass(res.composite, null);
        bind(0, t.b);
        bind(1, t.near);
        bind(2, farBloom ? t.far : t.near);
        const u = res.composite.u;
        gl.uniform1i(u.uTrail, 0);
        gl.uniform1i(u.uNear, 1);
        gl.uniform1i(u.uFar, 2);
        gl.uniform2f(u.uBloom, T.bloomNear, farBloom ? T.bloomFar : T.bloomFar * 0.5);
        const breath = 1 + T.breathDepth * Math.sin(frame.time * Math.PI * 2 * T.breathHz);
        gl.uniform1f(u.uExposure, (T.exposure * breath) / gainScale);
        gl.uniform1f(u.uAspect, cssW / cssH);
        gl.uniform2f(u.uRes, cssW, cssH);
        for (let i = 0; i < 4; i++) {
            const p = frame.pulses[i];
            const fade = p.live ? Math.max(0, 1 - p.t / T.pulseLife) : 0;
            pulseData[i * 4] = p.x;
            pulseData[i * 4 + 1] = p.y;
            pulseData[i * 4 + 2] = p.r;
            pulseData[i * 4 + 3] = fade * fade * T.ringGlow;
        }
        gl.uniform4fv(u.uPulse, pulseData);
        gl.uniform3f(u.uEmber, RAMP[4][0], RAMP[4][1], RAMP[4][2]);
        gl.uniform1f(u.uWhiteAt, T.whiteAt);
        const shade = frame.shade;
        if (shade) gl.uniform4f(u.uShade, shade.left, shade.top, shade.right, shade.bottom);
        gl.uniform2f(u.uShadeK, shade ? shade.strength : 0, T.shadeFeather);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        const front = t.b;
        t.b = t.a;
        t.a = front;
    }

    canvas.addEventListener('webglcontextlost', (event) => {
        event.preventDefault();
        lost = true;
        res = null;
        options.onLost?.();
    });
    canvas.addEventListener('webglcontextrestored', () => {
        lost = false;
        createResources();
        options.onRestored?.();
    });

    createResources();

    return {
        resize,
        draw,
        setQuality,
        get halfFloat() {
            return half;
        },
        get lost() {
            return lost;
        },
        loseContext() {
            gl.getExtension('WEBGL_lose_context')?.loseContext();
        }
    };
}
