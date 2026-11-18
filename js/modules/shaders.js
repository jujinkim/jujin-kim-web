// GLSL ES 3.00. One fullscreen triangle is shared by every screen-space pass.

export const SCREEN_VERT = `#version 300 es
out vec2 vUv;
void main() {
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    vUv = p;
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export const POINT_VERT = `#version 300 es
layout(location = 0) in vec4 aParticle; // x, y, brightness, hue
uniform vec2 uRes;
uniform float uDpr;
uniform float uGain;
uniform vec2 uSize;
uniform vec3 uRamp[5];
out vec3 vColor;
float hash(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
void main() {
    vec2 c = aParticle.xy / uRes * 2.0 - 1.0;
    gl_Position = vec4(c.x, -c.y, 0.0, 1.0);
    float r = hash(float(gl_VertexID));
    float size = mix(uSize.x, uSize.y, r * r * r);
    gl_PointSize = size * uDpr * 2.2 + 1.0;
    float t = clamp(aParticle.w, 0.0, 1.0) * 4.0;
    int i = int(min(floor(t), 3.0));
    vec3 col = mix(uRamp[i], uRamp[i + 1], t - float(i));
    // Small points carry the same light as large ones, just tighter.
    vColor = col * aParticle.z * uGain * (0.55 + 0.45 * uSize.x / size);
}`;

export const POINT_FRAG = `#version 300 es
precision highp float;
in vec3 vColor;
out vec4 outColor;
void main() {
    vec2 q = gl_PointCoord * 2.0 - 1.0;
    outColor = vec4(vColor * exp(-dot(q, q) * 3.4), 1.0);
}`;

// Fades the trail and lets it bleed a little into its neighbours, like ink.
export const DECAY_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uPx;
uniform float uKeep;
uniform float uBleed;
uniform float uFloor;
in vec2 vUv;
out vec4 outColor;
void main() {
    vec3 c = texture(uTex, vUv).rgb;
    vec3 n = texture(uTex, vUv + vec2(uPx.x, 0.0)).rgb
           + texture(uTex, vUv - vec2(uPx.x, 0.0)).rgb
           + texture(uTex, vUv + vec2(0.0, uPx.y)).rgb
           + texture(uTex, vUv - vec2(0.0, uPx.y)).rgb;
    outColor = vec4(max(mix(c, n * 0.25, uBleed) * uKeep - uFloor, 0.0), 1.0);
}`;

export const DOWN_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uPx;
in vec2 vUv;
out vec4 outColor;
void main() {
    outColor = 0.25 * (texture(uTex, vUv + uPx) + texture(uTex, vUv - uPx)
                     + texture(uTex, vUv + vec2(uPx.x, -uPx.y)) + texture(uTex, vUv + vec2(-uPx.x, uPx.y)));
}`;

export const BLUR_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uStep;
in vec2 vUv;
out vec4 outColor;
void main() {
    vec4 c = texture(uTex, vUv) * 0.227027;
    c += (texture(uTex, vUv + uStep) + texture(uTex, vUv - uStep)) * 0.1945946;
    c += (texture(uTex, vUv + uStep * 2.0) + texture(uTex, vUv - uStep * 2.0)) * 0.1216216;
    c += (texture(uTex, vUv + uStep * 3.0) + texture(uTex, vUv - uStep * 3.0)) * 0.054054;
    c += (texture(uTex, vUv + uStep * 4.0) + texture(uTex, vUv - uStep * 4.0)) * 0.016216;
    outColor = c;
}`;

export const COMPOSITE_FRAG = `#version 300 es
precision highp float;
uniform sampler2D uTrail;
uniform sampler2D uNear;
uniform sampler2D uFar;
uniform vec2 uBloom;
uniform float uExposure;
uniform float uAspect;
uniform vec3 uGround;
uniform vec2 uRes;
uniform vec4 uShade; // reading column in CSS px: left, top, right, bottom
uniform vec2 uShadeK; // strength, feather in px
uniform vec4 uPulse[4]; // x, y, radius, strength
uniform vec3 uEmber;
uniform float uWhiteAt;
in vec2 vUv;
out vec4 outColor;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
    vec3 light = texture(uTrail, vUv).rgb
               + texture(uNear, vUv).rgb * uBloom.x
               + texture(uFar, vUv).rgb * uBloom.y;
    vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uRes;
    // Pulse fronts: a sharp crest with a wake that thins out behind it.
    // Drawn analytically so they are smooth at any frame rate.
    for (int i = 0; i < 4; i++) {
        float k = uPulse[i].w;
        if (k <= 0.0) continue;
        float r = uPulse[i].z;
        float d = distance(p, uPulse[i].xy) - r;
        float wake = exp(min(d, 0.0) / (r * 0.16 + 10.0)) * (1.0 - smoothstep(-1.0, 2.5, d));
        float crest = exp(-d * d / 9.0);
        light += uEmber * k * (wake * 0.5 + crest * 1.6);
    }
    // The swarm dims where there is text to read.
    float outside = length(max(max(uShade.xy - p, p - uShade.zw), 0.0));
    light *= 1.0 - uShadeK.x * (1.0 - smoothstep(0.0, uShadeK.y, outside));
    // Tone-map brightness, not each channel, so colours stay saturated;
    // only the hottest cores wash out to white.
    float peak = max(max(light.r, light.g), light.b) + 1e-5;
    float mapped = 1.0 - exp(-peak * uExposure);
    vec3 c = light / peak * mapped;
    c = mix(c, vec3(mapped), 0.6 * smoothstep(uWhiteAt * 0.3, uWhiteAt, peak * uExposure));
    vec2 q = (vUv - 0.5) * vec2(max(uAspect, 1.0), max(1.0 / uAspect, 1.0));
    float vignette = smoothstep(1.05, 0.25, length(q));
    vec3 ground = uGround * (0.55 + 0.75 * vignette);
    c = ground + c * (0.72 + 0.28 * vignette);
    c += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
    outColor = vec4(c, 1.0);
}`;
