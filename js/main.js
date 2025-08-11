import { initASCIITitle } from './modules/ascii-art.js';
import { initNavigation, openHelpModal } from './modules/navigation.js';
import { initAnimations } from './modules/animations.js';
import { initTheme, setTheme } from './modules/theme.js';
import { initContent } from './modules/content.js';

// Make functions globally available
window.setTheme = setTheme;
window.openHelp = openHelpModal;

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initASCIITitle();
    initNavigation();
    initAnimations();
    initContent();
    
    console.log('%c Welcome to Jujin Kim\'s Terminal ', 
        'background: #00ff00; color: #000; font-size: 20px; padding: 10px;');
});