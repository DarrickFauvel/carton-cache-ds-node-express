import { createClient } from '@libsql/client'

const db = createClient({
  url:       process.env.TURSO_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

await db.execute(`
  CREATE TABLE IF NOT EXISTS cartons (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    label     TEXT    NOT NULL,
    company   TEXT    NOT NULL DEFAULT '',
    model     TEXT    NOT NULL DEFAULT '',
    color     TEXT    NOT NULL DEFAULT '',
    length    REAL    NOT NULL,
    width     REAL    NOT NULL,
    height    REAL    NOT NULL,
    condition TEXT    NOT NULL CHECK(condition IN ('new', 'good', 'fair', 'poor')),
    quantity  INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
    location  TEXT    NOT NULL DEFAULT '',
    notes     TEXT    NOT NULL DEFAULT ''
  )
`)

for (const sql of [
  "ALTER TABLE cartons ADD COLUMN model    TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE cartons ADD COLUMN color    TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE cartons ADD COLUMN location TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE cartons ADD COLUMN notes    TEXT NOT NULL DEFAULT ''",
]) {
  try { await db.execute(sql) } catch { /* column already exists */ }
}

await db.execute(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  )
`)

try {
  await db.execute("ALTER TABLE cartons ADD COLUMN user_id INTEGER REFERENCES users(id)")
} catch { /* already exists */ }

export default db
