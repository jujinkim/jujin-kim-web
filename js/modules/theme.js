const modes = ['light', 'dark', 'system'];
let currentThemeMode = 'light';
let notificationTimer;

export function initTheme() {
    try {
        const saved = localStorage.getItem('theme-mode');
        if (modes.includes(saved)) currentThemeMode = saved;
    } catch (_) {}
    document.querySelector('.theme-picker').hidden = false;
    applyTheme();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (currentThemeMode === 'system') applyTheme();
    });
    document.querySelectorAll('[data-theme-mode]').forEach(button => {
        button.addEventListener('click', () => setTheme(button.dataset.themeMode));
    });
}

export function setTheme(mode) {
    if (!modes.includes(mode)) return;
    currentThemeMode = mode;
    try { localStorage.setItem('theme-mode', mode); } catch (_) {}
    applyTheme();
    const status = document.getElementById('theme-status');
    if (!status) return;
    clearTimeout(notificationTimer);
    status.textContent = `${mode[0].toUpperCase()}${mode.slice(1)} theme`;
    status.classList.add('is-visible');
    notificationTimer = setTimeout(() => status.classList.remove('is-visible'), 1800);
}

function applyTheme() {
    const isDark = currentThemeMode === 'dark' || (currentThemeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    document.body.dataset.theme = isDark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]').content = isDark ? '#161719' : '#f4f2eb';
    document.querySelectorAll('[data-theme-mode]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.themeMode === currentThemeMode));
    });
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: { mode: currentThemeMode, isDark } }));
}
