// Export theme functions for global use
import { setTheme as setThemeInternal } from './theme.js?v=20261109.6';

window.setTheme = setThemeInternal;
