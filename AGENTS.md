# Project Agent Guide

@/home/jujin/.codex/RTK.md

## Snapshot

- **Code, Composed.**: An editorial, scroll-based software engineering portfolio for Jujin Kim.
- **Stack**: Pure HTML5, CSS3, and vanilla JavaScript ES modules. No framework, dependencies, compiler, or build pipeline.
- **Entry point**: `index.html` → `js/main.js` → `js/modules/`.
- **Shared values**: `js/constants.js` owns `CONTACT_EMAIL` and `PROFILE_IMAGE_URL`.
- **Visual language**: Ivory, ink, cobalt, oversized typography, numbered sections, striped SVG JK monogram. Local variable fonts and native SVG/canvas only.

## Structure and content

- `index.html`: page shell and static hero/contact; meaningful project fallbacks for JavaScript-disabled browsing.
- `js/modules/content.js`: dynamic projects, archive, about/career, practice, year, experience duration, and KST time.
- `css/site.css`: theme tokens and component styles. `css/responsive.css`: responsive/print rules. `css/animations.css`: motion rules.
- `js/modules/navigation.js`: native anchor enhancement, active section, history, and shortcuts.
- `js/modules/monogram.js`: SVG pointer/touch interaction; visible-only compositor motion on mobile/coarse pointers; static with reduced motion; no continuous JavaScript loop while idle.
- `js/modules/monitor-effects.js`: cached monitor grain, fine scanlines, downward bright sweep, scroll pause, reading progress, and mobile scroll effects.
- `js/modules/theme.js`: Light/Dark/System, `theme-mode` persistence, and `window.setTheme`.
- `js/modules/profile-ascii.js`: profile photograph, despite the historical module name; Gravatar with a one-time local fallback.
- `js/modules/terminal-input.js`: desktop terminal input, history, commands, and focus management.
- `js/modules/animations.js`: opt-in matrix effect restricted to the terminal panel.
- `img/projects/`: real product captures. Source provenance is in README.
- Legacy CRT, curvature, ASCII-title, and modal modules remain inactive. The lightweight monitor overlay reuses `img/crt-noise.png`; do not restore screen-wide displacement/blur filters.

## Stable behavior

- Section IDs: `home`, `projects`, `about`, `technologies`, `home-contact`. `navigateToSection(id)` scrolls rather than hiding other sections.
- `Shift+1~4`: Home, Work, About, Practice. Unmodified number keys do not navigate. Do not intercept shortcuts while editing inputs.
- `Escape`: close an open terminal first; otherwise return home.
- `/` or the footer Terminal button opens the terminal on desktop fine-pointer devices. It is hidden at widths <=768px and for coarse pointers.
- Commands: `help`, `clear`, `about`, `skills`, `contact`, `date`, `matrix`. Arrow keys browse command history. Use a real input; restore focus on close.
- New visitors default to Light. Respect saved Light/Dark/System selections and system changes in System mode. Storage failures must not break the page.
- Profile fallback clears its error handler before loading `img/profile.jpg`.
- Keep exact role names `Software Engineer` and `Developer`, Frequaw primary/Legacy URLs, institution/dates, and modest AI learning/experimentation wording.

## Editing guidelines

- Keep vanilla ES modules and template literals; do not introduce frameworks, build tooling, or external animation libraries.
- Content changes belong in the corresponding `load*Section` helper; synchronize static fallback content if relevant.
- Preserve existing factual claims, contact links, dates, and project destinations unless explicitly changed by the user.
- Keep shared contact values authoritative through constants; static HTML includes an email fallback for no-JavaScript browsing.
- Keep comments minimal and purposeful. New modules need descriptive names and clean exports.
- The files already include Unicode typography; use it consistently and avoid decorative emoji.
- Do not fabricate product screenshots. Use an actual public capture or explicit typographic artwork. Record image sources in README.
- Performance comes first on desktop and mobile. Monitor grain and sweep animate cached layers through transforms; pause them during scrolling and in hidden tabs. Do not regenerate noise or filter live page text.
- Respect reduced motion. Pause animated work in hidden tabs and outside its visible region. Reserve image dimensions, lazy-load below-fold images, and handle failures.

## Verification

Run a static HTTP server: `python3 -m http.server 8000`. ES modules require HTTP. Prefix shell commands with `rtk` per the shared guide.

- `node --check` on changed modules; `git diff --check`.
- Browser checks at 360, 390, 768, 1440, and 1920px. Check overflow and mobile navigation without horizontal clipping.
- Verify both themes, saved settings/System mode, keyboard focus and shortcuts, direct hashes and browser Back.
- Verify terminal commands, history, close/focus restoration, and localized matrix effect.
- Verify monitor sweep direction, grain motion, pause/resume during scroll, visible-only mobile motion, touch response without trapping vertical scroll, and reduced motion.
- Measure idle/scroll frame timing on desktop/mobile before claiming performance; distinguish emulation from physical-device evidence.
- Verify JavaScript-disabled core content, project image failures, and profile fallback.
- Keep README navigation/command documentation synchronized. Separate local, remote Git, and deployed browser evidence.
