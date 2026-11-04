export function initCRTEffects() {
    const screen = document.getElementById('crt-screen');
    const viewport = document.getElementById('crt-viewport');
    if (!screen || !viewport) return;

    screen.dataset.noise = 'retro';
    initScreenCurvature(viewport);

    const updateVisibility = () => {
        screen.classList.toggle('is-paused', document.hidden);
    };
    document.addEventListener('visibilitychange', updateVisibility);
    updateVisibility();

    if (new URLSearchParams(window.location.search).get('crt-preview') !== '1') return;

    const preview = document.createElement('details');
    preview.id = 'crt-preview';
    preview.open = true;
    preview.innerHTML = `
        <summary>CRT Preview</summary>
        <div class="crt-preview-controls">
            <label><input id="crt-enabled" type="checkbox" checked> CRT effects</label>
            <label><input id="crt-curved" type="checkbox" checked> Screen curvature</label>
            <label class="crt-noise-label" for="crt-noise-mode">Noise</label>
            <select id="crt-noise-mode">
                <option value="static">1. Static</option>
                <option value="subtle">2. Subtle motion</option>
                <option value="retro" selected>3. Retro</option>
            </select>
            <p>Preview only. Changes are not saved. Reduce Motion pauses animation.</p>
        </div>
    `;

    // Keep preview controls independent of the site's terminal shortcuts.
    preview.addEventListener('keydown', event => event.stopPropagation());
    preview.addEventListener('change', () => {
        const enabled = preview.querySelector('#crt-enabled').checked;
        const curved = preview.querySelector('#crt-curved').checked;
        screen.classList.toggle('is-disabled', !enabled);
        screen.classList.toggle('is-flat', !curved);
        viewport.classList.toggle('is-flat', !enabled || !curved);
        document.body.classList.toggle('crt-curvature-enabled', enabled && curved);
        screen.dataset.noise = preview.querySelector('#crt-noise-mode').value;
        window.dispatchEvent(new Event('crt-effects-changed'));
    });
    document.body.appendChild(preview);
}

function initScreenCurvature(viewport) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';
    svg.innerHTML = `
        <defs>
            <filter id="crt-curvature" x="0" y="0" width="100%" height="100%"
                color-interpolation-filters="sRGB">
                <feImage result="curve" preserveAspectRatio="none" x="0" y="0" width="100%" height="100%" />
                <feDisplacementMap in="SourceGraphic" in2="curve" xChannelSelector="R" yChannelSelector="G" />
            </filter>
        </defs>
    `;
    document.body.appendChild(svg);
    const map = svg.querySelector('feImage');
    const displacement = svg.querySelector('feDisplacementMap');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = canvas.height = 256;
    const pixels = ctx.createImageData(256, 256);

    // Inverse barrel map: preserve the center, bend the edges of the live DOM.
    for (let y = 0; y < 256; y++) {
        for (let x = 0; x < 256; x++) {
            const nx = x / 255 * 2 - 1;
            const ny = y / 255 * 2 - 1;
            const [dx, dy] = curveOffset(nx, ny);
            const i = (y * 256 + x) * 4;
            pixels.data[i] = Math.round(127.5 + 127.5 * dx);
            pixels.data[i + 1] = Math.round(127.5 + 127.5 * dy);
            pixels.data[i + 2] = 128;
            pixels.data[i + 3] = 255;
        }
    }
    ctx.putImageData(pixels, 0, 0);
    map.setAttribute('href', canvas.toDataURL());

    const updateStrength = () => {
        // Bound displacement to keep text and pointer targets close together.
        displacement.setAttribute('scale', window.innerWidth <= 768 ? '8' : '24');
    };
    updateStrength();
    window.addEventListener('resize', updateStrength);
    viewport.classList.add('has-curvature');
    document.body.classList.add('crt-curvature-enabled');
}

function curveOffset(nx, ny) {
    const edgeX = Math.min(1, Math.max(0, (Math.abs(nx) - 0.5) * 2));
    const edgeY = Math.min(1, Math.max(0, (Math.abs(ny) - 0.5) * 2));
    const bendX = edgeX * edgeX * (3 - 2 * edgeX);
    const bendY = edgeY * edgeY * (3 - 2 * edgeY);
    return [nx * ny * ny * bendX, ny * nx * nx * bendY];
}

// Match the DOM's curvature without filtering the animated canvas every frame.
export function getCurvedPoint(x, y, width, height) {
    const strength = width <= 768 ? 4 : 12;
    let px = x;
    let py = y;
    for (let i = 0; i < 2; i++) {
        const [dx, dy] = curveOffset(px / width * 2 - 1, py / height * 2 - 1);
        px = x - strength * dx;
        py = y - strength * dy;
    }
    return [px, py];
}
