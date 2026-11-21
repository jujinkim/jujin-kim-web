// Export theme functions for global use
import { setTheme as setThemeInternal } from './theme.js?v=20261121.3';

window.setTheme = setThemeInternal;
