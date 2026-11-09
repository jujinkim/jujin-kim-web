// Export theme functions for global use
import { setTheme as setThemeInternal } from './theme.js?v=20261110.1';

window.setTheme = setThemeInternal;
