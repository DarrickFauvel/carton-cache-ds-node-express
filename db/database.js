import { DatabaseSync } from 'node:sqlite'

const db = new DatabaseSync(process.env.DB_PATH || './cartons.db')

db.exec(`
  CREATE TABLE IF NOT EXISTS cartons (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    label     TEXT    NOT NULL,
    company   TEXT    NOT NULL DEFAULT '',
    length    REAL    NOT NULL,
    width     REAL    NOT NULL,
    height    REAL    NOT NULL,
    condition TEXT    NOT NULL CHECK(condition IN ('new', 'good', 'fair', 'poor')),
    quantity  INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0)
  )
`)

export default db
