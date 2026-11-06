// Export theme functions for global use
import { setTheme as setThemeInternal } from './theme.js?v=20261106.3';

window.setTheme = setThemeInternal;
