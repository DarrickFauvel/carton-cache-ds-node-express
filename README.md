# carton-cache-ds-node-express

A multi-user web app for tracking a personal inventory of shipping cartons. Track box dimensions, condition, quantity, and storage location — and quickly find the right carton for an item you need to ship.

## Features

- **Inventory management** — add, edit, and delete cartons with fields for company, model, color, dimensions (L×W×H), condition, quantity, location, and notes
- **Auto-generated labels** — each carton gets a short label derived from its attributes
- **Carton finder** — enter item dimensions and get a sorted list of cartons that fit with at least 1" clearance on every face
- **Multi-user accounts** — each user sees only their own inventory; passwords are bcrypt-hashed
- **PWA support** — installable, mobile-friendly UI with a service worker

## Tech Stack

- **Runtime:** Node.js (ES modules)
- **Framework:** Express 5
- **Database:** [Turso](https://turso.tech/) (libSQL), accessed via `@libsql/client`
- **Auth:** `express-session` + `bcrypt`
- **Templating:** No template engine — raw HTML files with `{{PLACEHOLDER}}` token replacement
- **Frontend:** Vanilla JS, no build step

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file:
   ```env
   PORT=3000
   SESSION_SECRET=your-secret-here
   TURSO_URL=libsql://your-database.turso.io
   TURSO_AUTH_TOKEN=your-auth-token
   ```

3. Start the dev server (auto-restarts on file changes):
   ```bash
   npm start
   ```

The app will be available at `http://localhost:3000`. Register an account on first use.

## API

All endpoints require authentication (`/api/cartons`):

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/cartons` | List all cartons for the current user |
| POST | `/api/cartons` | Create a new carton |
| PUT | `/api/cartons/:id` | Update a carton |
| DELETE | `/api/cartons/:id` | Delete a carton |

Condition values are an enum: `new | good | fair | poor`.

## Project Structure

```
index.js              # Entry point, UI routes, HTML rendering
routes/
  cartons.js          # REST API router
  auth.js             # Login, register, logout routes
db/
  database.js         # libSQL client, schema creation, migrations
middleware/
  auth.js             # requireAuth / requireAuthApi middleware
lib/
  views.js            # HTML file loader and layout renderer
views/                # HTML templates
public/               # Static assets, service worker, manifest
```
