import { DatabaseSync } from 'node:sqlite'

const db = new DatabaseSync(process.env.DB_PATH || './cartons.db')

db.exec(`
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

// Migrate existing databases
for (const sql of [
  "ALTER TABLE cartons ADD COLUMN model    TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE cartons ADD COLUMN color    TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE cartons ADD COLUMN location TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE cartons ADD COLUMN notes    TEXT NOT NULL DEFAULT ''",
]) {
  try { db.exec(sql) } catch { /* column already exists */ }
}

export default db
