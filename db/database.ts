import { createClient } from '@libsql/client'

const db = createClient({
  url:       process.env.TURSO_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

await db.execute(`
  CREATE TABLE IF NOT EXISTS cartons (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    label_id   TEXT    NOT NULL,
    brand      TEXT    NOT NULL DEFAULT '',
    carton_id  TEXT    NOT NULL DEFAULT '',
    color      TEXT    NOT NULL DEFAULT '',
    length     REAL    NOT NULL,
    width      REAL    NOT NULL,
    height     REAL    NOT NULL,
    condition  TEXT    NOT NULL CHECK(condition IN ('new', 'good', 'fair', 'poor')),
    quantity   INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
    location   TEXT    NOT NULL DEFAULT '',
    notes      TEXT    NOT NULL DEFAULT ''
  )
`)

for (const sql of [
  "ALTER TABLE cartons ADD COLUMN carton_id TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE cartons ADD COLUMN color     TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE cartons ADD COLUMN location  TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE cartons ADD COLUMN notes     TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE cartons ADD COLUMN brand     TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE cartons ADD COLUMN label_id  TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE cartons RENAME COLUMN label   TO label_id",
  "ALTER TABLE cartons RENAME COLUMN company TO brand",
  "ALTER TABLE cartons RENAME COLUMN model   TO carton_id",
]) {
  try { await db.execute(sql) } catch { /* column already exists or already renamed */ }
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
