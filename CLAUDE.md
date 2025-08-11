# Jujin Kim Terminal Portfolio

## Project Overview
This is a terminal-style personal portfolio website for Jujin Kim, featuring a CLI-inspired interface with modern web technologies.

## Tech Stack
- **HTML5** - Semantic markup
- **CSS3** - Custom styling with CSS variables
- **JavaScript (ES6+)** - Modular architecture
- **No frameworks** - Pure vanilla implementation for maximum performance

## Project Structure
```
jujin_kim_web/
├── index.html              # Main HTML file
├── css/
│   ├── reset.css          # CSS reset
│   ├── terminal.css       # Main terminal styling
│   ├── animations.css     # Animation effects
│   ├── modal.css          # Help modal styling
│   └── responsive.css     # Responsive breakpoints
├── js/
│   ├── main.js            # Entry point
│   └── modules/
│       ├── ascii-art.js   # ASCII title generator
│       ├── navigation.js  # Menu navigation logic
│       ├── animations.js  # Starfield & effects
│       ├── theme.js       # Dark/light theme
│       ├── content.js     # Page content loader
│       └── profile-ascii.js # Profile picture ASCII art
├── img/
│   └── profile.png        # GitHub profile picture
├── favicon.ico            # JK favicon
├── favicon.svg            # JK favicon (SVG)
├── README.md              # Project documentation
└── CLAUDE.md              # This file
```

## Key Features
1. **Terminal Aesthetics**: Full CLI-style interface with monospace fonts
2. **Responsive Design**: Adapts from mobile to 4K displays
3. **Keyboard Navigation**: Arrow keys + Enter for menu selection
4. **Theme Support**: Follows system dark/light preference
5. **ASCII Art Title**: Dynamic sizing based on viewport
6. **Animated Background**: Starfield effect with ASCII characters
7. **Help Modal**: Ctrl+G opens comprehensive help

## Navigation
- **Arrow Keys (←→↑↓)**: Navigate between menu items
- **Enter**: Select current menu item
- **ESC**: Return to Home page
- **Ctrl+G**: Open help modal
- **Ctrl+T**: Toggle theme
- **Mouse**: Click to select menu items

## Development Guidelines

### Color Scheme
- Uses natural green tones instead of classic terminal green
- Dark mode: #52d053 (mint green) on #0a0e14 (dark background)
- Light mode: #2d7a2d (forest green) on #f5f7fa (light background)

### Content Management
- All content is in `js/modules/content.js`
- Each section has its own load function
- No duplicate headers - section titles only in HTML

### Responsive Breakpoints
- Mobile: < 480px (simplified menu, smaller fonts)
- Tablet: < 768px (wrapped menu, medium fonts)
- Desktop: < 1200px (standard layout)
- Large: > 1920px (max-width container)

### ASCII Art Fonts
- Large screens: Full block-style ASCII art
- Medium screens: Classic ASCII art
- Small screens: Simplified modern style
- Mobile: Compact version

## Testing Commands
```bash
# Start local server (if Python installed)
python -m http.server 8000

# Or use Node.js
npx http-server

# Or simply open index.html in browser
```

## Future Enhancements
- [ ] Add typing animation for content
- [ ] Implement command input for navigation
- [ ] Add sound effects (optional)
- [ ] Create more ASCII art variations
- [ ] Add terminal command history
- [ ] Implement Easter eggs

## Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Notes
- No external dependencies
- All assets are local
- Minimal JavaScript execution
- CSS animations use GPU acceleration
- Lazy loading for content sections

## Accessibility
- Semantic HTML structure
- ARIA labels for navigation
- Keyboard-only navigation support
- Focus indicators for all interactive elements
- Respects prefers-reduced-motion

## Contact
- GitHub: [@jujinkim](https://github.com/jujinkim)
- Website: [jujinkim.com](https://jujinkim.com)
- Email: jujin@jujin.kim

## License
Personal portfolio - All rights reserved

## Last Updated
- **Date**: August 2024
- **Recent Changes**:
  - Added ASCII art profile picture with hover effect
  - Implemented GitHub profile image integration
  - Created favicon with JK initials
  - Enhanced responsive design for all screen sizes
  - Integrated real profile data from jujinkim.com
  - Added matrix rain animation with Korean characters
  - Implemented custom terminal-style scrollbar
  - Dynamic age/version calculation system