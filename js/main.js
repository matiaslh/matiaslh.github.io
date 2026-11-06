// Entry point. Every module is progressive enhancement: the page is complete
// and readable without JavaScript.
import { initParallax } from './parallax.js';
import { initGlyphs } from './glyphs.js';
import { runHeroIntro } from './typing.js';
import { initReveal } from './reveal.js';
import { initStatusbar } from './statusbar.js';
import { initShell } from './shell.js';

// ?still renders everything immediately with a static background (handy for screenshots)
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  || new URLSearchParams(location.search).has('still');
document.documentElement.classList.toggle('reduce-motion', reduceMotion);

initStatusbar();
initGlyphs({ reduceMotion });
initParallax({ reduceMotion });
initShell();
initReveal({ reduceMotion });
runHeroIntro({ reduceMotion });
