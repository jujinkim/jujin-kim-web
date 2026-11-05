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
    const glass = document.querySelector('.crt-glass');
    const header = document.getElementById('terminal-header');
    const menu = document.getElementById('terminal-menu');
    const footer = document.getElementById('terminal-footer');
    const container = document.getElementById('terminal-container');
    if (!glass || !header || !menu || !footer || !container) return;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'crt-curvature-frame';
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const path = document.createElementNS(svg.namespaceURI, 'path');
    svg.appendChild(path);
    glass.appendChild(svg);
    let pendingFrame;

    const update = () => {
        pendingFrame = null;
        const width = window.innerWidth;
        const height = window.innerHeight;
        const headerBounds = header.getBoundingClientRect();
        const menuBounds = menu.getBoundingClientRect();
        const footerBounds = footer.getBoundingClientRect();
        const bounds = container.getBoundingClientRect();
        const inset = width <= 768 ? 4 : 16;
        const point = (x, y) => getCurvedPoint(x, y, width, height);
        const format = values => values.map(value => value.toFixed(2)).join(' ');
        const curve = (x1, y1, x2, y2) => {
            const start = point(x1, y1);
            const end = point(x2, y2);
            const middle = point((x1 + x2) / 2, (y1 + y2) / 2);
            const control = middle.map((value, i) => 2 * value - (start[i] + end[i]) / 2);
            return `M ${format(start)} Q ${format(control)} ${format(end)}`;
        };

        // Draw only the glass frame on resize; scrolling text never enters a pixel filter.
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        path.setAttribute('d', [
            curve(inset, menuBounds.top, width - inset, menuBounds.top),
            curve(inset, headerBounds.bottom, width - inset, headerBounds.bottom),
            curve(inset, footerBounds.top, width - inset, footerBounds.top),
            curve(bounds.left, headerBounds.bottom, bounds.left, footerBounds.top),
            curve(bounds.right, headerBounds.bottom, bounds.right, footerBounds.top)
        ].join(' '));
    };
    const scheduleUpdate = () => {
        if (pendingFrame == null) pendingFrame = requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(scheduleUpdate);
    [header, menu, footer, container].forEach(element => observer.observe(element));
    window.addEventListener('resize', scheduleUpdate);
    viewport.classList.add('has-curvature');
    document.body.classList.toggle('crt-curvature-enabled', !viewport.classList.contains('is-flat'));
    scheduleUpdate();
}
