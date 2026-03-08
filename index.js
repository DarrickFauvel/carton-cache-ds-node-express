import express from 'express'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import cartonsRouter from './routes/cartons.js'
import db from './db/database.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(express.static(join(__dirname, 'public')))

// — Template helpers —
function readView(name) {
  return readFileSync(join(__dirname, 'views', name), 'utf8')
}

function renderLayout(title, body) {
  return readView('layout.html')
    .replace('{{TITLE}}', title)
    .replace('{{BODY}}', body)
}

// — API —
app.use('/api/cartons', cartonsRouter)

// — UI Routes —
app.get('/', (_req, res) => {
  const cartons = db.prepare('SELECT * FROM cartons ORDER BY id DESC').all()

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
  res.send(renderLayout('Inventory', body))
})

app.get('/cartons/new', (_req, res) => {
  res.send(renderLayout('Add Carton', readView('new.html')))
})

app.get('/cartons/:id/edit', (req, res) => {
  const carton = db.prepare('SELECT * FROM cartons WHERE id = ?').get(req.params.id)
  if (!carton) return res.status(404).send(renderLayout('Not Found', '<p>Carton not found.</p>'))

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

  res.send(renderLayout('Edit Carton', body))
})

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
