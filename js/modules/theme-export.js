// Export theme functions for global use
import { setTheme as setThemeInternal } from './theme.js?v=20261121.1';

window.setTheme = setThemeInternal;
