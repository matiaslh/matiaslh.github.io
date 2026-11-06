// Typing effects: the hero intro sequence and per-section command typing.
import { sleep } from './util.js';

let skipAll = false;

/** Type the text already inside `el` one character at a time. */
export async function typeInto(el, { speed = 38, reduceMotion = false } = {}) {
  const text = el.dataset.fullText ?? el.textContent;
  el.dataset.fullText = text;
  if (reduceMotion || skipAll) { el.textContent = text; return; }

  el.textContent = '';
  el.classList.add('is-typing');
  for (let i = 0; i < text.length; i++) {
    if (skipAll) break;
    el.textContent = text.slice(0, i + 1);
    await sleep(speed + Math.random() * speed * 0.6);
  }
  el.textContent = text;
  el.classList.remove('is-typing');
}

/** "Decode" effect: random glyphs resolve left-to-right into the real text. */
async function decode(el, { duration = 700 } = {}) {
  const text = el.textContent;
  const pool = '!<>-_\\/[]{}=+*^?#$%&01';
  const start = performance.now();
  return new Promise((resolve) => {
    const frame = (t) => {
      const p = Math.min(1, (t - start) / duration);
      if (skipAll || p >= 1) { el.textContent = text; resolve(); return; }
      const solved = Math.floor(text.length * p);
      let out = text.slice(0, solved);
      for (let i = solved; i < text.length; i++) {
        out += text[i] === ' ' ? ' ' : pool[Math.floor(Math.random() * pool.length)];
      }
      el.textContent = out;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

/** Hero: type each command, then reveal its output, then show the shell. */
export async function runHeroIntro({ reduceMotion }) {
  const steps = [...document.querySelectorAll('[data-hero-step]')];
  const reveal = (el) => { el.hidden = false; el.classList.remove('is-pending'); };

  if (reduceMotion) { steps.forEach(reveal); return; }

  // any interaction fast-forwards the intro
  const skip = () => { skipAll = true; };
  const opts = { once: true, passive: true };
  ['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach((ev) => window.addEventListener(ev, skip, opts));

  steps.forEach((el) => el.classList.add('is-pending'));
  await sleep(250);

  for (const el of steps) {
    reveal(el);
    if (el.classList.contains('cmd')) {
      await typeInto(el.querySelector('.cmd__text'), { speed: 55 });
      if (!skipAll) await sleep(160);
    } else if (el.classList.contains('hero__name')) {
      await decode(el, { duration: 650 });
      if (!skipAll) await sleep(120);
    } else if (!skipAll) {
      await sleep(140);
    }
  }

  ['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach((ev) => window.removeEventListener(ev, skip));
  skipAll = false;   // later section typing should still animate
}
