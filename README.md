# matiaslh.github.io (terminal portfolio)

Personal site for Matias Levy-Hara: a terminal-themed single page with a
multi-layer parallax background and a small interactive shell.

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
js/
  main.js            entry point
  parallax.js        moves layers by scroll × depth (+ mouse drift)
  glyphs.js          far layer: canvas of flickering characters
  snippets.js        code snippets / symbols for the mid & near layers
  typing.js          hero intro + command typing
  reveal.js          reveal sections on scroll
  statusbar.js       active-section tabs + New York clock
  shell.js           interactive shell (help, ls, cat, cd, open, ...)
  util.js            seeded RNG, hashing, helpers
assets/
  favicon.svg
  matias-levy-hara-resume.pdf
```

## Editing content

- **Profile text** lives directly in `index.html` (about, skills, experience, education, contact).
- **The shell's copy** of the same content (`cat about.md`, `cat experience.log`, …) is in the
  `FILES` object at the top of `js/shell.js`. Update both when the resume changes.
- **Resume PDF:** replace `assets/matias-levy-hara-resume.pdf`.

## Parallax tuning

Each background layer has a `data-depth` in `index.html` (0 = fixed, 1 = moves with the page):
glyph canvas `0.12`, dot grid `0.25`, code snippets `0.45`, big symbols `0.8`.
Visitors with *reduce motion* turned on get a static background and no typing animation.
Add `?still` to the URL (e.g. `http://localhost:8000/?still`) to force that mode; it's handy for screenshots.

## Deploy (GitHub Pages)

This replaces the old Jekyll site in the `matiaslh/matiaslh.github.io` repo. The
`.nojekyll` file tells Pages to serve the files as-is instead of running Jekyll.
