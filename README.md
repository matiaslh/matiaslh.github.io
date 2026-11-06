# matiaslh.github.io (terminal portfolio)

Personal site for Matias Levy-Hara: a terminal-themed single page with a
multi-layer parallax background, working terminal windows (close, minimize,
maximize, drag, resize) and a small interactive shell.

No build step and no dependencies. It's plain HTML, CSS and ES modules, so
GitHub Pages can serve the folder as-is.

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

(ES modules don't load from `file://`, so use a local server.)

## Structure

```
index.html           all page content (works without JS)
404.html             "command not found" page
css/
  base.css           theme colours, fonts, reset
  parallax.css       background layers + CRT overlay
  layout.css         status bar, windows, sections, reveal animations
  terminal.css       interactive shell
  windows.css        window controls, dock, stubs, maximize, resize handles, neofetch card
js/
  main.js            entry point
  parallax.js        moves layers by scroll × depth (+ mouse drift)
  glyphs.js          far layer: canvas of flickering characters
  snippets.js        code snippets / symbols for the mid & near layers
  typing.js          hero intro + command typing
  reveal.js          reveal sections on scroll
  statusbar.js       active-section tabs + New York clock
  shell.js           interactive shell (help, ls, cat, cd, open, neofetch, jobs, fg, reset, exit, ...)
  windows.js         window manager: close / minimize-to-dock / maximize, drag, resize
  util.js            seeded RNG, hashing, helpers
assets/
  favicon.svg
```

## Editing content

- **Profile text** lives directly in `index.html` (about, skills, experience, education, contact).
- **The shell's copy** of the same content (`cat about.md`, `cat experience.log`, …) is in the
  `FILES` object at the top of `js/shell.js`. Update both when your experience changes.

## Windows

Every `.window` gets working traffic-light buttons from `js/windows.js`:

- **close** leaves a `[n]+ Terminated` line with a reopen button
- **minimize** sends the window to the dock at the bottom of the screen
- **maximize** fills the screen; Esc, the button again or double-clicking the title bar restores it
- **drag** the title bar to move; **resize** from the left/right/bottom edges or the corners

Drag and resize are desktop-only (wider than 720px). In the shell, `jobs` lists closed and minimized
windows, `fg` brings the last one back, `reset` puts everything back in place and `exit` closes the terminal.

If the JavaScript fails to load (e.g. the page is opened straight from `file://` in Chrome), an inline
failsafe in `index.html` shows all content without the effects.

## Parallax tuning

Each background layer has a `data-depth` in `index.html` (0 = fixed, 1 = moves with the page):
glyph canvas `0.12`, dot grid `0.25`, code snippets `0.45`, big symbols `0.8`.
Visitors with *reduce motion* turned on get a static background and no typing animation.
Add `?still` to the URL (e.g. `http://localhost:8000/?still`) to force that mode; it's handy for screenshots.

## Deploy (GitHub Pages)

This replaces the old Jekyll site in the `matiaslh/matiaslh.github.io` repo. The
`.nojekyll` file tells Pages to serve the files as-is instead of running Jekyll.
