import { SECTIONS, LEGACY_HASHES } from './config.js?v=20261119.1';

const scrollPositions = new Map();
let links = [];
let current = null;
let onChange = () => {};

function resolve(hash) {
    const id = LEGACY_HASHES[hash] ?? hash;
    return SECTIONS.includes(id) ? id : 'home';
}

function show(id) {
    id = resolve(id);
    if (id === current) return;
    const previous = current;
    if (previous) scrollPositions.set(previous, window.scrollY);
    current = id;
    for (const link of links) {
        if (link.dataset.section === id) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
    }
    for (const section of document.querySelectorAll('.section')) section.hidden = section.id !== id;
    window.scrollTo(0, scrollPositions.get(id) || 0);
    onChange(previous, id);
}

export function navigateToSection(id) {
    id = resolve(id);
    show(id);
    if (location.hash !== `#${id}`) history.pushState(null, '', `#${id}`);
}

export function currentSection() {
    return current;
}

// change(previous, next) fires whenever the visible section changes.
export function initNavigation(change) {
    if (change) onChange = change;
    links = [...document.querySelectorAll('#nav [data-section]')];

    document.addEventListener('click', (event) => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        const link = event.target.closest('[data-section], [data-section-link]');
        if (!link) return;
        event.preventDefault();
        navigateToSection(link.dataset.section ?? link.dataset.sectionLink);
    });

    document.addEventListener('keydown', (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.target.closest('input, textarea, select, [contenteditable]')) return;
        const index = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].indexOf(event.code);
        const at = SECTIONS.indexOf(current);
        let next = null;
        if (index >= 0) next = SECTIONS[index];
        else if (event.key === 'Escape') next = 'home';
        else if (event.key === 'ArrowRight') next = SECTIONS[Math.min(SECTIONS.length - 1, at + 1)];
        else if (event.key === 'ArrowLeft') next = SECTIONS[Math.max(0, at - 1)];
        if (!next) return;
        event.preventDefault();
        navigateToSection(next);
    });

    window.addEventListener('hashchange', () => show(location.hash.slice(1)));
    show(location.hash.slice(1));
}
