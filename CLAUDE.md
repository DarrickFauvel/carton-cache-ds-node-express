# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev server (watch mode, auto-restarts on file changes)
npm start

# The server reads from .env automatically (no dotenv package needed)
# PORT and DB_PATH are the two env vars
```

No linter or test runner is configured.

## Architecture

This is an Express 5 app using ES modules (`"type": "module"` in package.json). It uses Node's built-in `node:sqlite` (no third-party ORM or driver).

**Request flow:**
- `index.js` — entry point; mounts the API router at `/api/cartons`, serves UI routes directly, and renders HTML via a simple string-template system
- `routes/cartons.js` — REST API: GET/POST/PUT/DELETE for `/api/cartons`
- `db/database.js` — opens the SQLite database, creates the `cartons` table if absent, and runs migrations (ALTER TABLE) for columns added after initial release

**Templating:** No template engine. `index.js` reads raw `.html` files from `views/` with `readFileSync` and replaces `{{PLACEHOLDER}}` tokens manually. `views/layout.html` wraps all pages; `{{TITLE}}` and `{{BODY}}` are the injection points.

**Frontend:** Vanilla JS inline in the HTML views — no build step, no bundler. The UI calls the REST API for create/update/delete operations. `public/sw.js` and `public/manifest.json` provide PWA support.

**Database:** SQLite file at `./cartons.db` (configurable via `DB_PATH` env var). All queries use `db.prepare(...).run/get/all()` — synchronous, prepared statements.

**Condition values** are an enum enforced at both the API (`routes/cartons.js`) and the DB schema: `new | good | fair | poor`.
