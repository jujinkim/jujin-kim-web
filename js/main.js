import { initASCIITitle } from './modules/ascii-art.js';
import { initNavigation } from './modules/navigation.js';
import { initAnimations } from './modules/animations.js';
import { initTheme, setTheme } from './modules/theme.js';
import { initContent } from './modules/content.js';
import { initProfilePicture } from './modules/profile-ascii.js';
import { initTerminalInput } from './modules/terminal-input.js';

// Make functions globally available
window.setTheme = setTheme;

function updateFixedChromeOffsets() {
    const footer = document.getElementById('terminal-footer');
    
    const footerHeight = footer ? Math.ceil(footer.getBoundingClientRect().height) : 0;
    
    document.documentElement.style.setProperty('--terminal-fixed-menu-height', '0px');
    document.documentElement.style.setProperty('--terminal-fixed-footer-height', `${footerHeight}px`);
}

function scheduleFixedChromeOffsetUpdate() {
    requestAnimationFrame(updateFixedChromeOffsets);
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initASCIITitle();
    initNavigation();
    initAnimations();
    initContent();
    initTerminalInput();
    
    // Initialize profile picture after content is loaded
    setTimeout(() => {
        initProfilePicture();
        scheduleFixedChromeOffsetUpdate();
    }, 100);
    
    scheduleFixedChromeOffsetUpdate();
    window.addEventListener('resize', scheduleFixedChromeOffsetUpdate);
    window.addEventListener('orientationchange', scheduleFixedChromeOffsetUpdate);
    
    console.log('%c Welcome to Jujin Kim\'s Terminal ', 
        'background: #00ff00; color: #000; font-size: 20px; padding: 10px;');
});
