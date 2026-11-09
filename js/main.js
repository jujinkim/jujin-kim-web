import { initASCIITitle } from './modules/ascii-art.js?v=20261110.2';
import { initNavigation } from './modules/navigation.js?v=20261110.2';
import { initAnimations } from './modules/animations.js?v=20261110.2';
import { initTheme, setTheme } from './modules/theme.js?v=20261110.2';
import { initContent } from './modules/content.js?v=20261110.2';
import { initProfilePicture } from './modules/profile-ascii.js?v=20261110.2';
import { initTerminalInput } from './modules/terminal-input.js?v=20261110.2';
import { initCRTEffects } from './modules/crt-effects.js?v=20261110.2';

// Make functions globally available
window.setTheme = setTheme;

function updateFixedChromeOffsets() {
    const footer = document.getElementById('terminal-footer');

    const footerHeight = footer ? footer.offsetHeight : 0;

    document.documentElement.style.setProperty('--terminal-fixed-menu-height', '0px');
    document.documentElement.style.setProperty('--terminal-fixed-footer-height', `${footerHeight}px`);
}

function scheduleFixedChromeOffsetUpdate() {
    requestAnimationFrame(updateFixedChromeOffsets);
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initASCIITitle();
    initContent();
    initNavigation();
    initAnimations();
    initTerminalInput();
    initCRTEffects();

    // Initialize profile picture after content is loaded
    setTimeout(() => {
        initProfilePicture();
        scheduleFixedChromeOffsetUpdate();
    }, 100);

    scheduleFixedChromeOffsetUpdate();
    window.addEventListener('resize', scheduleFixedChromeOffsetUpdate);
    window.addEventListener('orientationchange', scheduleFixedChromeOffsetUpdate);
    new ResizeObserver(scheduleFixedChromeOffsetUpdate).observe(document.getElementById('terminal-footer'));

    console.log('%c Welcome to Jujin Kim\'s Terminal ',
        'background: #00ff00; color: #000; font-size: 20px; padding: 10px;');
});
