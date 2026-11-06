// Reveal each section's window as it scrolls into view, type its command,
// then fade in the output.
import { typeInto } from './typing.js';

export function initReveal({ reduceMotion }) {
  const windows = [...document.querySelectorAll('.section .window')];

  const show = async (win) => {
    win.classList.add('is-visible');
    const cmd = win.querySelector('[data-type]');
    const out = win.querySelector('.output');
    if (cmd) await typeInto(cmd, { speed: 30, reduceMotion });
    out?.classList.add('is-visible');
  };

  if (reduceMotion || !('IntersectionObserver' in window)) {
    windows.forEach((w) => { w.classList.add('is-visible'); w.querySelector('.output')?.classList.add('is-visible'); });
    return;
  }

  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      io.unobserve(entry.target);
      show(entry.target);
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  windows.forEach((w) => io.observe(w));

  // If someone jumps straight to a section (link / hash), don't make them wait.
  window.addEventListener('hashchange', () => {
    const target = document.querySelector(location.hash);
    const win = target?.querySelector('.window');
    if (win && !win.classList.contains('is-visible')) { io.unobserve(win); show(win); }
  });
}
