import express from 'express'
import session from 'express-session'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import cartonsRouter from './routes/cartons.js'
import authRouter from './routes/auth.js'
import db from './db/database.js'
import { escHtml, readView, renderLayout } from './lib/views.js'
import { requireAuth, requireAuthApi } from './middleware/auth.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(express.static(join(__dirname, 'public')))

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}))

// — Auth routes (public) —
app.use('/', authRouter)

// — API (requires auth) —
app.use('/api/cartons', requireAuthApi, cartonsRouter)

// — UI Routes —
app.get('/', requireAuth, async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT * FROM cartons WHERE user_id = ? ORDER BY id DESC',
    args: [req.session.userId],
  })
  const cartons = result.rows

  let cartonTable
  if (cartons.length === 0) {
    cartonTable = '<p class="empty-state">No cartons yet. <a href="/cartons/new">Add your first one</a>.</p>'
  } else {
    const rows = cartons.map(c => `
    <tr>
      <td data-label="Company">${c.company ? escHtml(c.company) : '<span class="muted">—</span>'}</td>
      <td data-label="Model">${c.model ? escHtml(c.model) : '<span class="muted">—</span>'}</td>
      <td data-label="Size">${c.length} × ${c.width} × ${c.height} in</td>
      <td data-label="Color">${c.color ? escHtml(c.color) : '<span class="muted">—</span>'}</td>
      <td data-label="Condition"><span class="badge badge-${c.condition}">${c.condition}</span></td>
      <td data-label="Qty">${c.quantity}</td>
      <td data-label="Location">${c.location ? escHtml(c.location) : '<span class="muted">—</span>'}</td>
      <td data-label="Notes">${c.notes ? escHtml(c.notes) : '<span class="muted">—</span>'}</td>
      <td data-label="Label">${escHtml(c.label)}</td>
      <td class="actions">
        <a href="/cartons/${c.id}/edit" class="btn-edit">Edit</a>
        <button class="btn-delete" data-id="${c.id}">Delete</button>
      </td>
    </tr>`).join('')
    cartonTable = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Company</th><th>Model</th><th>Size (L×W×H)</th><th>Color</th><th>Condition</th><th>Qty</th><th>Location</th><th>Notes</th><th>Label</th><th>Actions</th>
          </tr>
        </thead>
        <tbody id="carton-tbody">${rows}</tbody>
      </table>
    </div>`
  }

  const body = readView('index.html').replace('{{CARTON_TABLE}}', cartonTable)
  res.send(renderLayout('Inventory', body, req.session.username))
})

app.get('/cartons/new', requireAuth, (_req, res) => {
  res.send(renderLayout('Add Carton', readView('new.html'), _req.session.username))
})

app.get('/cartons/:id/edit', requireAuth, async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT * FROM cartons WHERE id = ? AND user_id = ?',
    args: [req.params.id, req.session.userId],
  })
  const carton = result.rows[0]
  if (!carton) return res.status(404).send(renderLayout('Not Found', '<p>Carton not found.</p>', req.session.username))

  const body = readView('edit.html')
    .replace('{{CARTON_ID}}', carton.id)
    .replace('{{CARTON_LABEL}}', escHtml(carton.label))
    .replace('{{CARTON_MODEL}}', escHtml(carton.model))
    .replace('{{CARTON_COMPANY}}', escHtml(carton.company))
    .replace('{{CARTON_COLOR}}', escHtml(carton.color))
    .replace('{{CARTON_LENGTH}}', carton.length)
    .replace('{{CARTON_WIDTH}}', carton.width)
    .replace('{{CARTON_HEIGHT}}', carton.height)
    .replace('{{CARTON_QUANTITY}}', carton.quantity)
    .replace('{{CARTON_LOCATION}}', escHtml(carton.location))
    .replace('{{CARTON_NOTES}}', escHtml(carton.notes))
    .replace(`{{CARTON_CONDITION_${carton.condition.toUpperCase()}}}`, 'selected')
    .replace(/\{\{CARTON_CONDITION_\w+\}\}/g, '')

  res.send(renderLayout('Edit Carton', body, req.session.username))
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
