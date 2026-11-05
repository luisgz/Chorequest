// Chore Quest — single-page app for kids (iPad/iPhone) and parents.

// ------------------------------------------------------------ tiny DOM helper

function h(tag, props, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [p, val] of Object.entries(v)) {
        if (p.startsWith('--')) el.style.setProperty(p, val); else el.style[p] = val;
      }
    }
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v; // only used with static, trusted strings (icons)
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}
function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

const ICONS = {
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.7l1.3-2h5l1.3 2h1.7A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z"/><circle cx="12" cy="12.5" r="3.5"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  retry: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/></svg>',
  inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13.5l2.2-7A2 2 0 0 1 8.1 5h7.8a2 2 0 0 1 1.9 1.5l2.2 7"/><path d="M4 13.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3.5h-4.5a3.5 3.5 0 0 1-7 0z"/></svg>',
  today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/><path d="M9 15l2 2 4-4"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 7h11M9 12h11M9 17h11"/><circle cx="4.5" cy="7" r="1.3" fill="currentColor"/><circle cx="4.5" cy="12" r="1.3" fill="currentColor"/><circle cx="4.5" cy="17" r="1.3" fill="currentColor"/></svg>',
  family: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="7.5" r="3"/><circle cx="17" cy="9.5" r="2.4"/><path d="M2.8 19a5.2 5.2 0 0 1 10.4 0"/><path d="M13.5 15.2A4.2 4.2 0 0 1 21 18"/></svg>',
  gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="8.5" width="17" height="4" rx="1.2"/><path d="M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5M12 8.5v12"/><path d="M12 8.5C10.8 5 7.5 4.2 7 6.2c-.5 2 2.8 2.3 5 2.3zM12 8.5c1.2-3.5 4.5-4.3 5-2.3.5 2-2.8 2.3-5 2.3z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
};
const icon = (name) => h('span', { 'aria-hidden': 'true', style: { display: 'inline-flex' }, html: ICONS[name] });

const STAR_PATH = 'M32 4.5l8.3 16.9 18.6 2.7-13.5 13.1 3.2 18.5L32 46.9l-16.6 8.8 3.2-18.5L5.1 24.1l18.6-2.7z';
function starSvg(cls = '', fill = '#FFC83D') {
  const span = h('span', { class: cls, 'aria-hidden': 'true', style: { display: 'inline-block' } });
  span.innerHTML = `<svg viewBox="0 0 64 64" width="100%" height="100%"><path d="${STAR_PATH}" fill="${fill}" stroke="#fff" stroke-width="5" stroke-linejoin="round"/><path d="${STAR_PATH}" fill="none" stroke="#E9A800" stroke-width="1.5" stroke-linejoin="round" transform="translate(32 32) scale(.78) translate(-32 -32)"/></svg>`;
  return span;
}

const AVATARS = ['🦊', '🐢', '🐼', '🦄', '🐯', '🐸', '🐙', '🦖', '🐝', '🐧', '🦁', '🐨', '🐶', '🐱', '🦉', '🐻'];
const COLORS = ['#5B3FE0', '#E84A4A', '#1FA463', '#3D7BE0', '#F08C1A', '#D43F8D', '#14A3A8', '#8A5A2B'];
const CHORE_EMOJI = ['🛏️', '🧺', '🍽️', '🐶', '🧹', '🗑️', '🪴', '📚', '🦷', '🚿', '🧸', '👕', '🧽', '🚗', '🌿', '🎒', '🎹', '✨'];
const REWARD_EMOJI = ['📱', '🎮', '📺', '🎬', '🍔', '🍕', '🍦', '🍩', '🌙', '🛝', '🎨', '🧸', '📚', '💵', '🏊', '🚲', '🎁', '⭐'];
// One-tap starting points for the shop. Parents set the real price in the editor.
const REWARD_IDEAS = [
  { emoji: '📱', title: '30 min screen time', cost: 20 },
  { emoji: '🌙', title: 'Stay up 30 min late', cost: 30 },
  { emoji: '🎬', title: 'Pick the family movie', cost: 15 },
  { emoji: '🍦', title: 'Ice cream treat', cost: 25 },
  { emoji: '🍔', title: 'Eating out', cost: 100 },
  { emoji: '💵', title: '$5 to spend', cost: 50 },
];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function avatar(u, size = '') {
  return h('span', { class: `avatar ${size}`, style: { '--c': u.color }, 'aria-hidden': 'true' }, u.emoji);
}

// ------------------------------------------------------------ API

class ApiError extends Error {}
async function api(method, url, body) {
  const opts = { method, headers: { 'X-Chore-Quest': '1' }, credentials: 'same-origin' };
  if (body instanceof FormData) opts.body = body;
  else if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  let res;
  try { res = await fetch(url, opts); } catch { throw new ApiError('Can’t reach the server. Check the Wi-Fi and try again.'); }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && url !== '/api/login' && state.me) { signedOut(); }
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status}).`);
  return data;
}

// ------------------------------------------------------------ app state

const $app = document.getElementById('app');
const state = { me: null, family: [], tab: 'review', kidTab: 'chores', reviewCount: 0, kidStatus: new Map(), rewardStatus: new Map() };
let events = null;

function toast(msg, bad = false) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = h('div', { class: `toast${bad ? ' bad' : ''}`, role: 'status' }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), 2800);
}

function celebrate() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = h('div', { class: 'celebrate', 'aria-hidden': 'true' });
  for (let i = 0; i < 26; i++) {
    const s = h('i', { style: { left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 0.5}s`, fontSize: `${18 + Math.random() * 22}px` } },
      ['⭐', '🌟', '✨'][i % 3]);
    box.append(s);
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 2400);
}

function connectEvents() {
  if (events) events.close();
  events = new EventSource('/api/events');
  let t;
  events.addEventListener('changed', () => { clearTimeout(t); t = setTimeout(refresh, 250); });
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && state.me) refresh(); });

function refresh() {
  if (!state.me) return;
  if (state.me.role === 'kid') loadKid();
  else loadParentTab();
}

async function boot() {
  try {
    const fam = await api('GET', '/api/family');
    state.family = fam.members;
    if (fam.needsSetup) return renderSetup();
    if (fam.me) { state.me = fam.me; return startHome(); }
    renderWho();
  } catch (e) {
    $app.replaceChildren(h('div', { class: 'login' }, h('h1', { class: 'brand' }, 'Chore Quest'), h('p', { class: 'lead' }, e.message),
      h('button', { class: 'btn', onclick: boot }, 'Try again')));
  }
}

function startHome() {
  connectEvents();
  if (state.me.role === 'kid') { state.kidStatus.clear(); state.rewardStatus.clear(); state.kidTab = 'chores'; loadKid(true); } else renderParent();
}

function signedOut() {
  state.me = null;
  if (events) { events.close(); events = null; }
  closeAllSheets();
  boot();
}

async function logout() {
  await api('POST', '/api/logout').catch(() => {});
  signedOut();
}

// ------------------------------------------------------------ sheets

function openSheet(build, { label = 'Details' } = {}) {
  const scrim = h('div', { class: 'scrim', role: 'dialog', 'aria-modal': 'true', 'aria-label': label });
  const sheet = h('div', { class: 'sheet' }, h('div', { class: 'grab' }));
  const close = () => { scrim.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  scrim.addEventListener('click', (e) => { if (e.target === scrim) close(); });
  document.addEventListener('keydown', onKey);
  const body = h('div');
  sheet.append(body);
  scrim.append(sheet);
  document.body.append(scrim);
  const ctl = { close, body, rerender: () => body.replaceChildren(...[build(ctl)].flat(Infinity).filter((n) => n != null && n !== false)) };
  ctl.rerender();
  return ctl;
}
// replaceChildren that skips empty bits and flattens arrays.
function fill(el, ...children) {
  el.replaceChildren(...children.flat(Infinity).filter((n) => n != null && n !== false));
}
function closeAllSheets() { document.querySelectorAll('.scrim, .lightbox').forEach((s) => s.remove()); }

function sheetHead(title, close, lead) {
  return h('div', { class: 'sheet-head' }, lead, h('h2', {}, title),
    h('button', { class: 'close', 'aria-label': 'Close', onclick: close }, '✕'));
}

function lightbox(src) {
  const box = h('div', { class: 'lightbox', role: 'dialog', 'aria-label': 'Photo', onclick: () => box.remove() },
    h('img', { src, alt: 'Chore photo' }));
  document.body.append(box);
}

// ------------------------------------------------------------ setup & sign in

function brand() {
  return h('h1', { class: 'brand' }, starSvg('brand-star'), 'Chore Quest');
}

function renderSetup() {
  const pick = { emoji: '🦉', color: COLORS[0] };
  const err = h('div', { class: 'error-text', role: 'alert' });
  const code = h('input', { class: 'input', inputmode: 'numeric', autocomplete: 'one-time-code', placeholder: '6-digit code' });
  const name = h('input', { class: 'input', placeholder: 'Mom, Dad, Luis…', maxlength: 40 });
  const pw = h('input', { class: 'input', type: 'password', autocomplete: 'new-password', placeholder: 'At least 6 characters' });
  const emojiChips = chipPicker(AVATARS, pick.emoji, (v) => { pick.emoji = v; }, 'emoji');
  const form = h('form', {
    class: 'form',
    async onsubmit(e) {
      e.preventDefault();
      err.textContent = '';
      try {
        const r = await api('POST', '/api/setup', { code: code.value, name: name.value, password: pw.value, emoji: pick.emoji, color: pick.color });
        state.me = r.me;
        toast('You’re set up. Now add your family.');
        state.tab = 'family';
        startHome();
      } catch (ex) { err.textContent = ex.message; }
    },
  },
  h('label', { class: 'field' }, h('span', {}, 'Setup code'), code, h('span', { class: 'hint' }, 'It’s printed in the server log the first time the app starts.')),
  h('label', { class: 'field' }, h('span', {}, 'Your name'), name),
  h('label', { class: 'field' }, h('span', {}, 'Password'), pw),
  h('div', { class: 'field' }, h('span', {}, 'Pick your avatar'), emojiChips),
  err,
  h('button', { class: 'btn big block', type: 'submit' }, 'Create parent account'));
  $app.replaceChildren(h('div', { class: 'login' }, brand(), h('p', { class: 'lead' }, 'Let’s set up your family. Start with your own parent account.'), form));
}

function renderWho() {
  const tiles = state.family.map((m) => h('button', { onclick: () => (m.role === 'kid' ? renderPin(m) : renderPassword(m)) },
    avatar(m, 'lg'), h('span', {}, m.name), m.role === 'parent' ? h('span', { class: 'role' }, 'Parent') : null));
  $app.replaceChildren(h('div', { class: 'login' }, brand(), h('p', { class: 'lead' }, 'Who’s here?'), h('div', { class: 'who' }, tiles)));
}

function renderPin(m) {
  let pin = '';
  const dots = h('div', { class: 'pin-dots', 'aria-live': 'polite' });
  const msg = h('div', { class: 'pin-msg', role: 'alert' });
  const draw = () => {
    dots.replaceChildren(...Array.from({ length: Math.max(4, pin.length) }, (_, i) => h('span', { class: i < pin.length ? 'on' : '' })));
    dots.setAttribute('aria-label', `${pin.length} digits entered`);
  };
  const go = async () => {
    if (pin.length < 4) { msg.textContent = 'Your PIN has at least 4 numbers.'; return; }
    try {
      const r = await api('POST', '/api/login', { userId: m.id, secret: pin });
      state.me = r.me;
      startHome();
    } catch (e) {
      msg.textContent = e.message;
      pin = ''; draw();
      dots.classList.remove('shake'); void dots.offsetWidth; dots.classList.add('shake');
    }
  };
  const press = (d) => { if (pin.length < 6) { pin += d; msg.textContent = ''; draw(); } };
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => h('button', { onclick: () => press(d) }, d));
  const pad = h('div', { class: 'pad' }, keys,
    h('button', { class: 'fn', 'aria-label': 'Delete', onclick: () => { pin = pin.slice(0, -1); draw(); } }, '⌫ Delete'),
    h('button', { onclick: () => press('0') }, '0'),
    h('button', { class: 'fn', style: { color: 'var(--grape)', fontWeight: 800 }, onclick: go }, 'Go ✓'));
  const onKey = (e) => {
    if (!document.body.contains(pad)) return document.removeEventListener('keydown', onKey);
    if (/^\d$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') { pin = pin.slice(0, -1); draw(); }
    else if (e.key === 'Enter') go();
  };
  document.addEventListener('keydown', onKey);
  draw();
  $app.replaceChildren(h('div', { class: 'login' },
    avatar(m, 'lg'), h('h1', { style: { fontSize: '30px', marginTop: '12px' } }, `Hi ${m.name}!`),
    h('p', { class: 'lead', style: { margin: '6px 0 0' } }, 'Type your secret PIN'),
    dots, msg, pad,
    h('div', { style: { marginTop: '22px' } }, h('button', { class: 'link', onclick: renderWho }, 'That’s not me'))));
}

function renderPassword(m) {
  const pw = h('input', { class: 'input', type: 'password', autocomplete: 'current-password', placeholder: 'Password', 'aria-label': 'Password' });
  const err = h('div', { class: 'error-text', role: 'alert' });
  const form = h('form', {
    class: 'form',
    async onsubmit(e) {
      e.preventDefault();
      try {
        const r = await api('POST', '/api/login', { userId: m.id, secret: pw.value });
        state.me = r.me;
        startHome();
      } catch (ex) { err.textContent = ex.message; pw.select(); }
    },
  }, pw, err, h('button', { class: 'btn big block', type: 'submit' }, 'Sign in'));
  $app.replaceChildren(h('div', { class: 'login' },
    avatar(m, 'lg'), h('h1', { style: { fontSize: '30px', margin: '12px 0 22px' } }, m.name), form,
    h('div', { style: { marginTop: '18px' } }, h('button', { class: 'link', onclick: renderWho }, 'Back'))));
  setTimeout(() => pw.focus(), 50);
}

// ------------------------------------------------------------ shared bits

function repeatLabel(c) {
  if (c.repeat === 'daily') return 'Every day';
  if (c.repeat === 'weekly') return 'Once a week';
  if (c.repeat === 'days') return c.days.map((d) => DAY_NAMES[d]).join(', ');
  return c.due_date ? `One time, by ${shortDate(c.due_date)}` : 'One time';
}
function shortDate(d) {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
function longToday(d) {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}
function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
const starsWord = (n) => `${n} star${Math.abs(n) === 1 ? '' : 's'}`;

function starsPill(n) {
  return h('span', { class: 'stars', 'aria-label': starsWord(n) }, starSvg('', '#fff8e0'), String(n));
}

function chipPicker(options, value, onPick, kind = '') {
  const wrap = h('div', { class: 'chips', role: 'radiogroup' });
  const draw = () => wrap.replaceChildren(...options.map((o) => h('button', {
    type: 'button', role: 'radio', 'aria-checked': String(o === value),
    class: `chip ${kind}${o === value ? ' on' : ''}`,
    style: kind === 'color' ? { background: o } : null,
    'aria-label': kind === 'color' ? `Color ${o}` : null,
    onclick: () => { value = o; onPick(o); draw(); },
  }, kind === 'color' ? '' : o)));
  draw();
  return wrap;
}

// Shrinks a phone photo (often 3–5 MB) to ~300 KB before upload. Falls back to the original file.
async function compressPhoto(file) {
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const max = 1600;
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.82));
    return blob && blob.size > 0 ? blob : file;
  } catch {
    return file;
  }
}

// ------------------------------------------------------------ KID

async function loadKid(first = false) {
  if (first) $app.replaceChildren(h('div', { class: 'spinner', role: 'status', 'aria-label': 'Loading' }));
  try {
    if (state.kidTab === 'shop') renderShop(await api('GET', '/api/shop'), first);
    else renderKid(await api('GET', '/api/today'), first);
  } catch (e) { toast(e.message, true); }
}

function kidTabs() {
  const tab = (id, label, ic) => h('button', {
    class: state.kidTab === id ? 'on' : '', 'aria-current': state.kidTab === id ? 'page' : null,
    onclick: () => { if (state.kidTab !== id) { state.kidTab = id; window.scrollTo(0, 0); loadKid(true); } },
  }, icon(ic), label);
  return h('nav', { class: 'tabs kid-tabs', 'aria-label': 'Sections' }, tab('chores', 'My chores', 'list'), tab('shop', 'Shop', 'gift'));
}

function renderKid(data, first) {
  const me = state.me;
  const k = data.kids[0];
  const items = k.items;

  // Spot chores that just got approved, to stamp them with a star.
  const justApproved = new Set();
  for (const it of items) {
    const st = it.submission?.status || 'todo';
    const prev = state.kidStatus.get(it.chore.id);
    if (!first && prev && prev !== 'approved' && st === 'approved') justApproved.add(it.chore.id);
    state.kidStatus.set(it.chore.id, st);
  }
  if (justApproved.size) celebrate();

  const by = { rejected: [], todo: [], pending: [], approved: [] };
  for (const it of items) by[it.submission?.status || 'todo'].push(it);
  const done = by.approved.length;

  const head = h('header', { class: 'kid-head' },
    avatar(me, 'lg'),
    h('div', { class: 'grow' }, h('h1', {}, `Hi ${me.name}!`), h('div', { class: 'date' }, longToday(data.date))),
    starsPill(k.points));

  const progress = items.length ? h('section', { class: 'progress' },
    h('div', { class: 'progress-label' },
      done === items.length ? 'All done today. Amazing!' : `${done} of ${items.length} done today`),
    h('div', { class: 'progress-track', 'aria-hidden': 'true' },
      [...by.approved.map(() => h('span', { class: 'done' })), ...by.pending.map(() => h('span', { class: 'wait' })),
        ...[...by.rejected, ...by.todo].map(() => h('span'))])) : null;

  const group = (title, list) => (list.length ? h('section', { class: 'group' },
    h('h2', {}, title, h('span', { class: 'count' }, `(${list.length})`)),
    h('div', { class: 'cards two' }, list.map((it) => kidCard(it, justApproved.has(it.chore.id))))) : null);

  const body = items.length
    ? [group('Try again', by.rejected), group('To do', by.todo), group('Waiting for a parent', by.pending), group('Done', by.approved)]
    : h('div', { class: 'empty' }, h('div', { class: 'big-emoji' }, '🎈'), h('h2', {}, 'No chores today'), h('p', {}, 'Enjoy your free time!'));

  $app.replaceChildren(h('div', { class: 'wrap' }, head, progress, body,
    h('div', { class: 'switch-user' }, h('button', { class: 'btn ghost', onclick: logout }, 'Switch person'))), kidTabs());
}

// ------------------------------------------------------------ KID: rewards shop

function renderShop(data, first) {
  const me = state.me;
  const points = data.points;

  // Celebrate when a parent says yes while the shop is open.
  let yes = false;
  for (const r of data.requests) {
    const prev = state.rewardStatus.get(r.id);
    if (!first && prev === 'pending' && r.status === 'approved') yes = true;
    state.rewardStatus.set(r.id, r.status);
  }
  if (yes) { celebrate(); toast('A parent said yes. Enjoy! 🎉'); }

  const waiting = data.requests.filter((r) => r.status === 'pending');
  const weekAgo = Date.now() - 7 * 86400_000;
  const answered = data.requests.filter((r) => ['approved', 'denied'].includes(r.status) && new Date(r.reviewed_at).getTime() > weekAgo);

  const head = h('header', { class: 'kid-head' },
    avatar(me, 'lg'),
    h('div', { class: 'grow' }, h('h1', {}, 'Rewards shop'), h('div', { class: 'date' }, 'Trade your stars for treats')),
    starsPill(points));

  const waitingBlock = waiting.length ? h('section', { class: 'group' },
    h('h2', {}, 'Waiting for a parent', h('span', { class: 'count' }, `(${waiting.length})`)),
    h('div', { class: 'cards two' }, waiting.map((r) => h('div', { class: 'reward pending' },
      h('span', { class: 'sticker' }, r.emoji),
      h('span', { class: 'body' }, h('span', { class: 'title' }, r.title),
        h('span', { class: 'meta' }, `${starsWord(r.cost)} saved for this`)),
      h('button', {
        class: 'btn ghost small', async onclick(e) {
          e.currentTarget.disabled = true;
          try { await api('POST', `/api/reward-requests/${r.id}/cancel`); toast('Canceled. Your stars are back.'); loadKid(); }
          catch (ex) { toast(ex.message, true); loadKid(); }
        },
      }, 'Cancel'))))) : null;

  const shopBlock = data.rewards.length ? h('section', { class: 'group' },
    h('h2', {}, 'In the shop'),
    h('div', { class: 'cards two' }, data.rewards.map((r) => {
      const can = points >= r.cost;
      const pct = Math.max(0, Math.min(100, Math.round((points / r.cost) * 100)));
      return h('button', {
        class: `reward${can ? ' can' : ''}`, onclick: () => openRedeem(r, points),
        'aria-label': `${r.title}, ${starsWord(r.cost)}${can ? '' : `, you need ${r.cost - points} more`}`,
      },
      h('span', { class: 'sticker' }, r.emoji),
      h('span', { class: 'body' },
        h('span', { class: 'title' }, r.title),
        can ? h('span', { class: 'meta ok' }, 'You can get this!')
          : h('span', { class: 'need' }, h('span', { class: 'bar', 'aria-hidden': 'true' }, h('i', { style: { width: `${pct}%` } })),
            h('span', { class: 'meta' }, `${r.cost - points} more to go`))),
      h('span', { class: 'price' }, starSvg('', '#FFC83D'), String(r.cost)));
    }))) : h('div', { class: 'empty' }, h('div', { class: 'big-emoji' }, '🎁'), h('h2', {}, 'The shop is empty'),
    h('p', {}, 'Ask a parent to add some rewards.'));

  const answeredBlock = answered.length ? h('section', { class: 'group' },
    h('h2', {}, 'This week'),
    h('div', { class: 'cards two' }, answered.map((r) => h('div', { class: `reward ${r.status}` },
      h('span', { class: 'sticker' }, r.emoji),
      h('span', { class: 'body' }, h('span', { class: 'title' }, r.title),
        h('span', { class: 'meta' }, r.status === 'approved' ? `Yes! Enjoy · ${starsWord(r.cost)}` : 'Not this time. Your stars came back.'),
        r.feedback ? h('span', { class: 'feedback' }, `“${r.feedback}”`) : null),
      h('span', { class: `pill ${r.status === 'approved' ? 'approved' : 'rejected'}` }, r.status === 'approved' ? 'Yes' : 'Not now'))))) : null;

  fill($app, h('div', { class: 'wrap' }, head, waitingBlock, shopBlock, answeredBlock,
    h('p', { class: 'hint', style: { textAlign: 'center', marginTop: '26px' } }, 'Stars never reset, so you can save up for the big ones!')), kidTabs());
}

function openRedeem(r, points) {
  const can = points >= r.cost;
  let sending = false;
  const sheet = openSheet(({ close }) => {
    const out = [sheetHead(r.title, close, h('span', { class: 'sticker' }, r.emoji))];
    if (!can) {
      out.push(h('div', { class: 'callout wait' }, `This costs ${starsWord(r.cost)}. You have ${points}, so you need ${r.cost - points} more.`),
        h('p', { class: 'desc' }, 'Finish more chores to earn stars, then come back!'),
        h('div', { class: 'footer' }, h('button', { class: 'btn ghost block', onclick: close }, 'OK')));
      return out;
    }
    out.push(h('p', { class: 'desc' }, `Trade ${starsWord(r.cost)} for this? You’ll have ${starsWord(points - r.cost)} left.`),
      h('p', { class: 'hint', style: { margin: '0 0 6px' } }, 'A parent has to say yes. If they say no, you get your stars back.'),
      h('div', { class: 'footer' },
        h('button', {
          class: 'btn big leaf block', disabled: sending, async onclick() {
            if (sending) return;
            sending = true; sheet.rerender();
            try {
              const res = await api('POST', `/api/rewards/${r.id}/redeem`);
              state.rewardStatus.set(res.request.id, 'pending');
              close(); toast('Sent! A parent will say yes or no.'); loadKid();
            } catch (e) { sending = false; sheet.rerender(); toast(e.message, true); }
          },
        }, sending ? 'Sending…' : `Yes, use ${r.cost} ⭐`),
        h('button', { class: 'btn ghost block', onclick: close }, 'Not now')));
    return out;
  }, { label: r.title });
}

function kidMeta(it) {
  const c = it.chore;
  const bits = [];
  if (c.points) bits.push(h('span', { class: 'pts' }, `+${starsWord(c.points)}`));
  if (c.repeat === 'weekly') bits.push(h('span', {}, 'Any day this week'));
  if (c.repeat === 'once' && c.due_date) bits.push(h('span', {}, `Due ${shortDate(c.due_date)}`));
  if (c.requires_photo && !it.submission) bits.push(h('span', {}, '📷 Photo needed'));
  return bits;
}

function kidCard(it, pop) {
  const s = it.submission;
  const status = s?.status || 'todo';
  let right;
  if (status === 'approved') right = starSvg(`stamp${pop ? ' pop' : ''}`);
  else if (status === 'pending') right = h('span', { class: 'go', title: 'Waiting for a parent' }, icon('clock'));
  else if (status === 'rejected') right = h('span', { class: 'go' }, icon('retry'));
  else right = h('span', { class: 'go' }, icon(it.chore.requires_photo ? 'camera' : 'check'));
  const label = { todo: 'to do', pending: 'waiting for a parent', approved: 'done', rejected: 'try again' }[status];
  return h('button', { class: `chore ${status}`, onclick: () => openKidChore(it), 'aria-label': `${it.chore.title}, ${label}` },
    h('span', { class: 'sticker' }, it.chore.emoji),
    h('span', { class: 'body' },
      h('span', { class: 'title', style: { display: 'block' } }, it.chore.title),
      h('span', { class: 'meta' }, status === 'pending' ? h('span', {}, 'Sent! Waiting for a parent to check.') : kidMeta(it)),
      status === 'rejected' && s.feedback ? h('span', { class: 'feedback', style: { display: 'block' } }, `“${s.feedback}”`) : null),
    right);
}

function openKidChore(it) {
  const c = it.chore;
  const s = it.submission;
  const st = { blob: null, preview: null, sending: false };
  const note = h('input', { class: 'input', placeholder: 'Add a note (optional)', maxlength: 300 });
  const camInput = h('input', { type: 'file', accept: 'image/*', capture: 'environment', class: 'hidden' });
  camInput.addEventListener('change', async () => {
    const f = camInput.files?.[0];
    camInput.value = '';
    if (!f) return;
    st.blob = await compressPhoto(f);
    if (st.preview) URL.revokeObjectURL(st.preview);
    st.preview = URL.createObjectURL(st.blob);
    sheet.rerender();
  });

  async function send() {
    if (st.sending) return;
    if (c.requires_photo && !st.blob) { camInput.click(); return; }
    st.sending = true; sheet.rerender();
    const fd = new FormData();
    fd.set('chore_id', String(c.id));
    if (note.value.trim()) fd.set('note', note.value.trim());
    if (st.blob) fd.set('photo', st.blob, 'photo.jpg');
    try {
      await api('POST', '/api/submissions', fd);
      sheet.close();
      toast('Sent! A parent will check it.');
      loadKid();
    } catch (e) {
      st.sending = false; sheet.rerender();
      toast(e.message, true);
    }
  }

  const sheet = openSheet(({ close }) => {
    const out = [sheetHead(c.title, close, h('span', { class: 'sticker' }, c.emoji))];
    if (c.description) out.push(h('p', { class: 'desc' }, c.description));
    if (s?.status === 'approved') {
      out.push(h('div', { class: 'callout leaf' }, `Great job! You earned ${starsWord(s.points)}.`));
      if (s.feedback) out.push(h('p', { class: 'desc' }, `“${s.feedback}”`));
      if (s.photo) out.push(h('div', { class: 'preview' }, h('img', { src: s.photo, alt: 'Your photo' })));
      return out;
    }
    if (s?.status === 'pending') {
      out.push(h('div', { class: 'callout wait' }, 'Sent! A parent will check it soon. You can send a new photo if you need to.'));
    }
    if (s?.status === 'rejected') {
      out.push(h('div', { class: 'callout coral' }, s.feedback ? `Almost! “${s.feedback}”` : 'Almost! Give it another try.'));
    }
    if (c.points) out.push(h('p', { class: 'hint', style: { margin: '0 0 14px' } }, `Worth ${starsWord(c.points)}`));

    if (c.requires_photo) {
      out.push(st.preview
        ? h('div', { class: 'preview' }, h('img', { src: st.preview, alt: 'Your photo' }),
          h('button', { class: 'btn ghost small retake', onclick: () => camInput.click() }, 'Retake'))
        : h('button', { class: 'camera-btn', onclick: () => camInput.click() }, icon('camera'), 'Take a photo',
          h('span', { class: 'hint' }, 'Show that it’s done')));
    }
    out.push(camInput);
    out.push(h('div', { class: 'footer' }, note,
      h('button', {
        class: `btn big block${!c.requires_photo || st.blob ? ' leaf' : ''}`,
        disabled: st.sending, onclick: send,
      }, st.sending ? 'Sending…' : (c.requires_photo ? (st.blob ? 'Send for checking' : 'Open camera') : 'I did it!'))));
    return out;
  }, { label: c.title });
}

// ------------------------------------------------------------ PARENT

const TABS = [
  { id: 'review', label: 'Check', icon: 'inbox' },
  { id: 'today', label: 'Today', icon: 'today' },
  { id: 'chores', label: 'Chores', icon: 'list' },
  { id: 'rewards', label: 'Rewards', icon: 'gift' },
  { id: 'family', label: 'Family', icon: 'family' },
];

function renderParent() {
  const main = h('div', { class: 'wrap', id: 'parent-main' });
  const tabs = h('nav', { class: 'tabs', 'aria-label': 'Sections' }, TABS.map((t) => h('button', {
    class: state.tab === t.id ? 'on' : '', 'aria-current': state.tab === t.id ? 'page' : null,
    onclick: () => { state.tab = t.id; renderParent(); },
  }, icon(t.icon), t.label, t.id === 'review' && state.reviewCount ? h('span', { class: 'badge' }, String(state.reviewCount)) : null)));
  $app.replaceChildren(main, tabs);
  loadParentTab();
}

function parentTop(title, action) {
  return h('header', { class: 'top' }, h('h1', {}, title), action,
    h('button', { class: 'me-btn', 'aria-label': 'Account', onclick: openAccount }, avatar(state.me)));
}

function openAccount() {
  openSheet(({ close }) => [
    sheetHead(state.me.name, close, avatar(state.me, 'lg')),
    h('p', { class: 'hint' }, 'Signed in as a parent on this device.'),
    h('div', { class: 'footer' },
      h('button', { class: 'btn ghost block', onclick: () => { close(); openMember(state.me); } }, 'Change my password or avatar'),
      h('button', { class: 'btn coral block', onclick: () => { close(); logout(); } }, 'Sign out')),
  ], { label: 'Account' });
}

async function loadParentTab() {
  const main = document.getElementById('parent-main');
  if (!main) return renderParent();
  try {
    // Keep the badge fresh whatever tab is open (chores to check + rewards to answer).
    const [review, asks] = await Promise.all([api('GET', '/api/review'), api('GET', '/api/reward-requests')]);
    const count = review.items.length + asks.items.length;
    if (count !== state.reviewCount) {
      state.reviewCount = count;
      const tabBtn = document.querySelector('.tabs button');
      tabBtn?.querySelector('.badge')?.remove();
      if (state.reviewCount) tabBtn?.append(h('span', { class: 'badge' }, String(state.reviewCount)));
    }
    if (state.tab === 'review') return renderReview(main, review.items, asks.items);
    if (state.tab === 'rewards') return renderRewards(main, (await api('GET', '/api/rewards')).items);
    if (state.tab === 'today') return renderToday(main, await api('GET', '/api/today'));
    if (state.tab === 'chores') {
      const [chores, users] = await Promise.all([api('GET', '/api/chores'), api('GET', '/api/users')]);
      state.family = users.items;
      return renderChores(main, chores.items);
    }
    if (state.tab === 'family') {
      const users = await api('GET', '/api/users');
      state.family = users.items;
      return renderFamily(main, users.items);
    }
  } catch (e) { toast(e.message, true); }
}

// ---- Check (review queue)

function renderReview(main, items, asks = []) {
  const askList = asks.map((r) => h('article', { class: 'panel ask' },
    h('div', { class: 'who-line' }, avatar(r.kid),
      h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { class: 'title' }, `${r.emoji} ${r.title}`),
        h('div', { class: 'sub' }, `${r.kid.name} wants this · ${starsWord(r.cost)} · ${timeAgo(r.requested_at)}`))),
    h('div', { class: 'actions' },
      h('button', { class: 'btn coral', onclick: () => sayNotNow(r) }, 'Not now'),
      h('button', { class: 'btn leaf', onclick: (e) => approveReward(r, e.currentTarget) }, 'Approve 🎁'))));

  const list = items.map((s) => h('article', { class: 'panel review' },
    s.photo ? h('button', { class: 'photo', 'aria-label': 'Open photo full screen', onclick: () => lightbox(s.photo) },
      h('img', { src: s.photo, alt: `${s.kid.name}: ${s.chore.title}`, loading: 'lazy' })) : null,
    h('div', { class: 'info' },
      h('div', { class: 'who-line' }, avatar(s.kid),
        h('div', {}, h('div', { class: 'title' }, `${s.chore.emoji} ${s.chore.title}`),
          h('div', { class: 'sub' }, `${s.kid.name}, ${timeAgo(s.submitted_at)}${s.photo ? '' : ' (no photo needed)'}`))),
      s.note ? h('div', { class: 'note' }, `“${s.note}”`) : null,
      h('div', { class: 'actions' },
        h('button', { class: 'btn coral', onclick: () => sendBack(s) }, 'Send back'),
        h('button', { class: 'btn leaf', onclick: (e) => approve(s, e.currentTarget) },
          s.chore.points ? `Approve +${s.chore.points} ⭐` : 'Approve')))));

  fill(main, parentTop('Check'),
    asks.length ? [h('div', { class: 'section-head' }, h('h2', {}, 'Reward requests')), h('div', { class: 'ask-list' }, askList)] : null,
    asks.length && items.length ? h('div', { class: 'section-head' }, h('h2', {}, 'Chores')) : null,
    items.length ? h('div', { class: 'review-list' }, list)
      : (asks.length ? null : h('div', { class: 'empty' }, h('div', { class: 'big-emoji' }, '✅'), h('h2', {}, 'Nothing to check'),
        h('p', {}, 'When the kids finish a chore or ask for a reward, it shows up here.'))));
}

async function approveReward(r, btn) {
  btn.disabled = true;
  try {
    await api('POST', `/api/reward-requests/${r.id}/review`, { decision: 'approve' });
    toast(`Approved. ${r.kid.name} gets “${r.title}”.`);
    loadParentTab();
  } catch (e) { btn.disabled = false; toast(e.message, true); loadParentTab(); }
}

function sayNotNow(r) {
  const reasons = ['Maybe this weekend', 'Not today', 'Ask me again later', 'Finish your chores first'];
  const text = h('textarea', { class: 'input', placeholder: `Tell ${r.kid.name} why (optional)`, maxlength: 300 });
  openSheet(({ close }) => [
    sheetHead('Not now', close),
    h('p', { class: 'desc' }, `${r.emoji} ${r.title}: ${r.kid.name} gets the ${starsWord(r.cost)} back.`),
    h('div', { class: 'chips', style: { marginBottom: '12px' } },
      reasons.map((x) => h('button', { class: 'chip', type: 'button', onclick: () => { text.value = x; } }, x))),
    text,
    h('div', { class: 'footer' }, h('button', {
      class: 'btn block', async onclick() {
        try {
          await api('POST', `/api/reward-requests/${r.id}/review`, { decision: 'deny', feedback: text.value });
          close(); toast(`${r.kid.name}’s stars were returned.`); loadParentTab();
        } catch (e) { toast(e.message, true); }
      },
    }, 'Say not now')),
  ], { label: 'Not now' });
}

async function approve(s, btn) {
  btn.disabled = true;
  try {
    await api('POST', `/api/submissions/${s.id}/review`, { decision: 'approve' });
    toast(`Approved. ${s.kid.name} ${s.chore.points ? `gets ${starsWord(s.chore.points)}` : 'is all set'}.`);
    loadParentTab();
  } catch (e) { btn.disabled = false; toast(e.message, true); }
}

function sendBack(s) {
  const reasons = ['Not finished yet', 'Photo is too blurry', 'Show the whole room', 'Missed a spot'];
  const text = h('textarea', { class: 'input', placeholder: `Tell ${s.kid.name} what to fix`, maxlength: 300 });
  openSheet(({ close }) => [
    sheetHead('Send back', close),
    h('p', { class: 'desc' }, `${s.chore.emoji} ${s.chore.title} goes back on ${s.kid.name}’s list with your note.`),
    h('div', { class: 'chips', style: { marginBottom: '12px' } },
      reasons.map((r) => h('button', { class: 'chip', type: 'button', onclick: () => { text.value = r; } }, r))),
    text,
    h('div', { class: 'footer' }, h('button', {
      class: 'btn block', async onclick() {
        try {
          await api('POST', `/api/submissions/${s.id}/review`, { decision: 'reject', feedback: text.value });
          close(); toast(`Sent back to ${s.kid.name}.`); loadParentTab();
        } catch (e) { toast(e.message, true); }
      },
    }, `Send back to ${s.kid.name}`)),
  ], { label: 'Send back' });
}

// ---- Today

function renderToday(main, data) {
  const blocks = data.kids.map(({ kid, items, points, weekPoints }) => {
    const done = items.filter((i) => i.submission?.status === 'approved').length;
    return h('section', { class: 'panel kid-block' },
      h('div', { class: 'kid-line' }, avatar(kid),
        h('div', { style: { flex: 1 } }, h('div', { class: 'name' }, kid.name),
          h('div', { class: 'sub' }, items.length ? `${done} of ${items.length} done · +${weekPoints} this week` : 'No chores today')),
        h('button', { class: 'me-btn', 'aria-label': `${kid.name}’s stars and history`, onclick: () => openHistory(kid) }, starsPill(points))),
      items.length ? h('div', { class: 'rows' }, items.map((it) => todayRow(kid, it))) : null);
  });
  main.replaceChildren(parentTop('Today'), h('p', { class: 'hint', style: { margin: '-8px 0 16px' } }, longToday(data.date)),
    data.kids.length ? h('div', {}, blocks) : h('div', { class: 'empty' }, h('h2', {}, 'No kids yet'),
      h('p', {}, 'Add your kids in Family.'), h('button', { class: 'btn', onclick: () => { state.tab = 'family'; renderParent(); } }, 'Go to Family')));
}

const STATUS_TEXT = { approved: 'Done', pending: 'To check', rejected: 'Sent back' };
function todayRow(kid, it) {
  const s = it.submission;
  return h('button', { class: 'row', onclick: () => openParentItem(kid, it) },
    h('span', { class: 'emoji' }, it.chore.emoji),
    h('span', { class: 'grow' }, h('span', { class: 't', style: { display: 'block' } }, it.chore.title),
      h('span', { class: 's' }, s ? timeAgo(s.submitted_at) : repeatLabel(it.chore))),
    h('span', { class: `pill ${s?.status || ''}` }, s ? STATUS_TEXT[s.status] : 'To do'));
}

function openParentItem(kid, it) {
  const c = it.chore;
  const s = it.submission;
  openSheet(({ close }) => {
    const out = [sheetHead(c.title, close, h('span', { class: 'sticker' }, c.emoji)),
      h('p', { class: 'hint', style: { margin: '-6px 0 14px' } }, `${kid.name} · ${repeatLabel(c)}${c.points ? ` · ${starsWord(c.points)}` : ''}`)];
    if (s?.photo) out.push(h('div', { class: 'preview', onclick: () => lightbox(s.photo) }, h('img', { src: s.photo, alt: 'Chore photo' })));
    if (s?.note) out.push(h('p', { class: 'desc', style: { marginTop: '12px' } }, `“${s.note}”`));
    if (s?.status === 'rejected' && s.feedback) out.push(h('div', { class: 'callout coral', style: { marginTop: '12px' } }, `Sent back: “${s.feedback}”`));
    const actions = [];
    if (s?.status === 'pending') {
      const rich = { ...s, kid, chore: c };
      actions.push(h('button', { class: 'btn leaf block', onclick: (e) => { close(); approve(rich, e.currentTarget); } }, 'Approve'),
        h('button', { class: 'btn coral block', onclick: () => { close(); sendBack(rich); } }, 'Send back'));
    } else if (s?.status === 'approved') {
      actions.push(h('button', { class: 'btn ghost block', onclick: () => { close(); sendBack({ ...s, kid, chore: c }); } }, 'Undo and send back'));
    } else {
      actions.push(h('button', {
        class: 'btn block', async onclick() {
          try {
            await api('POST', `/api/chores/${c.id}/complete`, { kid_id: kid.id });
            close(); toast(`Marked done for ${kid.name}.`); loadParentTab();
          } catch (e) { toast(e.message, true); }
        },
      }, `Mark done for ${kid.name}`));
    }
    out.push(h('div', { class: 'footer' }, actions));
    return out;
  }, { label: c.title });
}

// ---- Chores

function renderChores(main, chores) {
  const kids = state.family.filter((u) => u.role === 'kid');
  const kidById = new Map(kids.map((k) => [k.id, k]));
  const addBtn = h('button', { class: 'btn small', onclick: () => openChoreEditor(null, kids) }, icon('plus'), 'New chore');
  const list = chores.map((c) => h('button', { class: 'row', onclick: () => openChoreEditor(c, kids) },
    h('span', { class: 'emoji' }, c.emoji),
    h('span', { class: 'grow' }, h('span', { class: 't', style: { display: 'block' } }, c.title),
      h('span', { class: 's' }, `${repeatLabel(c)}${c.points ? ` · ${starsWord(c.points)}` : ''}${c.requires_photo ? ' · 📷' : ''}`)),
    c.active ? h('span', { class: 'mini-avatars' }, c.assignees.map((id) => kidById.get(id)).filter(Boolean).map((k) => avatar(k, 'sm')))
      : h('span', { class: 'pill paused' }, 'Paused')));
  main.replaceChildren(parentTop('Chores', addBtn),
    chores.length ? h('div', { class: 'panel', style: { paddingTop: '6px', paddingBottom: '6px' } }, h('div', { class: 'rows', style: { marginTop: 0 } }, list))
      : h('div', { class: 'empty' }, h('div', { class: 'big-emoji' }, '🧹'), h('h2', {}, 'No chores yet'),
        h('p', {}, kids.length ? 'Add the first one, like “Clean your room”.' : 'Add your kids in Family first, then come back here.'),
        kids.length ? h('button', { class: 'btn', onclick: () => openChoreEditor(null, kids) }, 'Add a chore') : null));
}

function openChoreEditor(chore, kids) {
  if (!kids.length) { toast('Add a kid in Family first.', true); return; }
  const f = chore
    ? { ...chore, days: [...chore.days], assignees: [...chore.assignees] }
    : { title: '', description: '', emoji: '🛏️', repeat: 'daily', days: [1, 2, 3, 4, 5], due_date: '', requires_photo: true, points: 5, active: true, assignees: kids.map((k) => k.id) };
  const err = h('div', { class: 'error-text', role: 'alert' });
  const title = h('input', { class: 'input', value: f.title, placeholder: 'Clean your room', maxlength: 60, oninput: (e) => { f.title = e.target.value; } });
  const desc = h('textarea', { class: 'input', placeholder: 'What does “done” look like? e.g. bed made, clothes in the hamper, floor clear.', maxlength: 400, oninput: (e) => { f.description = e.target.value; } }, f.description);
  const due = h('input', { class: 'input', type: 'date', value: f.due_date || '', onchange: (e) => { f.due_date = e.target.value; } });

  const sheet = openSheet(({ close }) => {
    const repeatChips = h('div', { class: 'chips' }, [['daily', 'Every day'], ['days', 'Certain days'], ['weekly', 'Once a week'], ['once', 'One time']]
      .map(([v, l]) => h('button', { type: 'button', class: `chip${f.repeat === v ? ' on' : ''}`, onclick: () => { f.repeat = v; sheet.rerender(); } }, l)));
    const dayChips = h('div', { class: 'chips' }, [1, 2, 3, 4, 5, 6, 0].map((d) => h('button', {
      type: 'button', class: `chip${f.days.includes(d) ? ' on' : ''}`, 'aria-pressed': String(f.days.includes(d)),
      onclick: () => { f.days = f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d]; sheet.rerender(); },
    }, DAY_NAMES[d])));
    const kidChips = h('div', { class: 'chips' }, kids.map((k) => h('button', {
      type: 'button', class: `chip${f.assignees.includes(k.id) ? ' on' : ''}`, 'aria-pressed': String(f.assignees.includes(k.id)),
      onclick: () => { f.assignees = f.assignees.includes(k.id) ? f.assignees.filter((x) => x !== k.id) : [...f.assignees, k.id]; sheet.rerender(); },
    }, h('span', { class: 'av' }, k.emoji), k.name)));
    const pts = h('output', {}, String(f.points));
    const step = (d) => { f.points = Math.max(0, Math.min(1000, f.points + d)); pts.textContent = String(f.points); };

    return [
      sheetHead(chore ? 'Edit chore' : 'New chore', close),
      h('div', { class: 'form' },
        h('label', { class: 'field' }, h('span', {}, 'Chore'), title),
        h('div', { class: 'field' }, h('span', {}, 'Icon'), chipPicker(CHORE_EMOJI, f.emoji, (v) => { f.emoji = v; }, 'emoji')),
        h('label', { class: 'field' }, h('span', {}, 'Details (optional)'), desc),
        h('div', { class: 'field' }, h('span', {}, 'Who'), kidChips),
        h('div', { class: 'field' }, h('span', {}, 'How often'), repeatChips),
        f.repeat === 'days' ? h('div', { class: 'field' }, h('span', {}, 'Which days'), dayChips) : null,
        f.repeat === 'once' ? h('label', { class: 'field' }, h('span', {}, 'Due date (optional)'), due) : null,
        f.repeat === 'weekly' ? h('p', { class: 'hint', style: { margin: 0 } }, 'Shows every day until it’s done, then resets on Monday.') : null,
        h('div', { class: 'field' }, h('span', {}, 'Stars'),
          h('div', { class: 'stepper' }, h('button', { type: 'button', 'aria-label': 'Fewer stars', onclick: () => step(-1) }, '−'), pts,
            h('button', { type: 'button', 'aria-label': 'More stars', onclick: () => step(1) }, '+'))),
        h('label', { class: 'toggle' }, h('span', {}, 'Photo required'),
          h('input', { type: 'checkbox', checked: f.requires_photo, onchange: (e) => { f.requires_photo = e.target.checked; } })),
        chore ? h('label', { class: 'toggle' }, h('span', {}, 'Active (uncheck to pause)'),
          h('input', { type: 'checkbox', checked: f.active, onchange: (e) => { f.active = e.target.checked; } })) : null,
        err),
      h('div', { class: 'footer' },
        h('button', {
          class: 'btn big block', async onclick() {
            err.textContent = '';
            const body = { ...f, due_date: f.due_date || null };
            try {
              if (chore) await api('PATCH', `/api/chores/${chore.id}`, body);
              else await api('POST', '/api/chores', body);
              close(); toast(chore ? 'Chore saved.' : 'Chore added.'); loadParentTab();
            } catch (e) { err.textContent = e.message; }
          },
        }, chore ? 'Save chore' : 'Add chore'),
        chore ? h('button', {
          class: 'btn danger block', async onclick() {
            if (!confirm(`Delete “${chore.title}”? Stars already earned are kept.`)) return;
            try { await api('DELETE', `/api/chores/${chore.id}`); close(); toast('Chore deleted.'); loadParentTab(); } catch (e) { toast(e.message, true); }
          },
        }, 'Delete chore') : null),
    ];
  }, { label: chore ? 'Edit chore' : 'New chore' });
}

// ---- Rewards (the shop)

function renderRewards(main, rewards) {
  const addBtn = h('button', { class: 'btn small', onclick: () => openRewardEditor(null) }, icon('plus'), 'New reward');
  const have = new Set(rewards.map((r) => r.title.toLowerCase()));
  const ideas = REWARD_IDEAS.filter((i) => !have.has(i.title.toLowerCase()));
  const list = rewards.map((r) => h('button', { class: 'row', onclick: () => openRewardEditor(r) },
    h('span', { class: 'emoji' }, r.emoji),
    h('span', { class: 'grow' }, h('span', { class: 't', style: { display: 'block' } }, r.title),
      h('span', { class: 's' }, starsWord(r.cost))),
    r.active ? h('span', { class: 'pill' }, 'Edit') : h('span', { class: 'pill paused' }, 'Hidden')));
  fill(main, parentTop('Rewards', addBtn),
    h('p', { class: 'hint', style: { margin: '-8px 0 16px' } },
      'Kids trade their stars for these in their Shop tab. You approve each one, and stars never reset, so they can save up.'),
    rewards.length ? h('div', { class: 'panel', style: { paddingTop: '6px', paddingBottom: '6px' } }, h('div', { class: 'rows', style: { marginTop: 0 } }, list))
      : h('div', { class: 'empty', style: { paddingBottom: '10px' } }, h('div', { class: 'big-emoji' }, '🎁'), h('h2', {}, 'No rewards yet'),
        h('p', {}, 'Add your own, or start from an idea below and set your price.')),
    ideas.length ? [h('div', { class: 'section-head' }, h('h2', {}, 'Ideas')),
      h('div', { class: 'chips' }, ideas.map((i) => h('button', { class: 'chip', type: 'button', onclick: () => openRewardEditor(null, i) }, `${i.emoji} ${i.title}`)))] : null);
}

function openRewardEditor(reward, idea) {
  const f = reward ? { ...reward } : { title: idea?.title || '', emoji: idea?.emoji || '🎁', cost: idea?.cost || 20, active: true };
  const err = h('div', { class: 'error-text', role: 'alert' });
  const title = h('input', { class: 'input', value: f.title, placeholder: '30 min screen time', maxlength: 60, oninput: (e) => { f.title = e.target.value; } });
  const cost = h('input', { class: 'input cost-input', type: 'number', inputmode: 'numeric', min: 1, step: 1, value: String(f.cost), 'aria-label': 'Price in stars', oninput: (e) => { f.cost = e.target.value; } });
  const bump = (d) => { const n = Math.max(1, (parseInt(cost.value, 10) || 0) + d); cost.value = String(n); f.cost = n; };

  openSheet(({ close }) => [
    sheetHead(reward ? 'Edit reward' : 'New reward', close),
    h('div', { class: 'form' },
      h('label', { class: 'field' }, h('span', {}, 'Reward'), title),
      h('div', { class: 'field' }, h('span', {}, 'Icon'), chipPicker(REWARD_EMOJI, f.emoji, (v) => { f.emoji = v; }, 'emoji')),
      h('div', { class: 'field' }, h('span', {}, 'Price in stars'),
        h('div', { class: 'stepper' },
          h('button', { type: 'button', 'aria-label': '5 fewer stars', onclick: () => bump(-5) }, '−'), cost,
          h('button', { type: 'button', 'aria-label': '5 more stars', onclick: () => bump(5) }, '+'))),
      reward ? h('label', { class: 'toggle' }, h('span', {}, 'Show in the shop'),
        h('input', { type: 'checkbox', checked: f.active, onchange: (e) => { f.active = e.target.checked; } })) : null,
      err),
    h('div', { class: 'footer' },
      h('button', {
        class: 'btn big block', async onclick() {
          err.textContent = '';
          const body = { title: f.title, emoji: f.emoji, cost: Number(f.cost), active: f.active };
          try {
            if (reward) await api('PATCH', `/api/rewards/${reward.id}`, body);
            else await api('POST', '/api/rewards', body);
            close(); toast(reward ? 'Reward saved.' : 'Reward added to the shop.'); loadParentTab();
          } catch (e) { err.textContent = e.message; }
        },
      }, reward ? 'Save reward' : 'Add to shop'),
      reward ? h('button', {
        class: 'btn danger block', async onclick() {
          if (!confirm(`Delete “${reward.title}”? Past purchases stay in the history.`)) return;
          try { await api('DELETE', `/api/rewards/${reward.id}`); close(); toast('Reward deleted.'); loadParentTab(); } catch (e) { toast(e.message, true); }
        },
      }, 'Delete reward') : null),
  ], { label: reward ? 'Edit reward' : 'New reward' });
}

// ---- Family

function renderFamily(main, users) {
  const kids = users.filter((u) => u.role === 'kid');
  const parents = users.filter((u) => u.role === 'parent');
  const memberRow = (u) => h('button', { class: 'row', onclick: () => openMember(u) },
    avatar(u, 'sm'),
    h('span', { class: 'grow' }, h('span', { class: 't', style: { display: 'block' } }, u.name),
      h('span', { class: 's' }, u.role === 'kid' ? starsWord(u.points) : (u.id === state.me.id ? 'You' : 'Parent'))),
    h('span', { class: 'pill' }, 'Edit'));
  main.replaceChildren(parentTop('Family'),
    h('div', { class: 'section-head' }, h('h2', {}, 'Kids'), h('button', { class: 'btn small', onclick: () => openMember(null, 'kid') }, icon('plus'), 'Add kid')),
    kids.length ? h('div', { class: 'panel', style: { padding: '4px 16px' } }, h('div', { class: 'rows', style: { marginTop: 0 } }, kids.map(memberRow)))
      : h('p', { class: 'hint' }, 'Add each kid with a 4-digit PIN they’ll use to sign in.'),
    h('div', { class: 'section-head' }, h('h2', {}, 'Parents'), h('button', { class: 'btn small ghost', onclick: () => openMember(null, 'parent') }, icon('plus'), 'Add parent')),
    h('div', { class: 'panel', style: { padding: '4px 16px' } }, h('div', { class: 'rows', style: { marginTop: 0 } }, parents.map(memberRow))),
    h('p', { class: 'hint', style: { marginTop: '22px' } },
      'To put this on an iPad or iPhone: open this site in Safari, tap Share, then “Add to Home Screen”.'));
}

function openMember(user, role = user?.role) {
  const isKid = role === 'kid';
  const f = { name: user?.name || '', emoji: user?.emoji || (isKid ? '🦊' : '🦉'), color: user?.color || COLORS[0], secret: '' };
  const err = h('div', { class: 'error-text', role: 'alert' });
  const name = h('input', { class: 'input', value: f.name, maxlength: 40, placeholder: isKid ? 'Name' : 'Mom, Dad…', oninput: (e) => { f.name = e.target.value; } });
  const secret = h('input', {
    class: 'input', type: isKid ? 'text' : 'password', inputmode: isKid ? 'numeric' : null, maxlength: isKid ? 6 : 100,
    autocomplete: 'new-password', placeholder: user ? 'Leave blank to keep the current one' : (isKid ? '4 to 6 digits' : 'At least 6 characters'),
    oninput: (e) => { f.secret = e.target.value; },
  });

  openSheet(({ close }) => [
    sheetHead(user ? user.name : (isKid ? 'Add a kid' : 'Add a parent'), close, user ? avatar(user, 'lg') : null),
    h('div', { class: 'form' },
      h('label', { class: 'field' }, h('span', {}, 'Name'), name),
      h('div', { class: 'field' }, h('span', {}, 'Avatar'), chipPicker(AVATARS, f.emoji, (v) => { f.emoji = v; }, 'emoji')),
      h('div', { class: 'field' }, h('span', {}, 'Color'), chipPicker(COLORS, f.color, (v) => { f.color = v; }, 'color')),
      h('label', { class: 'field' }, h('span', {}, isKid ? (user ? 'New PIN' : 'PIN') : (user ? 'New password' : 'Password')), secret,
        isKid ? h('span', { class: 'hint' }, 'Changing the PIN signs them out on their devices.') : null),
      err),
    h('div', { class: 'footer' },
      h('button', {
        class: 'btn big block', async onclick() {
          err.textContent = '';
          try {
            const body = { name: f.name, emoji: f.emoji, color: f.color };
            if (f.secret) body.secret = f.secret;
            if (user) {
              const r = await api('PATCH', `/api/users/${user.id}`, body);
              if (user.id === state.me.id) state.me = r.user;
            } else {
              if (!f.secret) { err.textContent = isKid ? 'Choose a PIN.' : 'Choose a password.'; return; }
              await api('POST', '/api/users', { ...body, role });
            }
            close(); toast(user ? 'Saved.' : `${f.name} added.`); loadParentTab();
            if (user?.id === state.me.id) renderParent();
          } catch (e) { err.textContent = e.message; }
        },
      }, user ? 'Save' : (isKid ? 'Add kid' : 'Add parent')),
      user && isKid ? h('button', { class: 'btn ghost block', onclick: () => { close(); openHistory(user); } }, 'Stars and history') : null,
      user && user.id !== state.me.id ? h('button', {
        class: 'btn danger block', async onclick() {
          if (!confirm(`Remove ${user.name}? ${isKid ? 'Their chores history and photos are deleted too.' : ''}`)) return;
          try { await api('DELETE', `/api/users/${user.id}`); close(); toast(`${user.name} removed.`); loadParentTab(); } catch (e) { toast(e.message, true); }
        },
      }, `Remove ${user.name}`) : null),
  ], { label: user ? user.name : 'Add family member' });
}

async function openHistory(kid) {
  let data;
  try { data = await api('GET', `/api/history?kid_id=${kid.id}`); } catch (e) { toast(e.message, true); return; }
  const amount = h('input', { class: 'input', inputmode: 'numeric', placeholder: 'Stars', style: { maxWidth: '110px' } });
  const reason = h('input', { class: 'input', placeholder: 'What for?', maxlength: 100 });
  const err = h('div', { class: 'error-text', role: 'alert' });

  const sheet = openSheet(({ close }) => {
    const adjust = async (sign) => {
      err.textContent = '';
      const n = Number(amount.value);
      if (!Number.isInteger(n) || n <= 0) { err.textContent = 'Enter a whole number of stars.'; return; }
      try {
        await api('POST', '/api/ledger', { kid_id: kid.id, amount: sign * n, reason: reason.value });
        data = await api('GET', `/api/history?kid_id=${kid.id}`);
        amount.value = ''; reason.value = '';
        toast(sign < 0 ? `Used ${starsWord(n)}.` : `Added ${starsWord(n)}.`);
        sheet.rerender();
      } catch (e) { err.textContent = e.message; }
    };
    const merged = [
      ...data.items.map((s) => ({ at: s.submitted_at, s })),
      ...data.ledger.map((l) => ({ at: l.created_at, l })),
      ...(data.rewards || []).map((r) => ({ at: r.requested_at, r })),
    ].sort((a, b) => (a.at < b.at ? 1 : -1));
    const REWARD_TEXT = { pending: 'Waiting', approved: 'Bought', denied: 'Said no', canceled: 'Canceled' };

    return [
      sheetHead(kid.name, close, avatar(kid, 'lg')),
      h('div', { class: 'panel' },
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' } },
          h('h3', { style: { fontSize: '20px' } }, 'Stars balance'), starsPill(data.points)),
        h('div', { style: { display: 'flex', gap: '8px' } }, amount, reason),
        err,
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' } },
          h('button', { class: 'btn coral', onclick: () => adjust(-1) }, 'Use stars'),
          h('button', { class: 'btn ghost', onclick: () => adjust(1) }, 'Add stars'))),
      h('h3', { style: { fontSize: '20px', margin: '22px 0 6px' } }, 'History'),
      merged.length ? merged.map(({ s, l, r }) => (r
        ? h('div', { class: 'history-item' },
          h('span', { class: 'thumb' }, r.emoji),
          h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { style: { fontWeight: 800 } }, r.title),
            h('div', { class: 'hint' }, `${timeAgo(r.requested_at)} · ${['denied', 'canceled'].includes(r.status) ? 'stars returned' : `−${starsWord(r.cost)}`}${r.by_name ? ` · ${r.by_name}` : ''}`)),
          h('span', { class: `pill ${r.status === 'approved' ? 'approved' : r.status === 'pending' ? 'pending' : 'rejected'}` }, REWARD_TEXT[r.status]))
        : s
        ? h('div', { class: 'history-item' },
          h('button', { class: 'thumb', 'aria-label': 'Open photo', onclick: () => s.photo && lightbox(s.photo) },
            s.photo ? h('img', { src: s.photo, alt: '', loading: 'lazy' }) : s.chore.emoji),
          h('div', { style: { flex: 1, minWidth: 0 } }, h('div', { style: { fontWeight: 800 } }, s.chore.title),
            h('div', { class: 'hint' }, `${timeAgo(s.submitted_at)}${s.status === 'approved' && s.points ? ` · +${starsWord(s.points)}` : ''}`)),
          h('span', { class: `pill ${s.status}` }, STATUS_TEXT[s.status]))
        : h('div', { class: 'history-item' },
          h('span', { class: 'thumb' }, l.amount < 0 ? '🎁' : '⭐'),
          h('div', { style: { flex: 1 } }, h('div', { style: { fontWeight: 800 } }, l.reason || (l.amount < 0 ? 'Used stars' : 'Bonus stars')),
            h('div', { class: 'hint' }, `${timeAgo(l.created_at)}${l.by_name ? ` · by ${l.by_name}` : ''}`)),
          h('span', { class: 'pill' }, `${l.amount > 0 ? '+' : ''}${l.amount}`))))
        : h('p', { class: 'hint' }, 'Nothing yet.'),
      h('p', { class: 'hint', style: { marginTop: '14px' } }, 'Photos are kept for a while, then removed to save space. The history stays.'),
    ];
  }, { label: `${kid.name} history` });
}

// ------------------------------------------------------------ start

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
boot();
