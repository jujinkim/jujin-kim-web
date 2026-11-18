const FONT = "'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace";
const TRACKING = 0.06;
const FATTEN = 0.06;

let canvas = null;
let ctx = null;

// Rasterizes one line of text and returns points inside its glyphs as a flat
// Float32Array of x,y pairs in viewport coordinates.
//   box: { left, top, height, maxWidth } - where the DOM heading sits
//   want: roughly how many points to return
export function sampleText(text, box, want) {
    if (!canvas) {
        canvas = document.createElement('canvas');
        ctx = canvas.getContext('2d', { willReadFrequently: true });
    }
    const chars = [...text.toUpperCase()];
    let size = box.height;
    const pad = Math.ceil(size * 0.2);

    // Lay glyphs out by hand: canvas letter-spacing is not available everywhere.
    const layout = (fontSize) => {
        ctx.font = `400 ${fontSize}px ${FONT}`;
        const gap = fontSize * TRACKING;
        let x = 0;
        const xs = chars.map((ch) => {
            const at = x;
            x += ctx.measureText(ch).width + gap;
            return at;
        });
        return { xs, width: x - gap };
    };
    let line = layout(size);
    if (line.width > box.maxWidth) {
        size *= box.maxWidth / line.width;
        line = layout(size);
    }

    const w = Math.ceil(line.width + pad * 2);
    const h = Math.ceil(size * 1.3 + pad * 2);
    canvas.width = w;
    canvas.height = h;
    ctx.font = `400 ${size}px ${FONT}`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = size * FATTEN;
    ctx.lineJoin = 'round';
    const baseline = pad + size * 0.86;
    chars.forEach((ch, i) => {
        ctx.fillText(ch, pad + line.xs[i], baseline);
        ctx.strokeText(ch, pad + line.xs[i], baseline);
    });

    const alpha = ctx.getImageData(0, 0, w, h).data;
    let area = 0;
    for (let i = 3; i < alpha.length; i += 4) if (alpha[i] > 127) area++;
    if (!area) return new Float32Array(0);

    // A jittered grid spreads points evenly; pure random sampling clumps.
    const step = Math.max(0.6, Math.sqrt(area / want));
    const out = [];
    const originX = box.left - pad;
    const originY = box.top + (box.height - size) / 2 - pad;
    for (let y = step / 2; y < h; y += step) {
        for (let x = step / 2; x < w; x += step) {
            const jx = x + (Math.random() - 0.5) * step * 0.9;
            const jy = y + (Math.random() - 0.5) * step * 0.9;
            const ix = Math.min(w - 1, Math.max(0, jx | 0));
            const iy = Math.min(h - 1, Math.max(0, jy | 0));
            if (alpha[(iy * w + ix) * 4 + 3] > 127) out.push(originX + jx, originY + jy);
        }
    }
    return new Float32Array(out);
}

// A soft round cluster, used for the dormant knot.
export function sampleKnot(cx, cy, radius, count) {
    const out = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = radius * Math.sqrt(-Math.log(1 - Math.random() * 0.95)) * 0.6;
        out[i * 2] = cx + Math.cos(a) * r;
        out[i * 2 + 1] = cy + Math.sin(a) * r;
    }
    return out;
}
