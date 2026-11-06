// Window manager: makes every .window behave like a real terminal window.
//   red    close     → window exits; a "[n]+ Terminated" notification with a reopen button pops up bottom-right
//   yellow minimize  → window shrinks into the dock at the bottom of the screen
//   green  maximize  → window fills the screen (Esc, the button again or double-click the bar to restore)
//   drag the title bar to move, drag the edges / corner to resize (wide screens only)
// Windows keep their place in the page flow; moving uses the CSS `translate` property
// as an offset from that place, so the layout around them never shifts.

const STATUS_H = 44;
const MIN_W = 320;
const MIN_H = 150;
const narrow = window.matchMedia('(max-width: 720px)');

const states = new Map();      // window element -> state
let zTop = 10;
let jobSeq = 0;
let reduceMotion = false;
let dock, dockItems, backdrop, toasts;

export function initWindows(opts = {}) {
  reduceMotion = !!opts.reduceMotion;
  createDock();
  createToasts();
  createBackdrop();
  document.querySelectorAll('.window').forEach(enhance);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const max = document.querySelector('.window.is-maximized');
    if (max) toggleMaximize(max);
  });

  // following a link / tab to a section brings its window back if it was closed or minimized
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (a) restoreSection(a.getAttribute('href').slice(1));
  }, true);
  window.addEventListener('hashchange', () => restoreSection(location.hash.slice(1)));

  // on small screens windows are always in their default place and size
  narrow.addEventListener('change', () => { if (narrow.matches) states.forEach((_, w) => clearGeometry(w)); });
}

// ───────────────────────── public API (used by the shell) ─────────────────────────

export function listJobs() {
  return [...states.values()]
    .filter((s) => s.win.classList.contains('is-closed') || s.win.classList.contains('is-minimized'))
    .sort((a, b) => a.hiddenAt - b.hiddenAt)
    .map((s) => ({ job: s.job, title: s.title, status: s.win.classList.contains('is-closed') ? 'Terminated' : 'Stopped' }));
}

/** Bring back the most recently hidden window (or job number n). Returns its title, or null. */
export function foreground(n) {
  const hidden = [...states.values()]
    .filter((s) => s.win.classList.contains('is-closed') || s.win.classList.contains('is-minimized'))
    .sort((a, b) => b.hiddenAt - a.hiddenAt);
  const s = n ? hidden.find((h) => h.job === n) : hidden[0];
  if (!s) return null;
  restore(s.win);
  return s.title;
}

/** Put every window back where it started. */
export function resetWindows() {
  states.forEach((s, win) => {
    if (win.classList.contains('is-maximized')) toggleMaximize(win, { instant: true });
    if (isHidden(win) || s.busy) restore(win, { instant: true, scroll: false });
    clearGeometry(win);
  });
}

export function closeWindowOf(sectionId) {
  const win = document.getElementById(sectionId)?.querySelector('.window');
  if (win) closeWindow(win);
}

// ───────────────────────── setup ─────────────────────────

function enhance(win) {
  const titleEl = win.querySelector('.window__title');
  const title = titleEl?.textContent.trim() || 'terminal';
  const state = { win, title, job: ++jobSeq, tx: 0, ty: 0, hiddenAt: 0 };
  states.set(win, state);

  // decorative dots → real buttons
  const controls = document.createElement('div');
  controls.className = 'window__controls';
  for (const [action, label] of [['close', 'Close'], ['minimize', 'Minimize'], ['maximize', 'Maximize']]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `wc wc--${action}`;
    b.dataset.action = action;
    b.setAttribute('aria-label', `${label} ${title}`);
    b.title = label;
    controls.append(b);
  }
  win.querySelector('.window__dots')?.replaceWith(controls);
  controls.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'close') closeWindow(win);
    else if (action === 'minimize') minimize(win);
    else if (action === 'maximize') toggleMaximize(win);
  });

  // resize handles
  for (const dir of ['e', 'w', 's', 'se', 'sw']) {
    const h = document.createElement('div');
    h.className = `win-resize win-resize--${dir}`;
    h.dataset.dir = dir;
    h.setAttribute('aria-hidden', 'true');
    h.addEventListener('pointerdown', (e) => startResize(e, win, dir));
    win.append(h);
  }

  const bar = win.querySelector('.window__bar');
  bar.addEventListener('pointerdown', (e) => startDrag(e, win, bar));
  bar.addEventListener('dblclick', (e) => { if (!e.target.closest('button')) toggleMaximize(win); });

  win.addEventListener('pointerdown', () => bringToFront(win), true);
}

function createDock() {
  dock = document.createElement('div');
  dock.className = 'dock';
  dock.setAttribute('role', 'toolbar');
  dock.setAttribute('aria-label', 'Minimized windows');
  dock.hidden = true;
  const label = document.createElement('span');
  label.className = 'dock__label';
  label.textContent = 'jobs';
  dockItems = document.createElement('div');
  dockItems.className = 'dock__items';
  dock.append(label, dockItems);
  document.body.append(dock);
}

function createBackdrop() {
  backdrop = document.createElement('div');
  backdrop.className = 'win-backdrop';
  backdrop.hidden = true;
  backdrop.addEventListener('click', () => {
    const max = document.querySelector('.window.is-maximized');
    if (max) toggleMaximize(max);
  });
  // inside <main> so it shares a stacking context with the windows
  document.querySelector('main').prepend(backdrop);
}

// ───────────────────────── close / minimize / restore ─────────────────────────

function closeWindow(win) {
  const s = states.get(win);
  if (s.busy || isHidden(win)) return s.busy;
  s.busy = doClose(win, s).finally(() => { s.busy = null; });
  return s.busy;
}

async function doClose(win, s) {
  if (win.classList.contains('is-maximized')) toggleMaximize(win, { instant: true });
  await play(win, [
    { opacity: 1, transform: 'scale(1)' },
    { opacity: 0, transform: 'scale(0.96)' },
  ], 170, 'ease-in');
  win.classList.add('is-closed');
  s.hiddenAt = performance.now();

  s.toast = showToast(s, win);
}

// ───────────────────────── notifications (bottom-right) ─────────────────────────

function createToasts() {
  toasts = document.createElement('div');
  toasts.className = 'toasts';
  toasts.setAttribute('role', 'status');
  toasts.setAttribute('aria-live', 'polite');
  toasts.setAttribute('aria-label', 'Notifications');
  document.body.append(toasts);
}

function showToast(s, win) {
  const t = document.createElement('div');
  t.className = 'toast';
  const head = document.createElement('p'); head.className = 'toast__head';
  const job = document.createElement('span'); job.className = 'c-dim'; job.textContent = `[${s.job}]+`;
  const status = document.createElement('span'); status.className = 'c-red'; status.textContent = 'Terminated';
  head.append(job, ' ', status);
  const name = document.createElement('p'); name.className = 'toast__title'; name.textContent = s.title;
  const actions = document.createElement('div'); actions.className = 'toast__actions';
  const reopen = document.createElement('button'); reopen.type = 'button'; reopen.className = 'toast__btn'; reopen.textContent = '↻ reopen';
  reopen.setAttribute('aria-label', `Reopen ${s.title}`);
  reopen.addEventListener('click', () => restore(win));
  const close = document.createElement('button'); close.type = 'button'; close.className = 'toast__close'; close.textContent = '×';
  close.setAttribute('aria-label', 'Dismiss notification');
  close.addEventListener('click', () => { dismissToast(s.toast); s.toast = null; });
  actions.append(reopen);
  t.append(head, name, actions, close);
  toasts.append(t);
  return t;
}

function dismissToast(t) {
  if (!t) return;
  if (reduceMotion || !t.animate) { t.remove(); return; }
  t.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(110%)' }],
    { duration: 220, easing: 'ease-in' }).finished.catch(() => {}).then(() => t.remove());
}

function minimize(win) {
  const s = states.get(win);
  if (s.busy || isHidden(win)) return s.busy;
  s.busy = doMinimize(win, s).finally(() => { s.busy = null; });
  return s.busy;
}

async function doMinimize(win, s) {
  if (win.classList.contains('is-maximized')) toggleMaximize(win, { instant: true });

  const item = document.createElement('button');
  item.type = 'button';
  item.className = 'dock__item';
  item.textContent = `[${s.job}] ${s.title}`;
  item.setAttribute('aria-label', `Restore ${s.title}`);
  item.addEventListener('click', () => restore(win));
  s.dockItem = item;
  dockItems.append(item);
  dock.hidden = false;

  const r = win.getBoundingClientRect();
  const d = item.getBoundingClientRect();
  const dx = d.left + d.width / 2 - (r.left + r.width / 2);
  const dy = d.top + d.height / 2 - (r.top + r.height / 2);
  await play(win, [
    { opacity: 1, transform: 'translate(0, 0) scale(1)' },
    { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(0.06)` },
  ], 380, 'cubic-bezier(0.55, 0, 0.75, 0.2)');
  win.classList.add('is-minimized');
  s.hiddenAt = performance.now();
  item.classList.add('is-new');
}

async function restore(win, { instant = false, scroll = true } = {}) {
  const s = states.get(win);
  if (s.busy) await s.busy;            // a close/minimize is still animating: let it finish, then undo it
  if (!isHidden(win)) return;
  const fromDock = win.classList.contains('is-minimized') ? s.dockItem?.getBoundingClientRect() : null;

  dismissToast(s.toast); s.toast = null;
  s.dockItem?.remove(); s.dockItem = null;
  dock.hidden = !dockItems.children.length;
  win.classList.remove('is-closed', 'is-minimized');
  win.classList.add('is-visible');                       // in case it was hidden before it was revealed
  win.querySelector('.output')?.classList.add('is-visible');
  bringToFront(win);
  if (instant) return;

  const r = win.getBoundingClientRect();
  const onScreen = r.top < window.innerHeight && r.bottom > STATUS_H;
  if (fromDock && onScreen) {
    const dx = fromDock.left + fromDock.width / 2 - (r.left + r.width / 2);
    const dy = fromDock.top + fromDock.height / 2 - (r.top + r.height / 2);
    await play(win, [
      { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(0.06)` },
      { opacity: 1, transform: 'translate(0, 0) scale(1)' },
    ], 380, 'cubic-bezier(0.2, 0.8, 0.3, 1)');
  } else {
    if (scroll && !onScreen) win.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    await play(win, [
      { opacity: 0, transform: 'scale(0.96)' },
      { opacity: 1, transform: 'scale(1)' },
    ], 220, 'ease-out');
  }
}

function restoreSection(id) {
  const win = id && document.getElementById(id)?.querySelector('.window');
  if (win && (isHidden(win) || states.get(win).busy)) restore(win, { scroll: false });
}

// ───────────────────────── maximize ─────────────────────────

function toggleMaximize(win, { instant = false } = {}) {
  const s = states.get(win);
  const first = win.getBoundingClientRect();
  const btn = win.querySelector('.wc--maximize');

  if (!win.classList.contains('is-maximized')) {
    // keep the window's slot in the page so nothing below jumps
    s.placeholder = document.createElement('div');
    s.placeholder.className = 'win-placeholder';
    s.placeholder.style.height = `${first.height}px`;
    win.before(s.placeholder);
    win.style.translate = '';
    win.classList.add('is-maximized');
    backdrop.hidden = false;
    document.documentElement.classList.add('has-maximized');
    btn?.setAttribute('aria-label', `Restore ${s.title}`);
    if (btn) btn.title = 'Restore';
  } else {
    win.classList.remove('is-maximized');
    s.placeholder?.remove(); s.placeholder = null;
    setOffset(win, s.tx, s.ty);
    backdrop.hidden = true;
    document.documentElement.classList.remove('has-maximized');
    btn?.setAttribute('aria-label', `Maximize ${s.title}`);
    if (btn) btn.title = 'Maximize';
  }
  if (instant || reduceMotion) return;

  // FLIP: animate from the old box to the new one
  const last = win.getBoundingClientRect();
  if (!last.width || !last.height) return;
  win.animate([
    {
      transformOrigin: '0 0',
      transform: `translate(${first.left - last.left}px, ${first.top - last.top}px) scale(${first.width / last.width}, ${first.height / last.height})`,
    },
    { transformOrigin: '0 0', transform: 'none' },
  ], { duration: 240, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' });
}

// ───────────────────────── drag ─────────────────────────

function startDrag(e, win, bar) {
  if (e.button !== 0 || e.target.closest('button') || narrow.matches) return;
  if (win.classList.contains('is-maximized')) return;
  e.preventDefault();
  const s = states.get(win);
  const start = { x: e.clientX, y: e.clientY, tx: s.tx, ty: s.ty, rect: win.getBoundingClientRect() };
  let moved = false;

  bar.setPointerCapture(e.pointerId);
  const move = (ev) => {
    let dx = ev.clientX - start.x;
    let dy = ev.clientY - start.y;
    if (!moved && Math.hypot(dx, dy) < 3) return;
    if (!moved) { moved = true; win.classList.add('is-dragging'); document.documentElement.classList.add('is-moving-window'); }
    // keep enough of the title bar on screen to grab it again
    const left = start.rect.left + dx;
    const top = start.rect.top + dy;
    dx += clamp(left, 120 - start.rect.width, window.innerWidth - 120) - left;
    dy += clamp(top, STATUS_H, window.innerHeight - 40) - top;
    setOffset(win, start.tx + dx, start.ty + dy);
  };
  const end = () => {
    bar.removeEventListener('pointermove', move);
    bar.removeEventListener('pointerup', end);
    bar.removeEventListener('pointercancel', end);
    win.classList.remove('is-dragging');
    document.documentElement.classList.remove('is-moving-window');
  };
  bar.addEventListener('pointermove', move);
  bar.addEventListener('pointerup', end);
  bar.addEventListener('pointercancel', end);
}

// ───────────────────────── resize ─────────────────────────

function startResize(e, win, dir) {
  if (e.button !== 0 || narrow.matches || win.classList.contains('is-maximized')) return;
  e.preventDefault();
  e.stopPropagation();
  const s = states.get(win);
  const r = win.getBoundingClientRect();
  const maxW = Math.max(MIN_W, win.parentElement.clientWidth);
  const start = { x: e.clientX, y: e.clientY, w: r.width, h: r.height, left: r.left };

  e.currentTarget.setPointerCapture(e.pointerId);
  win.classList.add('is-resizing', 'is-sized');
  document.documentElement.classList.add('is-moving-window');
  win.style.maxWidth = 'none';
  win.style.width = `${r.width}px`;
  win.style.height = `${r.height}px`;

  const handle = e.currentTarget;
  const move = (ev) => {
    const dx = ev.clientX - start.x;
    const dy = ev.clientY - start.y;
    let w = start.w;
    let h = start.h;
    if (dir.includes('e')) w = start.w + dx;
    if (dir.includes('w')) w = start.w - dx;
    if (dir.includes('s')) h = start.h + dy;
    w = clamp(w, MIN_W, maxW);
    h = Math.max(MIN_H, h);
    // the edge you're not dragging stays put
    const wantLeft = dir.includes('w') ? start.left + (start.w - w) : start.left;
    win.style.width = `${w}px`;
    win.style.height = `${h}px`;
    const nowLeft = win.getBoundingClientRect().left;   // auto margins re-centre it; undo that with the offset
    setOffset(win, s.tx + (wantLeft - nowLeft), s.ty);
  };
  const end = () => {
    handle.removeEventListener('pointermove', move);
    handle.removeEventListener('pointerup', end);
    handle.removeEventListener('pointercancel', end);
    win.classList.remove('is-resizing');
    document.documentElement.classList.remove('is-moving-window');
  };
  handle.addEventListener('pointermove', move);
  handle.addEventListener('pointerup', end);
  handle.addEventListener('pointercancel', end);
}

// ───────────────────────── helpers ─────────────────────────

const isHidden = (win) => win.classList.contains('is-closed') || win.classList.contains('is-minimized');

function setOffset(win, tx, ty) {
  const s = states.get(win);
  s.tx = tx; s.ty = ty;
  win.style.translate = tx || ty ? `${tx.toFixed(1)}px ${ty.toFixed(1)}px` : '';
}

function clearGeometry(win) {
  const s = states.get(win);
  s.tx = 0; s.ty = 0;
  win.style.translate = '';
  win.style.width = '';
  win.style.height = '';
  win.style.maxWidth = '';
  win.style.zIndex = '';
  win.classList.remove('is-sized');
}

function bringToFront(win) {
  if (win.classList.contains('is-maximized')) return;
  win.style.zIndex = String(++zTop);
}

function play(el, frames, duration, easing) {
  if (reduceMotion || !el.animate) return Promise.resolve();
  return el.animate(frames, { duration, easing }).finished.catch(() => {});
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
