// Parallax background.
// Each .parallax__layer moves by -scrollY × depth, plus a small mouse drift,
// so far layers crawl and near layers rush past. Repeating layers (the dot
// grid) wrap with a modulo so they never run out; the snippet and symbol
// layers are generated tall enough to cover the full scroll range.

import { SNIPPETS, SYMBOLS, renderSnippet } from './snippets.js';
import { rng } from './util.js';

export function initParallax({ reduceMotion }) {
  const root = document.querySelector('.parallax');
  if (!root) return;

  const layers = [...root.querySelectorAll('.parallax__layer')].map((el) => ({
    el,
    depth: Number(el.dataset.depth) || 0,
    repeat: Number(el.dataset.repeat) || 0,
  }));
  const codeLayer = root.querySelector('.parallax__code');
  const symbolLayer = root.querySelector('.parallax__symbols');

  const populate = () => {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);

    for (const layer of layers) {
      if (layer.repeat) continue;
      layer.el.style.height = `${Math.ceil(vh + maxScroll * layer.depth + 160)}px`;
    }
    if (codeLayer) fillSnippets(codeLayer, vw, parseFloat(codeLayer.style.height));
    if (symbolLayer) fillSymbols(symbolLayer, vw, parseFloat(symbolLayer.style.height));
  };

  populate();
  if (reduceMotion) {
    // static background: no movement at all
    window.addEventListener('resize', debounce(populate, 200));
    return;
  }

  // ── animation state ──
  let mouseX = 0, mouseY = 0;        // target, -1..1
  let curX = 0, curY = 0;            // eased
  let ticking = false;

  const render = () => {
    ticking = false;
    curX += (mouseX - curX) * 0.08;
    curY += (mouseY - curY) * 0.08;
    const y = window.scrollY;

    for (const { el, depth, repeat } of layers) {
      let ty = -y * depth;
      if (repeat) ty %= repeat;
      const tx = curX * depth * 28;
      ty += curY * depth * 18;
      el.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`;
    }

    // keep easing towards the mouse target
    if (Math.abs(mouseX - curX) > 0.001 || Math.abs(mouseY - curY) > 0.001) request();
  };
  const request = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(render); }
  };

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    request();
  }, { passive: true });
  window.addEventListener('resize', debounce(() => { populate(); request(); }, 200));
  // content height can change once fonts load
  document.fonts?.ready.then(() => { populate(); request(); });

  request();
}

function fillSnippets(layer, vw, height) {
  const rand = rng(7);
  layer.replaceChildren();
  const cellW = vw < 700 ? 260 : 380;
  const cellH = 300;
  const cols = Math.max(2, Math.ceil(vw / cellW));
  const rows = Math.ceil(height / cellH);
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rand() < 0.35) continue;                // leave gaps so it breathes
      const pre = document.createElement('pre');
      pre.className = 'bg-snippet';
      pre.innerHTML = renderSnippet(SNIPPETS[i++ % SNIPPETS.length]);
      const x = (c + rand() * 0.55) * (vw / cols) - 30;
      const y = r * cellH + rand() * (cellH * 0.6);
      pre.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px)`;
      layer.append(pre);
    }
  }
}

function fillSymbols(layer, vw, height) {
  const rand = rng(42);
  layer.replaceChildren();
  const count = Math.ceil((height / 420) * (vw < 700 ? 1.2 : 2.2));
  for (let i = 0; i < count; i++) {
    const span = document.createElement('span');
    span.className = 'bg-symbol';
    span.textContent = SYMBOLS[Math.floor(rand() * SYMBOLS.length)];
    const size = 40 + rand() * (vw < 700 ? 60 : 110);
    span.style.fontSize = `${size.toFixed(0)}px`;
    span.style.left = `${(rand() * 100).toFixed(2)}%`;
    span.style.top = `${(rand() * height).toFixed(0)}px`;
    span.style.transform = `rotate(${((rand() - 0.5) * 24).toFixed(1)}deg)`;
    layer.append(span);
  }
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
