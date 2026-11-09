// Export theme functions for global use
import { setTheme as setThemeInternal } from './theme.js?v=20261110.2';

window.setTheme = setThemeInternal;
