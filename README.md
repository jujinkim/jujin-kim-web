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
- CRT screen curvature, glass, scanlines, grain, and a slow sweep, with visible matrix rain in the desktop margins
- Smooth screen curvature uses bilinear sampling independently of the CRT texture
- Dim matrix glyphs fall one 22px cell at a time, leaving two fading cells behind
- Reduced-motion support for CRT grain and background animation

## CRT Preview

Open `/?crt-preview=1` to compare CRT effects, screen curvature, and 1. Static / 2. Subtle motion / 3. Retro noise.
The panel is only shown at this URL, and selections are not saved. Normal visits use screen curvature and Retro noise.
Noise choices are dropdown options; number keys still navigate the portfolio sections.
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
