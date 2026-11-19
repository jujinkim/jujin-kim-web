let menuItems = [];
const scrollPositions = new Map();
let currentSection;

function isMobileInputContext() {
    return (
        document.getElementById('monitor-glass').clientWidth <= 768 || matchMedia('(pointer: coarse)').matches
    );
}

export function initNavigation() {
    menuItems = [...document.querySelectorAll('.menu-item')];
    for (const item of menuItems)
        item.addEventListener('click', (event) => {
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            navigateToSection(item.dataset.section);
        });
    document.addEventListener('click', (event) => {
        const link = event.target.closest('[data-section-link]');
        if (!link) return;
        event.preventDefault();
        navigateToSection(link.dataset.sectionLink);
    });
    document.addEventListener('keydown', (event) => {
        if (
            isMobileInputContext() ||
            event.ctrlKey ||
            event.metaKey ||
            event.altKey ||
            (event.key !== 'Escape' && document.body.classList.contains('terminal-open')) ||
            event.target.closest('input, textarea, select, [contenteditable]')
        )
            return;
        const index = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(event.code);
        if (index >= 0 || event.key === 'Escape') {
            event.preventDefault();
            navigateToSection(index >= 0 ? menuItems[index].dataset.section : 'home');
        }
    });
    window.addEventListener('hashchange', () => showSection(location.hash.slice(1)));
    showSection(location.hash.slice(1));
}

export function navigateToSection(sectionId) {
    if (!menuItems.some((item) => item.dataset.section === sectionId)) return;
    showSection(sectionId);
    if (location.hash !== `#${sectionId}`) history.pushState(null, '', `#${sectionId}`);
}

function showSection(sectionId) {
    if (!menuItems.some((item) => item.dataset.section === sectionId)) sectionId = 'home';
    const scroller = document.getElementById('terminal-content');
    if (currentSection) scrollPositions.set(currentSection, scroller.scrollTop);
    for (const item of menuItems) {
        const active = item.dataset.section === sectionId;
        item.classList.toggle('active', active);
        if (active) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
    }
    for (const section of document.querySelectorAll('.content-section')) {
        section.style.display = section.id === sectionId ? '' : 'none';
    }
    currentSection = sectionId;
    scroller.scrollTop = scrollPositions.get(sectionId) || 0;
}
