import { initNavigation } from './modules/navigation.js';
import { initAnimations } from './modules/animations.js';
import { initTheme, setTheme } from './modules/theme.js';
import { initContent } from './modules/content.js';
import { initProfilePicture } from './modules/profile-ascii.js';
import { initTerminalInput } from './modules/terminal-input.js';
import { initMonogram } from './modules/monogram.js';
import { initMonitorEffects } from './modules/monitor-effects.js';

window.setTheme = setTheme;
initTheme();
initContent();
initMonitorEffects();
initProfilePicture();
initNavigation();
initMonogram();
initAnimations();
initTerminalInput();
