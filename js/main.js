// Entry point. Every module is progressive enhancement: the page is complete
// and readable without JavaScript.
import { initParallax } from './parallax.js';
import { initGlyphs } from './glyphs.js';
import { runHeroIntro } from './typing.js';
import { initReveal } from './reveal.js';
import { initStatusbar } from './statusbar.js';
import { initShell } from './shell.js';
import { initWindows } from './windows.js';

// ?still renders everything immediately with a static background (handy for screenshots)
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  || new URLSearchParams(location.search).has('still');
document.documentElement.classList.toggle('reduce-motion', reduceMotion);
window.__siteReady = true;   // tells the inline failsafe in index.html the modules loaded

initStatusbar();
initGlyphs({ reduceMotion });
initParallax({ reduceMotion });
initWindows({ reduceMotion });
initShell();
initReveal({ reduceMotion });
runHeroIntro({ reduceMotion });
