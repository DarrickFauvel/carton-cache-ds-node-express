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
  const rows = cartons.map(c => `
    <tr>
      <td>${escHtml(c.label)}</td>
      <td>${escHtml(c.company)}</td>
      <td>${c.length} × ${c.width} × ${c.height}</td>
      <td>${c.condition}</td>
      <td>${c.quantity}</td>
      <td class="actions">
        <a href="/cartons/${c.id}/edit" class="btn-edit">Edit</a>
        <button class="btn-delete" data-id="${c.id}">Delete</button>
      </td>
    </tr>`).join('')

  const body = readView('index.html').replace('{{CARTON_ROWS}}', rows)
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
    .replace('{{CARTON_COMPANY}}', escHtml(carton.company))
    .replace('{{CARTON_LENGTH}}', carton.length)
    .replace('{{CARTON_WIDTH}}', carton.width)
    .replace('{{CARTON_HEIGHT}}', carton.height)
    .replace('{{CARTON_QUANTITY}}', carton.quantity)
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
