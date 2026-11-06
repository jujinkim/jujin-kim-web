# Jujin Kim — Code, Composed.

An editorial portfolio for Jujin Kim: software engineering, Android applications, independent products, and hands-on experiments. Live website: [jujin.kim](https://jujin.kim).

## Run locally

No dependencies, framework, compilation, or build pipeline.

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`. Serve over HTTP so browsers can load ES modules. Opening `index.html` directly still provides the static introduction, featured project links, and contact information; module enhancements require HTTP.

## Design and behavior

- Ivory, ink, and cobalt; local variable Space Grotesk and JetBrains Mono fonts.
- A striped SVG JK monogram responds to desktop pointer movement. Mobile/coarse-pointer screens add a slow compositor animation and touch response; project images respond to scrolling and section headings enter as they appear. No continuous JavaScript animation loop runs while idle. Offscreen and hidden-tab motion is paused; reduced motion keeps the graphics static.
- A monitor texture combines cached 128px noise, static fine scanlines, and a narrow bright sweep moving from top to bottom. Only transform properties animate; page text is never filtered. Grain and sweep pause during scrolling and in hidden tabs. Reduced motion hides the sweep and stops animated texture.
- A continuous page: introduction, selected work and an expandable project archive, about/career, practice, and contact.
- Native anchor destinations remain available without JavaScript. JavaScript adds smooth navigation, active section indication, keyboard shortcuts, and browser history support.
- Light, Dark, and System themes. First visit defaults to Light; saved `theme-mode` is respected. Storage being unavailable does not prevent rendering.
- A desktop terminal with a real input field, paste support, command history, and focus restoration. Hidden at 768px and below or with a coarse pointer. Matrix animation stays inside the terminal and stops while it is closed.
- Gravatar profile image with a one-time local `img/profile.jpg` fallback.
- Reduced motion, keyboard focus, skip navigation, print layout, and reserved image dimensions.

## Keyboard shortcuts

- `Shift+1`: Introduction
- `Shift+2`: Selected work
- `Shift+3`: About and career
- `Shift+4`: Practice
- `Escape`: Close an open terminal; otherwise return to the introduction. Navigation shortcuts do not run while editing inputs.
- `/`: Open or close the desktop terminal outside editable fields.
- In the terminal: `Enter` runs a command; `ArrowUp` / `ArrowDown` browse command history.

Commands: `help`, `clear`, `about`, `skills`, `contact`, `date`, `matrix`.

## Content and modules

- `index.html`: semantic page shell, hero, section headings, static project fallback, and contact.
- `js/modules/content.js`: enhanced project, archive, career, and practice templates; dynamic year, experience duration, and KST clock.
- `js/constants.js`: authoritative email and profile URL. HTML retains a no-JavaScript email fallback; runtime contact and terminal output consume `CONTACT_EMAIL`.
- `js/modules/navigation.js`: anchors, current section, browser history, and shortcuts. Exports `navigateToSection(id)`.
- `js/modules/monogram.js`: native SVG pointer/touch interaction and visible-only mobile ambient motion.
- `js/modules/monitor-effects.js`: monitor texture, scrolling pause, reading progress, and mobile scroll effects.
- `js/modules/theme.js`: theme persistence and controls. `window.setTheme('light' | 'dark' | 'system')` remains available.
- `js/modules/terminal-input.js` and `animations.js`: terminal input and its opt-in matrix effect.
- `css/site.css`, `animations.css`, `responsive.css`: design, motion, and responsive/print rules.

The old ASCII-title, CRT, curvature, and modal modules remain inactive. The monitor overlay reuses the cached `img/crt-noise.png` texture without loading the legacy CRT/curvature runtime or applying screen-wide filters.

## Visual asset sources

- `img/projects/goksorry.jpg`: actual public [Goksorry](https://goksorry.com) screen captured on 2026-11-06, after dismissing onboarding and optional cookies. This is a static portfolio image, not live market data.
- `img/projects/frequaw.png`: official screenshot from the [Frequaw Play Store listing](https://play.google.com/store/apps/details?id=kim.jujin.frequaw), retrieved on 2026-11-06.
- Samsung Weather and CrypticWiki use custom typographic artwork, not simulated product interfaces. CrypticWiki returned a connection timeout during asset collection.
- Variable fonts are from Google Fonts. Their SIL Open Font Licenses are included in `fonts/spacegrotesk-OFL.txt` and `fonts/jetbrainsmono-OFL.txt`.

## Verification

Check the JavaScript modules with `node --check` and whitespace with `git diff --check`. In a browser, verify 360, 390, 768, 1440, and 1920px widths; Light/Dark/System; reduced motion; keyboard-only navigation; direct anchors and Back; terminal commands/history/focus; failed project/profile images; and JavaScript disabled.

Local browser checks do not prove production deployment. Publishing is a separate step.

## Author and license

[Jujin Kim](https://github.com/jujinkim) · [LinkedIn](https://linkedin.com/in/jujinkim) · [jk@jujin.kim](mailto:jk@jujin.kim)

Personal portfolio — all rights reserved, except fonts distributed under their included licenses.
