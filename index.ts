import express from 'express'
import session from 'express-session'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import cartonsRouter from './routes/cartons.ts'
import authRouter from './routes/auth.ts'
import db from './db/database.ts'
import { escHtml, readView, renderLayout } from './lib/views.ts'
import { requireAuth, requireAuthApi } from './middleware/auth.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()

// libsql Row objects are array-like; column named 'length' collides with Array.length.
// Convert to plain objects and nest dimensions to avoid the collision by design.
interface Carton {
  id: number
  label_id: string
  brand: string
  carton_id: string
  color: string
  condition: string
  quantity: number
  location: string
  notes: string
  user_id: number
  dimensions: { length: number; width: number; height: number }
}

const toPlain = (result: Awaited<ReturnType<typeof db.execute>>): Carton[] =>
  result.rows.map(row => {
    const obj = Object.fromEntries(result.columns.map((col, i) => [col, row[i]]))
    const { length, width, height, ...rest } = obj as Record<string, unknown> & { length: number; width: number; height: number }
    return { ...rest, dimensions: { length, width, height } } as Carton
  })

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
  const cartons = toPlain(result)

  let cartonTable
  if (cartons.length === 0) {
    cartonTable = '<p class="empty-state">No cartons yet. <a href="/cartons/new">Add your first one</a>.</p>'
  } else {
    const rows = cartons.map(c => `
    <tr>
      <td data-label="Brand" class="mobile-hidden">${c.brand ? escHtml(c.brand) : '<span class="muted">—</span>'}</td>
      <td data-label="Carton ID" class="mobile-hidden">${c.carton_id ? escHtml(c.carton_id) : '<span class="muted">—</span>'}</td>
      <td data-label="Size" class="mobile-hidden">${c.dimensions.length} × ${c.dimensions.width} × ${c.dimensions.height} in</td>
      <td data-label="Color" class="mobile-hidden">${c.color ? escHtml(c.color) : '<span class="muted">—</span>'}</td>
      <td data-label="Condition" class="mobile-hidden"><span class="badge badge-${c.condition}">${c.condition}</span></td>
      <td data-label="Label ID">${escHtml(c.label_id)}</td>
      <td data-label="Location">${c.location ? escHtml(c.location) : '<span class="muted">—</span>'}</td>
      <td data-label="Qty">${c.quantity}</td>
      <td data-label="Notes" class="mobile-hidden">${c.notes ? escHtml(c.notes) : '<span class="muted">—</span>'}</td>
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
            <th>Brand</th><th>Carton ID</th><th>Size (L×W×H)</th><th>Color</th><th>Condition</th><th>Qty</th><th>Location</th><th>Notes</th><th>Label ID</th><th>Actions</th>
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

app.get('/cartons/find', requireAuth, async (req, res) => {
  const { length, width, height } = req.query as { length?: string; width?: string; height?: string }

  const safeLength = escHtml(length ?? '')
  const safeWidth  = escHtml(width  ?? '')
  const safeHeight = escHtml(height ?? '')

  let resultsHtml = ''

  const iL = parseFloat(length ?? '')
  const iW = parseFloat(width  ?? '')
  const iH = parseFloat(height ?? '')

  if (!isNaN(iL) && !isNaN(iW) && !isNaN(iH) && iL > 0 && iW > 0 && iH > 0) {
    const [ia, ib, ic] = [iL, iW, iH].sort((a, b) => b - a)

    const result = await db.execute({
      sql: 'SELECT * FROM cartons WHERE user_id = ? AND quantity > 0',
      args: [req.session.userId],
    })

    const matches = toPlain(result)
      .map(c => {
        const [ca, cb, cc] = [c.dimensions.length, c.dimensions.width, c.dimensions.height].sort((a, b) => b - a)
        return { carton: c, ca, cb, cc }
      })
      .filter(({ ca, cb, cc }) => ca >= ia + 2 && cb >= ib + 2 && cc >= ic + 2)
      .sort((x, y) => (x.ca * x.cb * x.cc) - (y.ca * y.cb * y.cc))
      .map(({ carton: c }) => c)

    if (matches.length === 0) {
      resultsHtml = `<p class="empty-state">No cartons in stock can fit an item of those dimensions with 1&rdquo; clearance on every face.</p>`
    } else {
      const rows = matches.map(c => `
      <tr>
        <td data-label="Brand">${c.brand ? escHtml(c.brand) : '<span class="muted">—</span>'}</td>
        <td data-label="Carton ID">${c.carton_id ? escHtml(c.carton_id) : '<span class="muted">—</span>'}</td>
        <td data-label="Size">${c.dimensions.length} × ${c.dimensions.width} × ${c.dimensions.height} in</td>
        <td data-label="Condition"><span class="badge badge-${c.condition}">${c.condition}</span></td>
        <td data-label="Qty">${c.quantity}</td>
        <td data-label="Location">${c.location ? escHtml(c.location) : '<span class="muted">—</span>'}</td>
        <td data-label="Label ID">${escHtml(c.label_id)}</td>
      </tr>`).join('')
      resultsHtml = `
      <div class="table-wrap" style="margin-top:1.5rem">
        <table>
          <thead>
            <tr>
              <th>Brand</th><th>Carton ID</th><th>Size (L×W×H)</th><th>Condition</th><th>Qty</th><th>Location</th><th>Label ID</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`
    }
  }

  const body = readView('find.html')
    .replace('{{FIND_LENGTH}}', safeLength)
    .replace('{{FIND_WIDTH}}',  safeWidth)
    .replace('{{FIND_HEIGHT}}', safeHeight)
    .replace('{{FIND_RESULTS}}', resultsHtml)

  res.send(renderLayout('Find Carton', body, req.session.username))
})

app.get('/cartons/:id/edit', requireAuth, async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT * FROM cartons WHERE id = ? AND user_id = ?',
    args: [req.params.id, req.session.userId],
  })
  const carton = toPlain(result)[0]
  if (!carton) return res.status(404).send(renderLayout('Not Found', '<p>Carton not found.</p>', req.session.username))

  const body = readView('edit.html')
    .replace('{{CARTON_ID}}', String(carton.id))
    .replace('{{CARTON_LABEL_ID}}', escHtml(carton.label_id))
    .replace('{{CARTON_CARTON_ID}}', escHtml(carton.carton_id))
    .replace('{{CARTON_BRAND}}', escHtml(carton.brand))
    .replace('{{CARTON_COLOR}}', escHtml(carton.color))
    .replace('{{CARTON_LENGTH}}', String(carton.dimensions.length))
    .replace('{{CARTON_WIDTH}}', String(carton.dimensions.width))
    .replace('{{CARTON_HEIGHT}}', String(carton.dimensions.height))
    .replace('{{CARTON_QUANTITY}}', String(carton.quantity))
    .replace('{{CARTON_LOCATION}}', escHtml(carton.location))
    .replace('{{CARTON_NOTES}}', escHtml(carton.notes))
    .replace(`{{CARTON_CONDITION_${carton.condition.toUpperCase()}}}`, 'selected')
    .replace(/\{\{CARTON_CONDITION_\w+\}\}/g, '')

  res.send(renderLayout('Edit Carton', body, req.session.username))
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
