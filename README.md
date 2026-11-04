# Jujin Kim Terminal Portfolio

A terminal-style personal portfolio website with a CLI-inspired interface.

## Live Demo
Visit: jujin.kim

## Features
- Terminal aesthetics with monospace fonts and ASCII art
- Interactive navigation (Shift+1~4, ESC) plus mouse support
- Home-only terminal input with command history
- Responsive layout from mobile to large displays
- Theme switching (light/dark/system)
- Animated starfield background and optional matrix rain effect
- Subtle CRT glass, scanlines, and grain across the screen, with quieter background animation in the margins
- Reduced-motion support for CRT grain and background animation

## CRT Preview

Open `/?crt-preview=1` to compare CRT effects, curved glass, and Static / Subtle motion / Retro noise.
The panel is only shown at this URL, and selections are not saved. Normal visits use curved glass and subtle motion.
System Reduce Motion settings pause animation in every mode. Collapse the preview panel to inspect the full page.

## Tech Stack
- Pure HTML5, CSS3, JavaScript (ES6+)
- No frameworks or build tooling
- Modular architecture with ES6 modules

## Keyboard Shortcuts
- Shift+1~4: Navigate menu items
- ESC: Return to Home

## Terminal Commands (Home)
- help, clear, about, skills, contact, date, ls, cat, matrix

## Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

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
└── img/
    └── profile.jpg
```

## Author
Jujin Kim
- GitHub: @jujinkim
- LinkedIn: linkedin.com/in/jujinkim
- Email: jk@jujin.kim

## License
Personal portfolio - All rights reserved.
