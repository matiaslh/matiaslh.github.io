// Status bar: highlight the section in view and show New York time.

let pinSection = () => {};

/** Highlight a section's tab and keep it highlighted until the visitor scrolls (used by tab clicks and `cd`). */
export function markActive(id) { pinSection(id); }

export function initStatusbar() {
  const links = new Map(
    [...document.querySelectorAll('[data-nav]')].map((a) => [a.getAttribute('href').slice(1), a])
  );
  const sections = [...links.keys()].map((id) => document.getElementById(id)).filter(Boolean);
  let current;
  let pinned = null;     // a tab the visitor clicked: wins until they scroll themselves
  let ticking = false;

  const setActive = (id) => {
    if (id === current) return;
    current = id;
    for (const [key, a] of links) {
      if (key === id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
    // keep the active tab visible on narrow screens (scroll the tab strip only, never the page)
    const a = links.get(id);
    const strip = a?.closest('.statusbar__nav');
    if (a && strip && strip.scrollWidth > strip.clientWidth) {
      strip.scrollTo({ left: a.offsetLeft - strip.clientWidth / 2 + a.offsetWidth / 2, behavior: 'smooth' });
    }
  };

  // Active section = the last one whose top has passed 40% of the viewport.
  // At the very bottom of the page the last section wins: short final sections
  // (contact) can never scroll far enough up to reach that line on their own.
  const compute = () => {
    ticking = false;
    if (pinned) { setActive(pinned); return; }
    const doc = document.documentElement;
    if (window.scrollY > 0 && window.scrollY + window.innerHeight >= doc.scrollHeight - 4) {
      setActive(sections.at(-1)?.id);
      return;
    }
    const line = window.innerHeight * 0.4;
    let active = null;
    for (const s of sections) {
      const box = s.querySelector('.window:not(.is-closed):not(.is-minimized)') || s;
      if (box.getBoundingClientRect().top <= line) active = s.id;
    }
    setActive(active);
  };
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(compute); } };

  pinSection = (id) => {
    if (links.has(id)) { pinned = id; setActive(id); }
    else { pinned = null; request(); }          // e.g. #home: no tab, follow the scroll position
  };
  // any in-page link (tabs, brand, "scroll ↓", …) decides the highlight
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (a) pinSection(a.getAttribute('href').slice(1));
  });

  // the visitor scrolling by hand releases a pinned tab
  const release = () => { if (pinned) { pinned = null; request(); } };
  window.addEventListener('wheel', release, { passive: true });
  window.addEventListener('touchmove', release, { passive: true });
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key) && !e.target.closest('input, textarea')) release();
  });

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  request();

  // clock
  const clock = document.querySelector('[data-clock]');
  if (clock) {
    const fmt = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/New_York',
    });
    const tick = () => { clock.textContent = `NYC ${fmt.format(new Date())}`; };
    tick();
    setInterval(tick, 15_000);
  }

  // neofetch "Uptime": time at Meta since Aug 2022
  const uptime = document.querySelector('[data-uptime]');
  if (uptime) {
    const now = new Date();
    const months = (now.getFullYear() - 2022) * 12 + (now.getMonth() - 7);
    const y = Math.floor(months / 12), m = months % 12;
    const parts = [];
    if (y) parts.push(`${y} yr${y === 1 ? '' : 's'}`);
    if (m) parts.push(`${m} mo${m === 1 ? '' : 's'}`);
    uptime.textContent = `${parts.join(', ') || 'just started'} at Meta`;
  }

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
}
