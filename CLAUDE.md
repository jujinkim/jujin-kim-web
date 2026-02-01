# Jujin Kim Terminal Portfolio

## Project Overview
Terminal-style single-page portfolio for Jujin Kim. The UI mimics a CLI with ASCII art, animated backgrounds, and a lightweight terminal input on the Home section.

## Tech Stack
- HTML5 (semantic structure)
- CSS3 (custom properties + scoped stylesheets)
- JavaScript (ES6 modules)
- No frameworks or build tooling

## Project Structure
```
jujin_kim_web/
├── index.html
├── css/
│   ├── reset.css
│   ├── terminal.css
│   ├── animations.css
│   ├── modal.css
│   └── responsive.css
├── js/
│   ├── main.js
│   ├── constants.js
│   └── modules/
│       ├── ascii-art.js
│       ├── navigation.js
│       ├── animations.js
│       ├── theme.js
│       ├── theme-export.js
│       ├── content.js
│       ├── terminal-input.js
│       └── profile-ascii.js
├── img/
│   ├── ascii-title.svg
│   ├── ascii-title-light.svg
│   ├── ascii-title-dark.svg
│   ├── profile-ascii.svg
│   └── profile.png
├── fonts/
│   └── JetBrainsMono-Regular.woff2
├── favicon.ico
├── favicon.svg
├── README.md
├── AGENTS.md
└── CLAUDE.md
```

## Key Features
1. Terminal aesthetics with monospace typography and green accent palette
2. Responsive layout from mobile to large displays
3. Keyboard navigation: Shift+1~6 and ESC to return Home
4. Theme switching via footer links (light/dark/system)
5. ASCII title and profile image rendering
6. Animated starfield canvas background
7. Matrix rain effect on wider screens (toggle via terminal command)
8. Home-only terminal input with command history

## Navigation & Commands
- Shift+1~6: Jump to menu sections
- ESC: Return to Home
- Terminal input (Home section only):
  - help, clear, about, skills, contact, date, ls, cat, matrix

## Theme Behavior
- Theme values are applied via CSS variables in `js/modules/theme.js`.
- `window.setTheme` is exposed in `js/main.js` and used by footer links.

## Content Management
- Section content is authored in `js/modules/content.js`.
- Keep the contact email authoritative via `js/constants.js::CONTACT_EMAIL`.

## Testing
```bash
# Static server (optional)
python3 -m http.server 8000
```
Or open `index.html` directly in a browser.

## Contact
- GitHub: @jujinkim
- Website: jujin.kim
- Email: me@jujin.kim

## License
Personal portfolio - All rights reserved

## Last Updated
- Date: February 1, 2026
- Recent Changes:
  - Refreshed project documentation to reflect current modules, navigation, and terminal input behavior
