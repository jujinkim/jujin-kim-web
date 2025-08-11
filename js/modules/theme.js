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
    
    document.addEventListener('keydown', (e) => {
        // Don't handle if user is typing in an input or modal is open
        if (document.activeElement.tagName === 'INPUT' || 
            document.activeElement.tagName === 'TEXTAREA' ||
            document.getElementById('help-modal').classList.contains('active')) {
            return;
        }
        
        if (!e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
            switch(e.key) {
                case '8':
                    e.preventDefault();
                    setTheme('light');
                    break;
                case '9':
                    e.preventDefault();
                    setTheme('dark');
                    break;
                case '0':
                    e.preventDefault();
                    setTheme('system');
                    break;
            }
        }
    });
}

function updateTheme(isDark) {
    const root = document.documentElement;
    
    if (isDark) {
        root.style.setProperty('--terminal-bg', '#0a0e14');
        root.style.setProperty('--terminal-fg', '#52d053');
        root.style.setProperty('--terminal-border', '#3eb73e');
        root.style.setProperty('--terminal-highlight', '#6eff6e');
        root.style.setProperty('--terminal-dim', '#2a7a2a');
        root.style.setProperty('--terminal-accent', '#40c940');
    } else {
        root.style.setProperty('--terminal-bg', '#ffffff');
        root.style.setProperty('--terminal-fg', '#1a5f1a');
        root.style.setProperty('--terminal-border', '#2d7a2d');
        root.style.setProperty('--terminal-highlight', '#238823');
        root.style.setProperty('--terminal-dim', '#7ab87a');
        root.style.setProperty('--terminal-accent', '#3a9b3a');
    }
    
    document.body.dataset.theme = isDark ? 'dark' : 'light';
}

export function setTheme(mode) {
    currentThemeMode = mode;
    localStorage.setItem('theme-mode', mode);
    applyTheme();
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