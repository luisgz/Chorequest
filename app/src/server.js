import express from 'express';
import busboy from 'busboy';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { openDb, tx } from './db.js';
import { todayStr, periodFor, isScheduled, isDateStr, weekStart, TZ } from './schedule.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8080);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'photos');
const PHOTO_RETENTION_DAYS = Number(process.env.PHOTO_RETENTION_DAYS ?? 30);
const SESSION_DAYS = 180;
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const NTFY_URL = process.env.NTFY_URL || '';
const NTFY_TOKEN = process.env.NTFY_TOKEN || '';
const APP_URL = process.env.APP_URL || '';

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const db = openDb(path.join(DATA_DIR, 'chores.db'));
const scrypt = promisify(crypto.scrypt);
const now = () => new Date().toISOString();

// ---------------------------------------------------------------- helpers

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new HttpError(status, message); };

const one = (sql, ...p) => db.prepare(sql).get(...p);
const all = (sql, ...p) => db.prepare(sql).all(...p);
const run = (sql, ...p) => db.prepare(sql).run(...p);

async function hashSecret(secret) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(secret, salt, 32);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

async function checkSecret(secret, stored) {
  const [alg, saltB64, keyB64] = String(stored).split('$');
  if (alg !== 'scrypt') return false;
  const key = await scrypt(String(secret), Buffer.from(saltB64, 'base64'), 32);
  const expected = Buffer.from(keyB64, 'base64');
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

function cleanText(v, max, field) {
  const s = String(v ?? '').trim();
  if (s.length > max) fail(400, `${field} is too long (max ${max} characters).`);
  return s;
}

function cleanEmoji(v, fallback) {
  const s = String(v ?? '').trim();
  return s && s.length <= 16 ? s : fallback;
}

function cleanColor(v, fallback = '#6C4CF1') {
  const s = String(v ?? '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s : fallback;
}

function validateSecret(role, secret) {
  const s = String(secret ?? '');
  if (role === 'kid' && !/^\d{4,6}$/.test(s)) fail(400, 'A kid PIN must be 4 to 6 digits.');
  if (role === 'parent' && s.length < 6) fail(400, 'A parent password needs at least 6 characters.');
  return s;
}

const publicUser = (u) => u && ({ id: u.id, name: u.name, role: u.role, emoji: u.emoji, color: u.color });

function pointsFor(kidId) {
  const earned = one(`SELECT COALESCE(SUM(points),0) AS n FROM submissions WHERE kid_id = ? AND status = 'approved'`, kidId).n;
  const adjust = one(`SELECT COALESCE(SUM(amount),0) AS n FROM ledger WHERE kid_id = ?`, kidId).n;
  return Number(earned) + Number(adjust);
}

// ---------------------------------------------------------------- live updates (SSE)

const listeners = new Set();
function broadcast(payload = {}) {
  const msg = `event: changed\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of listeners) res.write(msg);
}
setInterval(() => { for (const res of listeners) res.write(': ping\n\n'); }, 25_000).unref();

// ---------------------------------------------------------------- notifications (optional, ntfy)

function notifyParents(title, body) {
  if (!NTFY_URL) return;
  const headers = { Title: title, Tags: 'white_check_mark' };
  if (APP_URL) headers.Click = APP_URL;
  if (NTFY_TOKEN) headers.Authorization = `Bearer ${NTFY_TOKEN}`;
  // ntfy headers must be ASCII; send the title via the JSON-free "Title" header only if it is ASCII.
  if (!/^[\x20-\x7E]*$/.test(title)) delete headers.Title;
  fetch(NTFY_URL, { method: 'POST', headers, body }).catch((e) => console.warn('ntfy failed:', e.message));
}

// ---------------------------------------------------------------- first-run setup code

function setupCode() {
  if (one('SELECT COUNT(*) AS n FROM users').n > 0) return null;
  if (process.env.SETUP_CODE) return String(process.env.SETUP_CODE);
  let row = one(`SELECT value FROM meta WHERE key = 'setup_code'`);
  if (!row) {
    const code = String(crypto.randomInt(100000, 999999));
    run(`INSERT INTO meta(key, value) VALUES ('setup_code', ?)`, code);
    row = { value: code };
  }
  return row.value;
}

// ---------------------------------------------------------------- app

const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});

// Session cookie -> req.user
app.use((req, _res, next) => {
  const token = /(?:^|;\s*)cq_session=([^;]+)/.exec(req.headers.cookie || '')?.[1];
  if (token) {
    const row = one(
      `SELECT u.*, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`,
      sha256(token),
    );
    if (row && row.expires_at > now()) req.user = row;
    req.sessionToken = token;
  }
  next();
});

// CSRF guard: state-changing API calls must carry a custom header (cross-site forms can't set it).
app.use('/api', (req, _res, next) => {
  if (!['GET', 'HEAD'].includes(req.method) && req.get('X-Chore-Quest') !== '1') {
    return next(new HttpError(403, 'Missing request header.'));
  }
  next();
});

const requireUser = (req, _res, next) => (req.user ? next() : next(new HttpError(401, 'Please sign in.')));
const requireParent = (req, _res, next) => {
  if (!req.user) return next(new HttpError(401, 'Please sign in.'));
  if (req.user.role !== 'parent') return next(new HttpError(403, 'Only parents can do that.'));
  next();
};

function setSessionCookie(req, res, token, maxAgeSec) {
  const parts = [`cq_session=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSec}`];
  if (req.secure) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

// ---- public

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/family', (req, res) => {
  const users = all(`SELECT * FROM users ORDER BY role = 'parent', id`);
  res.json({ needsSetup: users.length === 0, members: users.map(publicUser), me: publicUser(req.user) || null });
});

app.post('/api/setup', async (req, res) => {
  const code = setupCode();
  if (!code) fail(409, 'This app is already set up.');
  if (String(req.body.code || '').trim() !== code) fail(403, 'That setup code is not right. Check the server log.');
  const name = cleanText(req.body.name, 40, 'Name');
  if (!name) fail(400, 'Enter your name.');
  const secret = validateSecret('parent', req.body.password);
  const hash = await hashSecret(secret);
  const id = tx(db, () => {
    if (one('SELECT COUNT(*) AS n FROM users').n > 0) fail(409, 'This app is already set up.');
    const r = run(`INSERT INTO users(name, role, emoji, color, secret_hash, created_at) VALUES (?, 'parent', ?, ?, ?, ?)`,
      name, cleanEmoji(req.body.emoji, '🦉'), cleanColor(req.body.color, '#6C4CF1'), hash, now());
    run(`DELETE FROM meta WHERE key = 'setup_code'`);
    return Number(r.lastInsertRowid);
  });
  await startSession(req, res, id);
  res.json({ me: publicUser(one('SELECT * FROM users WHERE id = ?', id)) });
});

// Login throttling, per account: 5 wrong tries -> locked for 5 minutes.
const attempts = new Map();
app.post('/api/login', async (req, res) => {
  const user = one('SELECT * FROM users WHERE id = ?', Number(req.body.userId));
  if (!user) fail(404, 'That person was not found.');
  const a = attempts.get(user.id) || { fails: 0, until: 0 };
  if (a.until > Date.now()) {
    const mins = Math.ceil((a.until - Date.now()) / 60000);
    fail(429, `Too many wrong tries. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`);
  }
  const ok = await checkSecret(String(req.body.secret ?? ''), user.secret_hash);
  if (!ok) {
    a.fails += 1;
    if (a.fails >= 5) { a.until = Date.now() + 5 * 60_000; a.fails = 0; }
    attempts.set(user.id, a);
    fail(401, user.role === 'kid' ? 'That PIN is not right.' : 'That password is not right.');
  }
  attempts.delete(user.id);
  await startSession(req, res, user.id);
  res.json({ me: publicUser(user) });
});

async function startSession(req, res, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString();
  run('INSERT INTO sessions(token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)', sha256(token), userId, now(), expires);
  setSessionCookie(req, res, token, SESSION_DAYS * 86400);
}

app.post('/api/logout', (req, res) => {
  if (req.sessionToken) run('DELETE FROM sessions WHERE token_hash = ?', sha256(req.sessionToken));
  setSessionCookie(req, res, '', 0);
  res.json({ ok: true });
});

// ---- signed in

app.get('/api/me', requireUser, (req, res) => {
  const me = publicUser(req.user);
  if (req.user.role === 'kid') me.points = pointsFor(req.user.id);
  res.json({ me, today: todayStr(), timezone: TZ });
});

app.get('/api/events', requireUser, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 5000\n\n');
  listeners.add(res);
  req.on('close', () => listeners.delete(res));
});

// Today's chores, grouped by kid. Kids only get themselves.
function choresForKid(kidId, date) {
  const chores = all(`
    SELECT c.* FROM chores c JOIN chore_assignees a ON a.chore_id = c.id
    WHERE a.user_id = ? AND c.active = 1 AND c.deleted = 0
    ORDER BY c.id`, kidId);
  const items = [];
  for (const c of chores) {
    if (!isScheduled(c, date)) continue;
    const period = periodFor(c, date);
    const sub = one('SELECT * FROM submissions WHERE chore_id = ? AND kid_id = ? AND period = ?', c.id, kidId, period);
    if (c.repeat === 'once') {
      // One-time chores: hidden until their date (if any), and after the day they were approved.
      if (c.due_date && c.due_date > date && !sub) continue;
      if (sub?.status === 'approved' && sub.reviewed_at && todayStr(new Date(sub.reviewed_at)) !== date) continue;
    }
    items.push({ chore: choreOut(c), period, submission: subOut(sub) });
  }
  return items;
}

function choreOut(c) {
  let days = [];
  try { days = JSON.parse(c.days || '[]'); } catch { /* ignore */ }
  return {
    id: c.id, title: c.title, description: c.description, emoji: c.emoji, repeat: c.repeat, days,
    due_date: c.due_date, requires_photo: !!c.requires_photo, points: c.points, active: !!c.active,
  };
}

function subOut(s) {
  if (!s) return null;
  return {
    id: s.id, chore_id: s.chore_id, kid_id: s.kid_id, period: s.period, status: s.status, note: s.note,
    feedback: s.feedback, points: s.points, submitted_at: s.submitted_at, reviewed_at: s.reviewed_at,
    photo: s.photo ? `/api/photos/${s.id}?v=${encodeURIComponent(s.submitted_at)}` : null,
  };
}

app.get('/api/today', requireUser, (req, res) => {
  const date = todayStr();
  const kids = req.user.role === 'kid'
    ? [req.user]
    : all(`SELECT * FROM users WHERE role = 'kid' ORDER BY id`);
  const ws = weekStart(date);
  res.json({
    date,
    kids: kids.map((k) => ({
      kid: publicUser(k),
      points: pointsFor(k.id),
      weekPoints: one(`SELECT COALESCE(SUM(points),0) AS n FROM submissions
                       WHERE kid_id = ? AND status = 'approved' AND reviewed_at >= ?`, k.id, ws + 'T00:00:00').n,
      items: choresForKid(k.id, date),
    })),
  });
});

// Kid submits a chore (multipart: chore_id, note, photo)
app.post('/api/submissions', requireUser, async (req, res) => {
  if (req.user.role !== 'kid') fail(403, 'Only kids turn in chores. Use "Mark done" to complete one for them.');
  const { fields, file } = await readUpload(req);
  try {
    const chore = one(`SELECT c.* FROM chores c JOIN chore_assignees a ON a.chore_id = c.id
                       WHERE c.id = ? AND a.user_id = ? AND c.active = 1 AND c.deleted = 0`,
    Number(fields.chore_id), req.user.id);
    if (!chore) fail(404, 'That chore is not on your list.');
    const date = todayStr();
    if (!isScheduled(chore, date)) fail(400, 'That chore is not for today.');
    if (chore.requires_photo && !file) fail(400, 'Take a photo to show it is done.');
    const period = periodFor(chore, date);
    const note = cleanText(fields.note, 300, 'Note');
    const existing = one('SELECT * FROM submissions WHERE chore_id = ? AND kid_id = ? AND period = ?', chore.id, req.user.id, period);
    if (existing?.status === 'approved') fail(409, 'This chore is already approved.');

    let id;
    if (existing) {
      if (file && existing.photo) removePhoto(existing.photo);
      run(`UPDATE submissions SET photo = ?, note = ?, status = 'pending', feedback = '', submitted_at = ?,
           reviewed_by = NULL, reviewed_at = NULL WHERE id = ?`,
      file ? file.name : existing.photo, note, now(), existing.id);
      id = existing.id;
    } else {
      const r = run(`INSERT INTO submissions(chore_id, kid_id, period, photo, note, status, submitted_at)
                     VALUES (?, ?, ?, ?, ?, 'pending', ?)`, chore.id, req.user.id, period, file?.name ?? null, note, now());
      id = Number(r.lastInsertRowid);
    }
    broadcast({ kind: 'submission' });
    notifyParents(`${req.user.name} finished a chore`, `${req.user.name} finished "${chore.title}". Tap to review.`);
    res.json({ submission: subOut(one('SELECT * FROM submissions WHERE id = ?', id)) });
  } catch (err) {
    if (file) removePhoto(file.name);
    throw err;
  }
});

function sniffImage(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (buf.toString('ascii', 4, 8) === 'ftyp' && /^(heic|heix|mif1|msf1|heif|hevc)/.test(buf.toString('ascii', 8, 12))) return 'heic';
  return null;
}

function readUpload(req) {
  return new Promise((resolve, reject) => {
    let bb;
    try {
      bb = busboy({ headers: req.headers, limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 10 } });
    } catch {
      return reject(new HttpError(400, 'Expected a form upload.'));
    }
    const fields = {};
    let file = null;
    let pending = null;
    let error = null;
    bb.on('field', (name, val) => { fields[name] = val; });
    bb.on('file', (_name, stream) => {
      const chunks = [];
      let size = 0;
      pending = new Promise((done) => {
        stream.on('data', (c) => { size += c.length; chunks.push(c); });
        stream.on('limit', () => { error = new HttpError(413, 'That photo is too big (max 15 MB).'); });
        stream.on('end', () => {
          if (error || size === 0) return done();
          const buf = Buffer.concat(chunks);
          const ext = sniffImage(buf);
          if (!ext) { error = new HttpError(400, 'That file is not a photo.'); return done(); }
          const name = `${crypto.randomUUID()}.${ext}`;
          fs.writeFile(path.join(UPLOAD_DIR, name), buf, (e) => {
            if (e) error = e; else file = { name };
            done();
          });
        });
      });
    });
    bb.on('error', reject);
    bb.on('close', async () => {
      await pending;
      if (error) {
        if (file) removePhoto(file.name);
        return reject(error);
      }
      resolve({ fields, file });
    });
    req.pipe(bb);
  });
}

function removePhoto(name) {
  if (!name || name.includes('/') || name.includes('..')) return;
  fs.rm(path.join(UPLOAD_DIR, name), { force: true }, () => {});
}

const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic' };
app.get('/api/photos/:id', requireUser, (req, res) => {
  const s = one('SELECT * FROM submissions WHERE id = ?', Number(req.params.id));
  if (!s || !s.photo) fail(404, 'Photo not found.');
  if (req.user.role === 'kid' && s.kid_id !== req.user.id) fail(404, 'Photo not found.');
  const file = path.join(UPLOAD_DIR, s.photo);
  if (!fs.existsSync(file)) fail(404, 'Photo not found.');
  res.setHeader('Content-Type', MIME[path.extname(s.photo).slice(1)] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
  fs.createReadStream(file).pipe(res);
});

// ---- parent: review

const reviewSelect = `
  SELECT s.*, c.title AS chore_title, c.emoji AS chore_emoji, c.points AS chore_points,
         u.name AS kid_name, u.emoji AS kid_emoji, u.color AS kid_color
  FROM submissions s JOIN chores c ON c.id = s.chore_id JOIN users u ON u.id = s.kid_id`;

const reviewOut = (r) => ({
  ...subOut(r),
  chore: { id: r.chore_id, title: r.chore_title, emoji: r.chore_emoji, points: r.chore_points },
  kid: { id: r.kid_id, name: r.kid_name, emoji: r.kid_emoji, color: r.kid_color },
});

app.get('/api/review', requireParent, (_req, res) => {
  res.json({ items: all(`${reviewSelect} WHERE s.status = 'pending' ORDER BY s.submitted_at`).map(reviewOut) });
});

app.post('/api/submissions/:id/review', requireParent, (req, res) => {
  const s = one(`${reviewSelect} WHERE s.id = ?`, Number(req.params.id));
  if (!s) fail(404, 'That submission was not found.');
  const decision = req.body.decision;
  if (!['approve', 'reject'].includes(decision)) fail(400, 'Choose approve or send back.');
  const feedback = cleanText(req.body.feedback, 300, 'Note');
  if (decision === 'approve') {
    run(`UPDATE submissions SET status = 'approved', points = ?, feedback = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?`,
      s.chore_points, feedback, req.user.id, now(), s.id);
  } else {
    run(`UPDATE submissions SET status = 'rejected', points = 0, feedback = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?`,
      feedback, req.user.id, now(), s.id);
  }
  broadcast({ kind: 'review' });
  res.json({ submission: reviewOut(one(`${reviewSelect} WHERE s.id = ?`, s.id)) });
});

// Parent marks a chore done for a kid (no photo), approved straight away.
app.post('/api/chores/:id/complete', requireParent, (req, res) => {
  const kidId = Number(req.body.kid_id);
  const chore = one(`SELECT c.* FROM chores c JOIN chore_assignees a ON a.chore_id = c.id
                     WHERE c.id = ? AND a.user_id = ? AND c.deleted = 0`, Number(req.params.id), kidId);
  if (!chore) fail(404, 'That chore is not assigned to this kid.');
  const period = periodFor(chore, todayStr());
  const ts = now();
  tx(db, () => {
    const existing = one('SELECT * FROM submissions WHERE chore_id = ? AND kid_id = ? AND period = ?', chore.id, kidId, period);
    if (existing) {
      run(`UPDATE submissions SET status = 'approved', points = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?`,
        chore.points, req.user.id, ts, existing.id);
    } else {
      run(`INSERT INTO submissions(chore_id, kid_id, period, status, points, submitted_at, reviewed_by, reviewed_at)
           VALUES (?, ?, ?, 'approved', ?, ?, ?, ?)`, chore.id, kidId, period, chore.points, ts, req.user.id, ts);
    }
  });
  broadcast({ kind: 'review' });
  res.json({ ok: true });
});

app.get('/api/history', requireUser, (req, res) => {
  const kidId = req.user.role === 'kid' ? req.user.id : Number(req.query.kid_id);
  if (!kidId) fail(400, 'Choose a kid.');
  const limit = Math.min(Number(req.query.limit) || 60, 200);
  const items = all(`${reviewSelect} WHERE s.kid_id = ? ORDER BY s.submitted_at DESC LIMIT ?`, kidId, limit).map(reviewOut);
  const ledger = all(`SELECT l.*, u.name AS by_name FROM ledger l LEFT JOIN users u ON u.id = l.created_by
                      WHERE l.kid_id = ? ORDER BY l.created_at DESC LIMIT 50`, kidId);
  res.json({ items, ledger, points: pointsFor(kidId) });
});

// ---- parent: chores

function choreInput(body, existing = {}) {
  const pick = (k) => (body[k] !== undefined ? body[k] : existing[k]);
  const title = cleanText(pick('title'), 60, 'Title');
  if (!title) fail(400, 'Give the chore a name.');
  const repeat = pick('repeat');
  if (!['daily', 'days', 'weekly', 'once'].includes(repeat)) fail(400, 'Choose how often this chore repeats.');
  let days = body.days !== undefined ? body.days : JSON.parse(existing.days || '[]');
  if (!Array.isArray(days)) days = [];
  days = [...new Set(days.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
  if (repeat === 'days' && days.length === 0) fail(400, 'Pick at least one day.');
  let due = pick('due_date') || null;
  if (due && !isDateStr(due)) fail(400, 'That date is not valid.');
  if (repeat !== 'once') due = null;
  const points = Number(pick('points') ?? 0);
  if (!Number.isInteger(points) || points < 0 || points > 1000) fail(400, 'Points must be a whole number from 0 to 1000.');
  return {
    title,
    description: cleanText(pick('description'), 400, 'Details'),
    emoji: cleanEmoji(pick('emoji'), '✨'),
    repeat,
    days: JSON.stringify(repeat === 'days' ? days : []),
    due_date: due,
    requires_photo: pick('requires_photo') === undefined ? 1 : (pick('requires_photo') ? 1 : 0),
    points,
    active: pick('active') === undefined ? 1 : (pick('active') ? 1 : 0),
  };
}

function assigneesInput(list) {
  if (!Array.isArray(list) || list.length === 0) fail(400, 'Assign the chore to at least one kid.');
  const ids = [...new Set(list.map(Number))];
  for (const id of ids) {
    if (!one(`SELECT 1 FROM users WHERE id = ? AND role = 'kid'`, id)) fail(400, 'One of the kids was not found.');
  }
  return ids;
}

function choreWithAssignees(c) {
  return { ...choreOut(c), assignees: all('SELECT user_id FROM chore_assignees WHERE chore_id = ?', c.id).map((r) => r.user_id) };
}

app.get('/api/chores', requireParent, (_req, res) => {
  res.json({ items: all('SELECT * FROM chores WHERE deleted = 0 ORDER BY active DESC, id DESC').map(choreWithAssignees) });
});

app.post('/api/chores', requireParent, (req, res) => {
  const c = choreInput(req.body);
  const kids = assigneesInput(req.body.assignees);
  const id = tx(db, () => {
    const r = run(`INSERT INTO chores(title, description, emoji, repeat, days, due_date, requires_photo, points, active, created_by, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    c.title, c.description, c.emoji, c.repeat, c.days, c.due_date, c.requires_photo, c.points, c.active, req.user.id, now());
    const cid = Number(r.lastInsertRowid);
    for (const k of kids) run('INSERT INTO chore_assignees(chore_id, user_id) VALUES (?, ?)', cid, k);
    return cid;
  });
  broadcast({ kind: 'chores' });
  res.json({ chore: choreWithAssignees(one('SELECT * FROM chores WHERE id = ?', id)) });
});

app.patch('/api/chores/:id', requireParent, (req, res) => {
  const existing = one('SELECT * FROM chores WHERE id = ? AND deleted = 0', Number(req.params.id));
  if (!existing) fail(404, 'That chore was not found.');
  const c = choreInput(req.body, existing);
  const kids = req.body.assignees !== undefined ? assigneesInput(req.body.assignees) : null;
  tx(db, () => {
    run(`UPDATE chores SET title = ?, description = ?, emoji = ?, repeat = ?, days = ?, due_date = ?, requires_photo = ?,
         points = ?, active = ? WHERE id = ?`,
    c.title, c.description, c.emoji, c.repeat, c.days, c.due_date, c.requires_photo, c.points, c.active, existing.id);
    if (kids) {
      run('DELETE FROM chore_assignees WHERE chore_id = ?', existing.id);
      for (const k of kids) run('INSERT INTO chore_assignees(chore_id, user_id) VALUES (?, ?)', existing.id, k);
    }
  });
  broadcast({ kind: 'chores' });
  res.json({ chore: choreWithAssignees(one('SELECT * FROM chores WHERE id = ?', existing.id)) });
});

app.delete('/api/chores/:id', requireParent, (req, res) => {
  const c = one('SELECT * FROM chores WHERE id = ? AND deleted = 0', Number(req.params.id));
  if (!c) fail(404, 'That chore was not found.');
  // Keep history (and points earned) by soft-deleting.
  run('UPDATE chores SET deleted = 1, active = 0 WHERE id = ?', c.id);
  broadcast({ kind: 'chores' });
  res.json({ ok: true });
});

// ---- parent: family

app.get('/api/users', requireParent, (_req, res) => {
  const users = all(`SELECT * FROM users ORDER BY role = 'parent', id`);
  res.json({ items: users.map((u) => ({ ...publicUser(u), points: u.role === 'kid' ? pointsFor(u.id) : null })) });
});

app.post('/api/users', requireParent, async (req, res) => {
  const role = req.body.role === 'parent' ? 'parent' : 'kid';
  const name = cleanText(req.body.name, 40, 'Name');
  if (!name) fail(400, 'Enter a name.');
  const hash = await hashSecret(validateSecret(role, req.body.secret));
  const r = run(`INSERT INTO users(name, role, emoji, color, secret_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    name, role, cleanEmoji(req.body.emoji, role === 'kid' ? '🦊' : '🦉'), cleanColor(req.body.color), hash, now());
  broadcast({ kind: 'family' });
  res.json({ user: publicUser(one('SELECT * FROM users WHERE id = ?', Number(r.lastInsertRowid))) });
});

app.patch('/api/users/:id', requireParent, async (req, res) => {
  const u = one('SELECT * FROM users WHERE id = ?', Number(req.params.id));
  if (!u) fail(404, 'That person was not found.');
  const name = req.body.name !== undefined ? cleanText(req.body.name, 40, 'Name') : u.name;
  if (!name) fail(400, 'Enter a name.');
  let hash = u.secret_hash;
  if (req.body.secret) {
    hash = await hashSecret(validateSecret(u.role, req.body.secret));
    attempts.delete(u.id);
  }
  run('UPDATE users SET name = ?, emoji = ?, color = ?, secret_hash = ? WHERE id = ?',
    name, cleanEmoji(req.body.emoji, u.emoji), cleanColor(req.body.color, u.color), hash, u.id);
  if (req.body.secret && u.id !== req.user.id) run('DELETE FROM sessions WHERE user_id = ?', u.id);
  broadcast({ kind: 'family' });
  res.json({ user: publicUser(one('SELECT * FROM users WHERE id = ?', u.id)) });
});

app.delete('/api/users/:id', requireParent, (req, res) => {
  const u = one('SELECT * FROM users WHERE id = ?', Number(req.params.id));
  if (!u) fail(404, 'That person was not found.');
  if (u.id === req.user.id) fail(400, 'You cannot remove yourself.');
  for (const s of all('SELECT photo FROM submissions WHERE kid_id = ? AND photo IS NOT NULL', u.id)) removePhoto(s.photo);
  run('DELETE FROM users WHERE id = ?', u.id);
  broadcast({ kind: 'family' });
  res.json({ ok: true });
});

app.post('/api/ledger', requireParent, (req, res) => {
  const kid = one(`SELECT * FROM users WHERE id = ? AND role = 'kid'`, Number(req.body.kid_id));
  if (!kid) fail(404, 'That kid was not found.');
  const amount = Number(req.body.amount);
  if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 100000) fail(400, 'Enter a whole number of points.');
  run('INSERT INTO ledger(kid_id, amount, reason, created_by, created_at) VALUES (?, ?, ?, ?, ?)',
    kid.id, amount, cleanText(req.body.reason, 100, 'Reason'), req.user.id, now());
  broadcast({ kind: 'points' });
  res.json({ points: pointsFor(kid.id) });
});

// ---- static app

const PUBLIC = path.join(__dirname, '..', 'public');
app.use(express.static(PUBLIC, {
  setHeaders(res, file) {
    if (/\.(woff2|png)$/.test(file)) res.setHeader('Cache-Control', 'public, max-age=2592000');
    else res.setHeader('Cache-Control', 'no-cache');
  },
}));
app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(PUBLIC, 'index.html'));
});

app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Not found.')));

// Errors
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Something went wrong on the server.' : err.message });
});

// ---------------------------------------------------------------- housekeeping

function cleanup() {
  run('DELETE FROM sessions WHERE expires_at < ?', now());
  if (PHOTO_RETENTION_DAYS > 0) {
    const cutoff = new Date(Date.now() - PHOTO_RETENTION_DAYS * 86400_000).toISOString();
    const old = all(`SELECT id, photo FROM submissions WHERE photo IS NOT NULL AND status != 'pending'
                     AND COALESCE(reviewed_at, submitted_at) < ?`, cutoff);
    for (const s of old) {
      removePhoto(s.photo);
      run('UPDATE submissions SET photo = NULL WHERE id = ?', s.id);
    }
    if (old.length) console.log(`Removed ${old.length} photo(s) older than ${PHOTO_RETENTION_DAYS} days.`);
  }
}
cleanup();
setInterval(cleanup, 6 * 3600_000).unref();

app.listen(PORT, () => {
  console.log(`Chore Quest running on port ${PORT} (time zone ${TZ}, data in ${DATA_DIR})`);
  const code = setupCode();
  if (code) {
    console.log('');
    console.log('  First-run setup: open the app and enter this setup code to create the first parent account:');
    console.log(`  >>> ${code} <<<`);
    console.log('');
  }
});
