export function initMonitorEffects() {
    const screen = document.createElement('div');
    screen.id = 'monitor-effects';
    screen.setAttribute('aria-hidden', 'true');
    screen.inert = true;
    screen.innerHTML = '<div class="monitor-lines"></div><div class="monitor-noise"></div><div class="monitor-sweep"></div>';
    document.body.append(screen);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobile = window.matchMedia('(max-width: 768px), (pointer: coarse)');
    const visibleCards = new Set();
    const revealed = new WeakSet();
    const entrances = new Set();
    const header = document.querySelector('.site-header');
    let frame = 0;
    let scrollTimer;
    let scrolling = false;
    let lastProgress = -1;

    const render = () => {
        frame = 0;
        if (document.hidden) return;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const progress = maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0;
        const cards = mobile.matches && !reduced.matches
            ? [...visibleCards].map(card => ({ card, rect: card.getBoundingClientRect() }))
            : [];
        if (Math.abs(progress - lastProgress) >= 0.0001) {
            header.style.setProperty('--reading-progress', progress.toFixed(4));
            lastProgress = progress;
        }
        cards.forEach(({ card, rect }) => {
            const position = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / (window.innerHeight + rect.height)));
            card.style.setProperty('--card-drift', `${((0.5 - position) * 44).toFixed(2)}px`);
            card.style.setProperty('--card-roll', `${((position - 0.5) * 10).toFixed(2)}deg`);
            card.style.setProperty('--card-orbit', `${(position * 65).toFixed(2)}deg`);
        });
    };
    const schedule = () => {
        if (!frame && !document.hidden) frame = requestAnimationFrame(render);
    };
    const syncState = () => {
        document.body.classList.toggle('mobile-effects-enabled', mobile.matches && !reduced.matches);
        document.body.classList.toggle('motion-paused', document.hidden);
        screen.dataset.motion = reduced.matches ? 'static' : document.hidden ? 'paused' : 'active';
        if (document.hidden || reduced.matches) {
            entrances.forEach(animation => animation.cancel());
        }
        if (document.hidden) {
            cancelAnimationFrame(frame);
            frame = 0;
            clearTimeout(scrollTimer);
            document.body.classList.remove('is-scrolling');
            scrolling = false;
        } else schedule();
    };

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            const target = entry.target;
            if (target.classList.contains('project-visual')) {
                target.classList.toggle('is-in-view', entry.isIntersecting);
                if (entry.isIntersecting) visibleCards.add(target);
                else visibleCards.delete(target);
            }
            if (entry.isIntersecting && mobile.matches && !reduced.matches && !document.hidden && !revealed.has(target)) {
                revealed.add(target);
                const animation = target.animate([
                    { opacity: 0.35, transform: 'translateY(24px)' },
                    { opacity: 1, transform: 'translateY(0)' }
                ], { duration: 600, easing: 'cubic-bezier(.2,.7,.2,1)' });
                entrances.add(animation);
                animation.onfinish = animation.oncancel = () => entrances.delete(animation);
            }
        });
        schedule();
    }, { threshold: 0.12 });
    document.querySelectorAll('.project-visual, .section-heading').forEach(target => observer.observe(target));

    window.addEventListener('scroll', () => {
        if (document.hidden) return;
        if (!reduced.matches) {
            if (!scrolling) {
                scrolling = true;
                document.body.classList.add('is-scrolling');
            }
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(() => {
                scrolling = false;
                document.body.classList.remove('is-scrolling');
            }, 180);
        }
        schedule();
    }, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('pageshow', syncState);
    document.addEventListener('visibilitychange', syncState);
    reduced.addEventListener('change', syncState);
    mobile.addEventListener('change', syncState);
    syncState();
}
