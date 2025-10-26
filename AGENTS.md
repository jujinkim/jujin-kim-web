# Project Agent Guide

## Snapshot
- Terminal-inspired single-page portfolio for **Jujin Kim**.
- Pure HTML, CSS, and vanilla ES modules — no build tooling.
- Key entry point: `index.html` → `js/main.js` → modules in `js/modules/`.
- Shared constants live in `js/constants.js` (e.g., `CONTACT_EMAIL`).

## Active Focus
- Keep the contact address authoritative via `CONTACT_EMAIL`.
- Preserve terminal aesthetic (monospace fonts, green accent palette).
- Ensure content sections continue to render via `load*Section` helpers in `js/modules/content.js`.

## Coordination Checklist
1. **Content updates** → edit the relevant load function in `js/modules/content.js`.
2. **Shared values** → prefer adding to/consuming from `js/constants.js`.
3. **Terminal commands** → adjust command handlers in `js/modules/terminal-input.js`.
4. **Navigation & interactions** → check `js/modules/navigation.js` and `js/modules/animations.js`.
5. **Visual styling** → touch only the scoped CSS file (`css/terminal.css`, `css/responsive.css`, etc.).

## Coding Guidelines
- Stick to ES6 modules and template literals; avoid introducing frameworks.
- Use ASCII characters unless a file already mixes in Unicode (e.g., emoji in content templates).
- Keep inline comments minimal and purposeful.
- When adding files, favor descriptive names and module-scoped exports.
- Manual testing: open `index.html` in a browser or run a static server (`python3 -m http.server 8000`).

## Collaboration Notes
- Document notable deviations or new constants in this file so other agents stay aligned.
- Update `CLAUDE.md` when high-level project details shift (features, contact info, roadmap).
