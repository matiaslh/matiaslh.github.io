// Status bar: highlight the section in view and show New York time.

export function initStatusbar() {
  const links = new Map(
    [...document.querySelectorAll('[data-nav]')].map((a) => [a.getAttribute('href').slice(1), a])
  );

  const setActive = (id) => {
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

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main > section[id]').forEach((s) => io.observe(s));
  }

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

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
}
