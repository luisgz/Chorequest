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
