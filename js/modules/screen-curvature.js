const MAX_MAP_PIXELS = 8_388_608;
const getStrength = width => width <= 768 ? 6 : 28;

function curveOffset(nx, ny) {
    return [nx * ny * ny, ny * nx * nx];
}

export function getCurvedPoint(x, y, width, height) {
    const strength = getStrength(width);
    let px = x;
    let py = y;
    for (let i = 0; i < 4; i++) {
        const [dx, dy] = curveOffset(px / width * 2 - 1, py / height * 2 - 1);
        px = x - strength * dx;
        py = y - strength * dy;
    }
    return [px, py];
}

export function initScreenCurvature(viewport) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';
    svg.innerHTML = '<defs><filter id="crt-curvature" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"></filter></defs>';
    document.body.appendChild(svg);
    const filter = svg.querySelector('filter');
    let resizeTimer;
    let lastSize = '';

    const update = () => {
        const width = Math.max(1, window.innerWidth);
        const height = Math.max(1, window.innerHeight);
        let density = window.devicePixelRatio || 1;
        while (width * height * density * density > MAX_MAP_PIXELS) density /= 2;
        const size = `${width}:${height}:${density}`;
        if (size === lastSize) return;
        const maps = createSamplingMaps(width, height, density);
        if (!maps) return;
        const scale = (getStrength(width) + 1 / density) * 2;
        const step = 1 / density;
        const image = (href, result) => `<feImage href="${href}" result="${result}" x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" />`;
        const sources = ['SourceGraphic', 'shift-x', 'shift-y', 'shift-xy'];
        const weightChannels = ['1 0 0 0 0', '0 1 0 0 0', '0 0 1 0 0', '-1 -1 -1 0 1'];
        let graph = image(maps[0], 'integer-map') + image(maps[1], 'weights');
        graph += `<feOffset in="SourceGraphic" dx="${-step}" dy="0" result="shift-x" />
            <feOffset in="SourceGraphic" dx="0" dy="${-step}" result="shift-y" />
            <feOffset in="SourceGraphic" dx="${-step}" dy="${-step}" result="shift-xy" />`;
        for (let i = 0; i < 4; i++) {
            graph += `<feColorMatrix in="weights" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${weightChannels[i]}" result="weight-${i}" />`;
            graph += `<feDisplacementMap in="${sources[i]}" in2="integer-map" scale="${scale}" xChannelSelector="R" yChannelSelector="G" result="sample-${i}" />
                <feComposite in="sample-${i}" in2="weight-${i}" operator="in" result="weighted-${i}" />`;
        }
        graph += `<feComposite in="weighted-0" in2="weighted-1" operator="arithmetic" k2="1" k3="1" result="sum-x" />
            <feComposite in="weighted-2" in2="weighted-3" operator="arithmetic" k2="1" k3="1" result="sum-y" />
            <feComposite in="sum-x" in2="sum-y" operator="arithmetic" k2="1" k3="1" />`;
        filter.innerHTML = graph;
        viewport.classList.add('has-curvature');
        document.body.classList.toggle('crt-curvature-enabled', !viewport.classList.contains('is-flat'));
        lastSize = size;
    };
    update();
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(update, 120);
    });
}

function createSamplingMaps(width, height, density) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * density));
    canvas.height = Math.max(1, Math.round(height * density));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const images = Array.from({ length: 2 }, () => ctx.createImageData(canvas.width, canvas.height));
    const data = images.map(image => image.data);
    const strength = getStrength(width);
    const scale = (strength + 1 / density) * 2;

    // Four neighboring samples provide bilinear interpolation instead of nearest-pixel jumps.
    // Pack three weights in RGB; the fourth is their remainder, preserving brightness.
    for (let y = 0; y < canvas.height; y++) {
        const ny = (y + 0.5) / canvas.height * 2 - 1;
        for (let x = 0; x < canvas.width; x++) {
            const nx = (x + 0.5) / canvas.width * 2 - 1;
            const [offsetX, offsetY] = curveOffset(nx, ny);
            const dx = strength * offsetX * density;
            const dy = strength * offsetY * density;
            const ix = Math.floor(dx);
            const iy = Math.floor(dy);
            const fx = dx - ix;
            const fy = dy - iy;
            const i = (y * canvas.width + x) * 4;
            // Keep quantized coordinates inside the pixel for both floor and nearest samplers.
            data[0][i] = Math.round(((ix + 0.25) / density / scale + 0.5) * 255);
            data[0][i + 1] = Math.round(((iy + 0.25) / density / scale + 0.5) * 255);
            data[0][i + 3] = 255;
            data[1][i] = Math.floor((1 - fx) * (1 - fy) * 255);
            data[1][i + 1] = Math.floor(fx * (1 - fy) * 255);
            data[1][i + 2] = Math.floor((1 - fx) * fy * 255);
            data[1][i + 3] = 255;
        }
    }
    return images.map(image => {
        ctx.putImageData(image, 0, 0);
        return canvas.toDataURL();
    });
}
