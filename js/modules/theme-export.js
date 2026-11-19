// Export theme functions for global use
import { setTheme as setThemeInternal } from './theme.js?v=20261120.13';

window.setTheme = setThemeInternal;
