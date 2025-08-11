// Export theme functions for global use
import { setTheme as setThemeInternal } from './theme.js';

window.setTheme = setThemeInternal;