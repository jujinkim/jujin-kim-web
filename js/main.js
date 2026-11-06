import { initNavigation } from './modules/navigation.js?v=20261106.1';
import { initAnimations } from './modules/animations.js?v=20261106.1';
import { initTheme, setTheme } from './modules/theme.js?v=20261106.1';
import { initContent } from './modules/content.js?v=20261106.1';
import { initProfilePicture } from './modules/profile-ascii.js?v=20261106.1';
import { initTerminalInput } from './modules/terminal-input.js?v=20261106.1';
import { initMonogram } from './modules/monogram.js?v=20261106.1';
import { initMonitorEffects } from './modules/monitor-effects.js?v=20261106.1';

window.setTheme = setTheme;
initTheme();
initContent();
initMonitorEffects();
initProfilePicture();
initNavigation();
initMonogram();
initAnimations();
initTerminalInput();
