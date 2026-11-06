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
- CRT glass curvature, scanlines, moving grain, and a narrow bright scan band traveling downward every 8 seconds
- Mobile retains the same monitor animation, with visible grain and a brighter scan band
- Smooth vector curves frame the screen without filtering live text or scrolling; frame geometry updates only on resize
- Glass shading and grain use cached 128px textures; only grain and sweep layers animate via transforms
- The bright sweep uses a cached 2px × 96px texture so its gradient does not need to be repainted every frame
- Moving texture layers start after a 2-second settling period to give the initial content render priority
- Grain and sweep pause during scrolling and resume afterward to keep interaction responsive
- Retro effects are enabled by default, with phosphor glow, green-black glass, a beveled screen edge, and scanline texture
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

## Release Cache Version

Local CSS, entry script, active module imports, font URLs, and favicons use the `v=20261106.3` release key. Keep this key consistent when replacing runtime assets so returning browsers load the matching terminal UI and code.

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
