# Project Agent Guide

## Snapshot
- **Terminal Portfolio**: A terminal-inspired, single-page portfolio website for Jujin Kim mimicking a CLI interface.
- **Tech Stack**: Pure HTML5, CSS3 (custom variables + custom styling), and vanilla JS (ES6 modules) with no framework or build tooling.
- **Entry Point**: `index.html` -> `js/main.js` -> modules in `js/modules/`.
- **Shared Constants**: Live in `js/constants.js` (e.g., `CONTACT_EMAIL`).

---

## Project Structure
```
jujin_kim_web/
├── index.html
├── css/
│   ├── reset.css
│   ├── site.css          # Main terminal styles
│   ├── animations.css    # Starfield background & other transitions
│   ├── modal.css         # Modal dialog styling
│   └── responsive.css    # Responsive layouts for mobile/tablet/desktop
├── js/
│   ├── main.js           # App initialization
│   ├── constants.js      # Global/shared constants (e.g. CONTACT_EMAIL)
│   └── modules/
│       ├── ascii-art.js        # Home ASCII title & art helpers
│       ├── navigation.js       # Section navigation & key shortcuts
│       ├── animations.js       # Canvas starfield & matrix rain animations
│       ├── theme.js            # Theme switching mechanics (light/dark/system)
│       ├── theme-export.js     # Helper functions for exporting themes
│       ├── content.js          # Main content templates for all sections
│       ├── terminal-input.js   # Terminal command parser & input logic
│       └── profile-ascii.js    # Profile picture loader (photo-only)
├── img/
│   ├── ascii-title.svg
│   ├── ascii-title-light.svg
│   ├── ascii-title-dark.svg
│   └── profile.jpg       # Profile picture (JPEG format)
├── fonts/
│   └── JetBrainsMono-Regular.woff2
├── favicon.ico
├── favicon.svg
├── README.md
└── AGENTS.md             # This guide
```

---

## Active Focus & Key Behavior

### 1. Style & Theme Mechanics
- **Monospace Terminal Aesthetic**: Monospace typography, green accent palette, and customized ASCII styling.
- **CSS Variables**: Core theme variables (colors, fonts, etc.) are declared in `:root` inside `css/site.css` and adjusted dynamically via `js/modules/theme.js`.
- **Theme Selection**: Driven by `window.setTheme` (exposed globally in `js/main.js`) and triggered by the footer links.

### 2. Navigation & Commands
- **Keyboard Navigation**:
  - `Shift+1~5`: Instantly switch between corresponding sections.
  - `ESC`: Return directly to the Home section.
- **Terminal Input (Home section only)**:
  - Command handling resides in `js/modules/terminal-input.js`.
  - Supported commands: `help`, `clear`, `about`, `skills`, `contact`, `date`, `ls`, `cat`, `matrix`.

### 3. Content & Shared Values
- **Content Rendering**: All section contents (HTML templates) are rendered dynamically via `load*Section` helpers in `js/modules/content.js`.
- **Authoritative Constants**: Keep key contact details (like email address) authoritative by consuming `CONTACT_EMAIL` from `js/constants.js`.
- **Contact Links**: Contact details are integrated into the Home section; there is no separate Contact page.

---

## Coordination Checklist

1. **Content updates** -> edit the relevant `load*Section` function in `js/modules/content.js`.
2. **Shared values** -> prefer adding to/consuming from `js/constants.js`.
3. **Terminal commands** -> adjust command handlers or prompt behaviors in `js/modules/terminal-input.js`.
4. **Navigation & section switching** -> check `js/modules/navigation.js`.
5. **Animations (starfield/matrix rain)** -> update canvas/render loops in `js/modules/animations.js`.
6. **Theme behavior** -> update color variables or toggle states in `js/modules/theme.js` (along with `window.setTheme` handling).
7. **Visual styling** -> touch only the relevant scoped CSS files (`css/site.css` for main styles, `css/responsive.css` for media queries).

---

## Coding Guidelines

- **Vanilla ES6 Modules**: Stick strictly to ES6 modules and template literals. Avoid introducing frameworks, compiler steps, or external build pipelines.
- **ASCII & Text**: Use ASCII characters unless a file already mixes in Unicode (such as emoji in content templates).
- **Inline Comments**: Keep inline comments minimal, purposeful, and clean.
- **Adding Files**: When creating new modules, favor descriptive names and export clean module-scoped functions/constants.
- **Manual Testing**:
  - Open `index.html` directly in the browser, or
  - Start a static local server via Python:
    ```bash
    python3 -m http.server 8000
    ```

---

## Key Contacts & Links
- **GitHub**: [@jujinkim](https://github.com/jujinkim)
- **Website**: [jujin.kim](https://jujin.kim)
- **Email**: [jk@jujin.kim](mailto:jk@jujin.kim)
