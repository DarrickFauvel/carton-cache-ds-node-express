import { Router } from 'express'
import db from '../db/database.js'

const router = Router()

const CONDITIONS = ['new', 'good', 'fair', 'poor']

function validate(body) {
  const { label, length, width, height, condition, quantity } = body
  if (!label || typeof label !== 'string' || label.trim() === '') {
    return 'label is required'
  }
  if (!length || isNaN(length) || Number(length) <= 0) {
    return 'length must be a positive number'
  }
  if (!width || isNaN(width) || Number(width) <= 0) {
    return 'width must be a positive number'
  }
  if (!height || isNaN(height) || Number(height) <= 0) {
    return 'height must be a positive number'
  }
  if (!condition || !CONDITIONS.includes(condition)) {
    return `condition must be one of: ${CONDITIONS.join(', ')}`
  }
  if (quantity !== undefined && (isNaN(quantity) || !Number.isInteger(Number(quantity)) || Number(quantity) < 0)) {
    return 'quantity must be a non-negative integer'
  }
  return null
}

router.get('/', async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT * FROM cartons WHERE user_id = ? ORDER BY id DESC',
    args: [req.session.userId],
  })
  res.json(result.rows)
})

router.get('/:id', async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT * FROM cartons WHERE id = ? AND user_id = ?',
    args: [req.params.id, req.session.userId],
  })
  const carton = result.rows[0]
  if (!carton) return res.status(404).json({ error: 'Carton not found' })
  res.json(carton)
})

router.post('/', async (req, res) => {
  const error = validate(req.body)
  if (error) return res.status(400).json({ error })

  const { label, company = '', model = '', color = '', length, width, height, condition, quantity = 0, location = '', notes = '' } = req.body
  const result = await db.execute({
    sql: 'INSERT INTO cartons (label, company, model, color, length, width, height, condition, quantity, location, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    args: [label.trim(), company.trim(), model.trim(), color.trim(), Number(length), Number(width), Number(height), condition, Number(quantity), location.trim(), notes.trim(), req.session.userId],
  })

  const inserted = await db.execute({ sql: 'SELECT * FROM cartons WHERE id = ?', args: [result.lastInsertRowid] })
  res.status(201).json(inserted.rows[0])
})

router.put('/:id', async (req, res) => {
  const existing = await db.execute({
    sql: 'SELECT * FROM cartons WHERE id = ? AND user_id = ?',
    args: [req.params.id, req.session.userId],
  })
  if (!existing.rows[0]) return res.status(404).json({ error: 'Carton not found' })

  const error = validate(req.body)
  if (error) return res.status(400).json({ error })

  const { label, company = '', model = '', color = '', length, width, height, condition, quantity = 0, location = '', notes = '' } = req.body
  await db.execute({
    sql: 'UPDATE cartons SET label=?, company=?, model=?, color=?, length=?, width=?, height=?, condition=?, quantity=?, location=?, notes=? WHERE id=? AND user_id=?',
    args: [label.trim(), company.trim(), model.trim(), color.trim(), Number(length), Number(width), Number(height), condition, Number(quantity), location.trim(), notes.trim(), req.params.id, req.session.userId],
  })

  const updated = await db.execute({ sql: 'SELECT * FROM cartons WHERE id = ?', args: [req.params.id] })
  res.json(updated.rows[0])
})

router.delete('/:id', async (req, res) => {
  const existing = await db.execute({
    sql: 'SELECT * FROM cartons WHERE id = ? AND user_id = ?',
    args: [req.params.id, req.session.userId],
  })
  if (!existing.rows[0]) return res.status(404).json({ error: 'Carton not found' })

  await db.execute({ sql: 'DELETE FROM cartons WHERE id = ? AND user_id = ?', args: [req.params.id, req.session.userId] })
  res.status(204).send()
})

export default router
