// A tiny interactive shell in the hero window.
// Output is built with textContent only, so nothing typed is ever parsed as HTML.

const LINKS = {
  github:   'https://github.com/matiaslh',
  linkedin: 'https://www.linkedin.com/in/matiaslh',
  email:    'mailto:matiaslh@gmail.com',
};
import { listJobs, foreground, resetWindows, closeWindowOf } from './windows.js';

const SECTIONS = ['profile', 'about', 'skills', 'experience', 'education', 'contact'];

const FILES = {
  'about.md': [
    'Software engineer at Meta, Applied AI org, New York.',
    'I build expert-level tasks that frontier models struggle to solve;',
    'research scientists use them to benchmark and improve the models.',
    'Now: production-ready Godot games. Before: multi-turn terminal tasks.',
    'Previously: Meta Reality Labs (VR calling, avatars, Horizon Media Player) and AWS DocumentDB.',
  ],
  'skills.json': [
    '{',
    '  "languages":  ["Java", "Kotlin", "C++", "TypeScript", "Python"],',
    '  "frameworks": ["React", "React Native", "Angular", "GraphQL", "RxJS", "Godot"]',
    '}',
  ],
  'experience.log': [
    '7f3a2c1  2026–now   Software Engineer · Meta Platforms Applied AI · New York, NY',
    '3b9e04d  2022–2026  Software Engineer · Meta Platforms Reality Labs · Seattle, WA',
    'e51c8a0  2021–2022  Software Development Engineer · Amazon AWS · Toronto, ON',
    '9d27f6b  2020       Angular Developer · Tyler Technologies · Toronto, ON',
    '04a1e3f  2020       Software Developer · Camis Inc. · Guelph, ON',
  ],
  'education.yml': [
    'degree: Bachelor of Computing (Honours), Computer Science',
    'minor: Mathematics',
    'school: University of Guelph',
    'graduated: May 2021  # co-op certification, 6 work terms',
  ],
  'contact.sh': [
    'email     matiaslh@gmail.com',
    'linkedin  linkedin.com/in/matiaslh',
    'github    github.com/matiaslh',
  ],
};

const HELP = [
  ['help', 'show this list'],
  ['whoami', 'who is this?'],
  ['neofetch', 'system info (well, me)'],
  ['ls', 'list files'],
  ['cat <file>', 'print a file, e.g. cat about.md'],
  ['cd <section>', SECTIONS.join(' · ')],
  ['open <link>', 'github · linkedin · email'],
  ['./contact.sh', 'how to reach me'],
  ['jobs / fg', 'list or bring back closed & minimized windows'],
  ['reset', 'put every window back in place'],
  ['clear', 'clear the screen'],
  ['exit', 'close this terminal'],
];

export function initShell() {
  const shell = document.querySelector('[data-shell]');
  if (!shell) return;
  const out = shell.querySelector('[data-shell-output]');
  const form = shell.querySelector('[data-shell-form]');
  const input = shell.querySelector('[data-shell-input]');

  const history = [];
  let histIdx = 0;

  // ── output helpers ──
  const line = (text, kind = '') => {
    const div = document.createElement('div');
    div.className = `shell__line${kind ? ` shell__line--${kind}` : ''}`;
    div.textContent = text;
    out.append(div);
    return div;
  };
  const lines = (arr, kind) => arr.forEach((t) => line(t, kind));
  const helpTable = () => {
    const dl = document.createElement('dl');
    dl.className = 'shell__help';
    for (const [cmd, desc] of HELP) {
      const dt = document.createElement('dt'); dt.textContent = cmd;
      const dd = document.createElement('dd'); dd.textContent = desc;
      dl.append(dt, dd);
    }
    out.append(dl);
  };
  const goTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return false;
    el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    window.history.replaceState(null, '', `#${id}`);
    return true;
  };
  const openLink = (name) => {
    const url = LINKS[name];
    if (!url) return false;
    if (url.startsWith('mailto:')) window.location.href = url;
    else window.open(url, '_blank', 'noopener');
    return true;
  };

  // ── commands ──
  const commands = {
    help: () => helpTable(),
    whoami: () => line('Matias Levy-Hara — Software Engineer @ Meta Platforms Applied AI (New York, NY)'),
    pwd: () => line('/home/visitor'),
    ls: () => line(Object.keys(FILES).join('   '), 'ok'),
    cat: ([file]) => {
      if (!file) return line('cat: missing file operand. try: cat about.md', 'err');
      const body = FILES[file] || FILES[`${file}.md`];
      if (!body) return line(`cat: ${file}: No such file or directory`, 'err');
      lines(body);
    },
    cd: ([dir = '~']) => {
      const id = dir.replace(/^~?\/?/, '').replace(/\/$/, '');
      if (!id || id === '~' || id === '..') { goTo('home'); return; }
      if (!SECTIONS.includes(id)) return line(`cd: no such directory: ${dir}`, 'err');
      goTo(id);
      line(`→ ${id}`, 'dim');
    },
    open: ([name]) => {
      if (!name) return line('open: which one? github · linkedin · email', 'err');
      const key = name.replace(/\/$/, '');
      if (openLink(key)) line(`opening ${key}…`, 'dim');
      else line(`open: unknown link: ${name}`, 'err');
    },
    './contact.sh': () => { lines(FILES['contact.sh']); goTo('contact'); },
    clear: () => out.replaceChildren(),
    history: () => history.forEach((h, i) => line(`${String(i + 1).padStart(3)}  ${h}`, 'dim')),
    date: () => line(new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'full', timeStyle: 'short' }) + ' (New York)'),
    echo: (args) => line(args.join(' ')),
    sudo: (args) => {
      if (args.join(' ') === 'hire-me' || args[0] === 'hire') {
        line('✓ excellent decision. opening a new email…', 'ok');
        window.location.href = 'mailto:matiaslh@gmail.com?subject=Hello%20Matias';
      } else {
        line('visitor is not in the sudoers file. This incident will be reported.', 'err');
      }
    },
    exit: () => { line('logout', 'dim'); closeWindowOf('home'); },
    neofetch: () => {
      lines([
        'matias@nyc',
        '──────────',
        'Role:      Software Engineer · Meta Platforms Applied AI',
        'Location:  New York, NY',
        'Focus:     frontier-model tasks · Godot games',
        'Previous:  Reality Labs (VR) · AWS DocumentDB',
      ]);
      goTo('profile');
    },
    jobs: () => {
      const j = listJobs();
      if (!j.length) return line('no jobs. every window is open.', 'dim');
      j.forEach((x) => line(`[${x.job}]  ${x.status.padEnd(10)}  ${x.title}`));
    },
    fg: ([n]) => {
      const title = foreground(n ? Number(String(n).replace('%', '')) : undefined);
      line(title ? `${title}` : 'fg: no current job', title ? 'ok' : 'err');
    },
    reset: () => { resetWindows(); line('windows reset.', 'ok'); },
    rm: () => line('nice try.', 'err'),
    vim: () => line("you'd never get out. try 'help' instead.", 'dim'),
  };
  commands.vi = commands.nano = commands.emacs = commands.vim;
  commands.contact = commands['./contact.sh'];
  for (const s of SECTIONS) if (!commands[s]) commands[s] = () => commands.cd([s]);

  const run = (raw) => {
    const text = raw.trim();
    line(`~ $ ${text}`, 'cmd');
    if (!text) return;
    history.push(text);
    histIdx = history.length;
    const [name, ...args] = text.split(/\s+/);
    const fn = commands[name] || commands[name.toLowerCase()];
    if (fn) fn(args);
    else line(`zsh: command not found: ${name}. try 'help'`, 'err');
    out.scrollTop = out.scrollHeight;
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    run(input.value);
    input.value = '';
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && history.length) {
      e.preventDefault();
      histIdx = Math.max(0, histIdx - 1);
      input.value = history[histIdx];
    } else if (e.key === 'ArrowDown' && history.length) {
      e.preventDefault();
      histIdx = Math.min(history.length, histIdx + 1);
      input.value = history[histIdx] ?? '';
    } else if (e.key === 'Tab') {
      const done = complete(input);
      if (done) e.preventDefault();
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      out.replaceChildren();
    }
  });

  // clicking empty space in the hero window focuses the prompt (not when selecting text or clicking links)
  shell.closest('.window')?.addEventListener('click', (e) => {
    if (e.target.closest('a, input, button')) return;
    if (!window.getSelection()?.isCollapsed) return;
    input.focus({ preventScroll: true });
  });

  function complete(el) {
    const value = el.value;
    const parts = value.split(/\s+/);
    const last = parts[parts.length - 1];
    if (!last) return false;
    const pool = parts.length === 1
      ? Object.keys(commands)
      : parts[0] === 'cat' ? Object.keys(FILES)
      : parts[0] === 'cd' ? SECTIONS
      : parts[0] === 'open' ? Object.keys(LINKS)
      : [];
    const matches = pool.filter((p) => p.startsWith(last));
    if (matches.length === 1) {
      parts[parts.length - 1] = matches[0];
      el.value = parts.join(' ') + ' ';
      return true;
    }
    if (matches.length > 1) {
      line(`~ $ ${value}`, 'cmd');
      line(matches.join('   '), 'dim');
      out.scrollTop = out.scrollHeight;
      return true;
    }
    return false;
  }
}
