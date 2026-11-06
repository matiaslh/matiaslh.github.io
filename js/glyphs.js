// Far parallax layer: a sparse field of dim terminal characters on a canvas.
// It scrolls itself (scrollY × depth) over an infinite hashed grid, cells
// flicker like terminal activity, and glyphs near the mouse light up.

import { hash2 } from './util.js';

const CHARS = '01{}[]()<>/\\|=+-*&$#@%;:._~^!?abcdefxyz'.split('');
const CELL = 22;
const DENSITY = 11;          // % of cells that hold a glyph
const FPS = 14;

export function initGlyphs({ reduceMotion }) {
  const canvas = document.querySelector('.parallax__glyphs');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const depth = Number(canvas.dataset.depth) || 0.1;

  let w = 0, h = 0, dpr = 1;
  let mouse = { x: -9999, y: -9999 };
  const hot = new Map();      // "c,r" -> brightness 0..1 (decays)

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `500 13px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    draw();
  };

  const draw = () => {
    const offset = reduceMotion ? 0 : window.scrollY * depth;
    const firstRow = Math.floor(offset / CELL);
    const shift = offset - firstRow * CELL;
    const cols = Math.ceil(w / CELL) + 1;
    const rows = Math.ceil(h / CELL) + 2;

    ctx.clearRect(0, 0, w, h);
    for (let r = 0; r < rows; r++) {
      const gr = firstRow + r;
      const y = r * CELL - shift + CELL / 2;
      for (let c = 0; c < cols; c++) {
        const key = `${c},${gr}`;
        const heat = hot.get(key) || 0;
        const hv = hash2(c, gr);
        if (hv % 100 >= DENSITY && heat === 0) continue;

        const x = c * CELL + CELL / 2;
        const dx = x - mouse.x, dy = y - mouse.y;
        const near = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 160);

        let alpha = 0.05 + ((hv >>> 8) % 7) * 0.012;
        alpha = Math.min(0.85, alpha + heat * 0.55 + near * 0.35);
        const cyan = (hv >>> 4) % 5 === 0;
        ctx.fillStyle = cyan ? `rgba(121,192,255,${alpha})` : `rgba(126,231,135,${alpha})`;
        const ch = heat > 0.5 ? CHARS[(hv + Math.floor(heat * 10)) % CHARS.length] : CHARS[hv % CHARS.length];
        ctx.fillText(ch, x, y);
      }
    }
  };

  window.addEventListener('resize', resize);
  resize();
  document.fonts?.ready.then(resize);
  if (reduceMotion) return;

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    mouse = { x: e.clientX, y: e.clientY };
  }, { passive: true });
  document.addEventListener('pointerleave', () => { mouse = { x: -9999, y: -9999 }; });

  // flicker loop at a low frame rate; pauses when the tab is hidden
  let last = 0;
  const loop = (t) => {
    requestAnimationFrame(loop);
    if (document.hidden || t - last < 1000 / FPS) return;
    last = t;

    // spark a few random cells, sometimes a short vertical "stream"
    const firstRow = Math.floor((window.scrollY * depth) / CELL);
    const cols = Math.ceil(w / CELL), rows = Math.ceil(h / CELL);
    for (let i = 0; i < 3; i++) {
      hot.set(`${Math.floor(Math.random() * cols)},${firstRow + Math.floor(Math.random() * rows)}`, 1);
    }
    if (Math.random() < 0.08) {
      const c = Math.floor(Math.random() * cols);
      const r0 = firstRow + Math.floor(Math.random() * rows);
      for (let k = 0; k < 6; k++) hot.set(`${c},${r0 + k}`, 1 - k * 0.12);
    }
    for (const [k, v] of hot) {
      const nv = v - 0.07;
      if (nv <= 0) hot.delete(k); else hot.set(k, nv);
    }
    draw();
  };
  requestAnimationFrame(loop);
}
