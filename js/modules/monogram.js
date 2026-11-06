const SVG_NS = 'http://www.w3.org/2000/svg';

export function initMonogram() {
    const art = document.getElementById('hero-art');
    const svg = document.getElementById('jk-monogram');
    const group = document.getElementById('monogram-lines');
    if (!art || !svg || !group) return;

    const shape = document.querySelector('#jk-clip path').getAttribute('d');
    const bands = [];
    group.removeAttribute('clip-path');
    group.replaceChildren();
    for (let y = 112; y < 492; y += 12) {
        const band = document.createElementNS(SVG_NS, 'svg');
        band.setAttribute('y', y);
        band.setAttribute('width', '630');
        band.setAttribute('height', '7');
        band.setAttribute('viewBox', `0 ${y} 630 7`);
        band.setAttribute('preserveAspectRatio', 'none');
        band.style.overflow = 'hidden';
        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', shape);
        band.append(path);
        group.append(band);
        bands.push({ band, path, y, height: 7, offset: 0 });
    }

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = window.matchMedia('(min-width: 769px) and (pointer: fine)');
    const mobile = window.matchMedia('(max-width: 768px), (pointer: coarse)');
    const crosshair = svg.querySelector('.art-crosshair');
    const hint = art.querySelector('.art-interaction');
    const desktopHint = hint.innerHTML;
    let visible = true;
    let frame = 0;
    let x = 0;
    let targetX = 0;
    let pointerY = 300;
    let releaseTimer;

    const active = () => visible && !document.hidden && !motion.matches && (pointer.matches || mobile.matches);
    const render = () => {
        frame = 0;
        if (!active()) {
            clearTimeout(releaseTimer);
            x = targetX = 0;
            bands.forEach(state => {
                if (state.height !== 7) state.band.setAttribute('height', '7');
                if (state.offset !== 0) state.path.removeAttribute('transform');
                state.height = 7;
                state.offset = 0;
            });
            if (art.dataset.motion !== 'static') art.dataset.motion = 'static';
            crosshair.removeAttribute('transform');
            return;
        }
        const mode = mobile.matches ? 'ambient' : 'active';
        if (art.dataset.motion !== mode) art.dataset.motion = mode;
        x += (targetX - x) * 0.12;
        const hero = document.getElementById('home');
        const progress = Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / hero.offsetHeight));
        bands.forEach(state => {
            const { band, path, y } = state;
            const influence = Math.exp(-Math.pow((y - pointerY) / 115, 2));
            const offset = x * influence * Math.sin(y * 0.017 + x * 0.015);
            const height = mobile.matches ? 7 : +(7 - progress * 3.5).toFixed(2);
            if (Math.abs(offset - state.offset) > 0.02) {
                path.setAttribute('transform', `translate(${offset.toFixed(2)} 0)`);
                state.offset = offset;
            }
            if (state.height !== height) {
                band.setAttribute('height', height);
                state.height = height;
            }
        });
        if (mobile.matches) {
            const transform = `translate(${(x * 1.5).toFixed(2)} ${(pointerY - 300).toFixed(2)})`;
            if (crosshair.getAttribute('transform') !== transform) crosshair.setAttribute('transform', transform);
        } else if (crosshair.hasAttribute('transform')) crosshair.removeAttribute('transform');
        if (Math.abs(targetX - x) > 0.05) frame = requestAnimationFrame(render);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(render); };
    const updatePointer = event => {
        if (!active()) return;
        const box = svg.getBoundingClientRect();
        clearTimeout(releaseTimer);
        const distance = (event.clientX - box.left) / box.width - 0.5;
        targetX = distance * 80 + (mobile.matches ? (Math.sign(distance) || 1) * 24 : 0);
        pointerY = (event.clientY - box.top) / box.height * 600;
        schedule();
    };
    art.addEventListener('pointerdown', updatePointer, { passive: true });
    art.addEventListener('pointermove', updatePointer, { passive: true });
    const releasePointer = () => {
        clearTimeout(releaseTimer);
        if (mobile.matches) releaseTimer = setTimeout(() => { targetX = 0; schedule(); }, 220);
        else { targetX = 0; schedule(); }
    };
    art.addEventListener('pointerleave', releasePointer);
    art.addEventListener('pointerup', releasePointer);
    art.addEventListener('pointercancel', releasePointer);
    window.addEventListener('scroll', () => { if (active()) schedule(); }, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    const refresh = () => {
        cancelAnimationFrame(frame);
        frame = 0;
        hint.innerHTML = mobile.matches ? 'TOUCH TO EXPLORE <span aria-hidden="true">↗</span>' : desktopHint;
        render();
    };
    document.addEventListener('visibilitychange', refresh);
    motion.addEventListener('change', refresh);
    pointer.addEventListener('change', refresh);
    mobile.addEventListener('change', refresh);
    new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        refresh();
    }).observe(art);
    refresh();
}
