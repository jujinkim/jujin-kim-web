// Export theme functions for global use
import { setTheme as setThemeInternal } from './theme.js?v=20261106.2';

window.setTheme = setThemeInternal;
