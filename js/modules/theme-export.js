// Export theme functions for global use
import { setTheme as setThemeInternal } from './theme.js?v=20261120.4';

window.setTheme = setThemeInternal;
