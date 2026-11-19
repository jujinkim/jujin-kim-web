// A section change plays out as a command: the prompt line types it, then the
// section prints block by block. The section itself is already in place, so
// anything that reads the DOM sees the new content immediately.

const COMMANDS = {
    home: 'cat welcome.md',
    about: 'cat about.md',
    projects: 'ls -l projects/',
    technologies: 'cat tech.md'
};
const TYPE_MS = 26;
const TYPE_CAP = 400;
const BLOCK_MS = 34;
const BLOCK_CAP = 600;

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let line = null;
let typed = null;
let timers = [];
let pending = [];

function settle() {
    timers.forEach(clearTimeout);
    timers = [];
    pending.forEach((block) => block.classList.remove('is-pending'));
    pending = [];
    line?.classList.remove('is-typing');
    if (typed && typed.dataset.full) typed.textContent = typed.dataset.full;
}

function play(sectionId) {
    settle();
    const command = COMMANDS[sectionId];
    const section = document.getElementById(sectionId);
    if (!line || !command || !section) return;
    typed.dataset.full = command;
    if (reduced.matches || document.body.dataset.displayMode === 'web1') {
        typed.textContent = command;
        return;
    }

    const content = section.querySelector('.section-content');
    pending = content ? [...content.children] : [];
    pending.forEach((block) => block.classList.add('is-pending'));
    typed.textContent = '';
    line.classList.add('is-typing');

    const step = Math.min(TYPE_MS, TYPE_CAP / command.length);
    for (let i = 1; i <= command.length; i++)
        timers.push(setTimeout(() => (typed.textContent = command.slice(0, i)), i * step));
    const typedAt = command.length * step + 90;
    timers.push(setTimeout(() => line.classList.remove('is-typing'), typedAt));
    const gap = Math.min(BLOCK_MS, BLOCK_CAP / Math.max(1, pending.length));
    pending.forEach((block, i) =>
        timers.push(setTimeout(() => block.classList.remove('is-pending'), typedAt + i * gap))
    );
    timers.push(setTimeout(() => (pending = []), typedAt + pending.length * gap + 10));
}

export function initSectionReveal() {
    const scroller = document.getElementById('terminal-content');
    const border = scroller?.querySelector('.content-border');
    if (!border) return;
    line = document.createElement('p');
    line.className = 'command-line';
    line.setAttribute('aria-hidden', 'true');
    line.innerHTML = '<span class="command-prompt">visitor@jk-crt:~$</span> <span class="command-typed"></span><span class="command-cursor">█</span>';
    typed = line.querySelector('.command-typed');
    border.prepend(line);

    let current = null;
    window.addEventListener('section-changed', (event) => play((current = event.detail.next)));
    // The first command ran behind the boot log; run it again once the screen shows.
    window.addEventListener('entrance-done', () => current && play(current));
    // Reading comes first: any input finishes the printing at once.
    for (const type of ['keydown', 'pointerdown', 'wheel', 'touchstart'])
        window.addEventListener(type, () => pending.length && settle(), { capture: true, passive: true });
    document.addEventListener('visibilitychange', settle);
}
