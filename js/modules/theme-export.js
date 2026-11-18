// Export theme functions for global use
import { setTheme as setThemeInternal } from './theme.js?v=20261118.1';

window.setTheme = setThemeInternal;
