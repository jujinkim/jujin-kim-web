// Export theme functions for global use
import { setTheme as setThemeInternal } from './theme.js?v=20261114.1';

window.setTheme = setThemeInternal;
