import { RAMP, GROUND } from './config.js?v=20261119.1';

const rgb = (c, a) => `rgba(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)}, ${a})`;

// Small deterministic generator so the still looks the same on every load.
function mulberry(seed) {
    return () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// One still frame of the swarm on a 2D canvas: the fallback for reduced
// motion, missing WebGL2, a lost context, or a device that cannot keep up.
export function renderStatic(host) {
    let canvas = document.getElementById('still');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'still';
        canvas.setAttribute('aria-hidden', 'true');
        host.after(canvas);
    }
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = rgb(GROUND, 1);
    ctx.fillRect(0, 0, w, h);

    const random = mulberry(20161119);
    const unit = Math.min(w, h);
    ctx.globalCompositeOperation = 'lighter';

    // A few slow arcs of drifting particles, off to the side of the text.
    const arcs = 5;
    for (let a = 0; a < arcs; a++) {
        const cx = w * (0.62 + (random() - 0.5) * 0.5);
        const cy = h * (0.5 + (random() - 0.5) * 0.6);
        const radius = unit * (0.18 + random() * 0.3);
        const start = random() * Math.PI * 2;
        const sweep = 1.2 + random() * 2.2;
        const color = RAMP[Math.floor(random() * 3)];
        const dots = Math.round(1400 * Math.min(1.6, (w * h) / 9e5));
        for (let i = 0; i < dots; i++) {
            const t = random();
            const angle = start + t * sweep;
            const spread = (random() + random() + random() - 1.5) * unit * 0.09;
            const x = cx + Math.cos(angle) * (radius + spread);
            const y = cy + Math.sin(angle) * (radius + spread) * 0.8;
            ctx.fillStyle = rgb(color, 0.1 + 0.45 * random() * Math.sin(t * Math.PI));
            ctx.beginPath();
            ctx.arc(x, y, 0.5 + random() * 1.1, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Dim the left side so text stays readable, and close with a vignette.
    ctx.globalCompositeOperation = 'source-over';
    const veil = ctx.createLinearGradient(0, 0, w * 0.75, 0);
    veil.addColorStop(0, rgb(GROUND, 0.9));
    veil.addColorStop(1, rgb(GROUND, 0));
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, w, h);
    const vignette = ctx.createRadialGradient(w / 2, h / 2, unit * 0.3, w / 2, h / 2, Math.hypot(w, h) * 0.6);
    vignette.addColorStop(0, rgb(GROUND, 0));
    vignette.addColorStop(1, rgb(GROUND, 0.85));
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
}
