const sectionIds = ['home', 'projects', 'about', 'technologies'];

export function navigateToSection(sectionId) {
    const target = document.getElementById(sectionId);
    if (!target) return;
    if (location.hash !== `#${sectionId}`) history.pushState(null, '', `#${sectionId}`);
    target.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' });
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
}

export function initNavigation() {
    history.scrollRestoration = 'manual';
    document.addEventListener('click', event => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = event.target.closest('a[href^="#"], [data-section-link]');
        if (!link) return;
        const id = link.dataset.sectionLink || link.getAttribute('href').slice(1);
        if (document.getElementById(id)) {
            event.preventDefault();
            navigateToSection(id);
        }
    });
    document.addEventListener('keydown', event => {
        if (event.defaultPrevented || isEditing(event.target) || document.body.classList.contains('terminal-open')) return;
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        const index = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(event.code);
        if (event.shiftKey && index !== -1) {
            event.preventDefault();
            navigateToSection(sectionIds[index]);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            navigateToSection('home');
        }
    });
    const items = [...document.querySelectorAll('.menu-item')];
    let scheduled = false;
    const update = () => {
        scheduled = false;
        const marker = window.innerHeight * 0.35;
        let activeId = 'home';
        [...sectionIds, 'home-contact'].forEach(id => {
            if (document.getElementById(id).getBoundingClientRect().top <= marker) activeId = id;
        });
        items.forEach(item => {
            const active = item.dataset.section === activeId;
            item.classList.toggle('active', active);
            if (active) item.setAttribute('aria-current', 'location');
            else item.removeAttribute('aria-current');
        });
    };
    const schedule = () => {
        if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    const followHash = () => {
        const target = document.getElementById(location.hash.slice(1) || 'home');
        if (target) target.scrollIntoView({ behavior: 'instant' });
        schedule();
    };
    let hashFrame = 0;
    const scheduleHash = () => {
        cancelAnimationFrame(hashFrame);
        hashFrame = requestAnimationFrame(followHash);
    };
    window.addEventListener('popstate', scheduleHash);
    window.addEventListener('hashchange', scheduleHash);
    scheduleHash();
    update();
}
function reducedMotion() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
function isEditing(target) { return target.closest('input, textarea, select, [contenteditable="true"]'); }
