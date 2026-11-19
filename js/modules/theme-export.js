// Export theme functions for global use
import { setTheme as setThemeInternal } from './theme.js?v=20261119.5';

window.setTheme = setThemeInternal;
