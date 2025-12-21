let currentThemeMode = 'system'; // 'light', 'dark', or 'system'

export function initTheme() {
    const savedTheme = localStorage.getItem('theme-mode') || 'system';
    currentThemeMode = savedTheme;
    applyTheme();
    
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (currentThemeMode === 'system') {
            applyTheme();
        }
    });
    
    // Removed keyboard shortcuts for theme switching - now click only
}

function updateTheme(isDark) {
    const root = document.documentElement;
    
    if (isDark) {
        root.style.setProperty('--terminal-bg', '#0c0d0f');
        root.style.setProperty('--terminal-bg-soft', '#111416');
        root.style.setProperty('--terminal-surface', '#13181b');
        root.style.setProperty('--terminal-surface-strong', '#161c1f');
        root.style.setProperty('--terminal-fg', '#e6efe7');
        root.style.setProperty('--terminal-border', '#3f6b55');
        root.style.setProperty('--terminal-highlight', '#7ef2ad');
        root.style.setProperty('--terminal-dim', '#2f4a3c');
        root.style.setProperty('--terminal-accent', '#5edfb0');
        root.style.setProperty('--terminal-amber', '#f4c88a');
    } else {
        root.style.setProperty('--terminal-bg', '#f6f8f6');
        root.style.setProperty('--terminal-bg-soft', '#edf2ef');
        root.style.setProperty('--terminal-surface', '#eef4f0');
        root.style.setProperty('--terminal-surface-strong', '#e8f0eb');
        root.style.setProperty('--terminal-fg', '#0f241a');
        root.style.setProperty('--terminal-border', '#c3d6c9');
        root.style.setProperty('--terminal-highlight', '#2a8a57');
        root.style.setProperty('--terminal-dim', '#73927f');
        root.style.setProperty('--terminal-accent', '#2f9a64');
        root.style.setProperty('--terminal-amber', '#d4a25a');
    }
    
    document.body.dataset.theme = isDark ? 'dark' : 'light';
}

export function setTheme(mode) {
    currentThemeMode = mode;
    localStorage.setItem('theme-mode', mode);
    applyTheme();
    window.dispatchEvent(new CustomEvent('theme-changed', {
        detail: {
            mode,
            isDark: mode === 'dark' ? true : mode === 'light' ? false : undefined
        }
    }));
    showThemeNotification(mode);
}

function applyTheme() {
    let isDark;
    
    if (currentThemeMode === 'system') {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
        isDark = currentThemeMode === 'dark';
    }
    
    updateTheme(isDark);
    
    window.dispatchEvent(new CustomEvent('theme-changed', {
        detail: {
            mode: currentThemeMode,
            isDark
        }
    }));
}

function showThemeNotification(mode) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--terminal-bg);
        border: 2px solid var(--terminal-border);
        padding: 20px;
        z-index: 10000;
        font-family: var(--terminal-font);
        color: var(--terminal-fg);
    `;
    
    const modeText = mode === 'system' ? 'System Theme' : mode === 'dark' ? 'Dark Mode' : 'Light Mode';
    notification.textContent = `Theme: ${modeText}`;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 1500);
}
