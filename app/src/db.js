import { DatabaseSync } from 'node:sqlite';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('parent','kid')),
  emoji       TEXT NOT NULL DEFAULT '🙂',
  color       TEXT NOT NULL DEFAULT '#6C4CF1',
  secret_hash TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chores (
  id             INTEGER PRIMARY KEY,
  title          TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  emoji          TEXT NOT NULL DEFAULT '✨',
  repeat         TEXT NOT NULL CHECK (repeat IN ('daily','days','weekly','once')),
  days           TEXT NOT NULL DEFAULT '[]',
  due_date       TEXT,
  requires_photo INTEGER NOT NULL DEFAULT 1,
  points         INTEGER NOT NULL DEFAULT 0,
  active         INTEGER NOT NULL DEFAULT 1,
  deleted        INTEGER NOT NULL DEFAULT 0,
  created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chore_assignees (
  chore_id INTEGER NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (chore_id, user_id)
);

CREATE TABLE IF NOT EXISTS submissions (
  id           INTEGER PRIMARY KEY,
  chore_id     INTEGER NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
  kid_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period       TEXT NOT NULL,
  photo        TEXT,
  note         TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL CHECK (status IN ('pending','approved','rejected')),
  feedback     TEXT NOT NULL DEFAULT '',
  points       INTEGER NOT NULL DEFAULT 0,
  submitted_at TEXT NOT NULL,
  reviewed_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at  TEXT,
  UNIQUE (chore_id, kid_id, period)
);
CREATE INDEX IF NOT EXISTS submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS submissions_kid ON submissions(kid_id, submitted_at);

CREATE TABLE IF NOT EXISTS ledger (
  id         INTEGER PRIMARY KEY,
  kid_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount     INTEGER NOT NULL,
  reason     TEXT NOT NULL DEFAULT '',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

-- Rewards shop: parents set prices, kids trade stars for rewards.
CREATE TABLE IF NOT EXISTS rewards (
  id         INTEGER PRIMARY KEY,
  title      TEXT NOT NULL,
  emoji      TEXT NOT NULL DEFAULT '🎁',
  cost       INTEGER NOT NULL CHECK (cost > 0),
  active     INTEGER NOT NULL DEFAULT 1,
  deleted    INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

-- A kid's request to buy a reward. Pending requests hold the stars; saying no gives them back.
-- Title, emoji and cost are copied so history stays right if the reward is edited later.
CREATE TABLE IF NOT EXISTS reward_requests (
  id           INTEGER PRIMARY KEY,
  reward_id    INTEGER REFERENCES rewards(id) ON DELETE SET NULL,
  kid_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  emoji        TEXT NOT NULL,
  cost         INTEGER NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('pending','approved','denied','canceled')),
  feedback     TEXT NOT NULL DEFAULT '',
  requested_at TEXT NOT NULL,
  reviewed_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at  TEXT
);
CREATE INDEX IF NOT EXISTS reward_requests_status ON reward_requests(status);
CREATE INDEX IF NOT EXISTS reward_requests_kid ON reward_requests(kid_id, requested_at);

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);
`;

export function openDb(file) {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  db.exec(SCHEMA);
  return db;
}

/** Run fn inside a transaction. */
export function tx(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
