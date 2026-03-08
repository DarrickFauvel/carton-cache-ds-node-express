import { Router } from 'express'
import db from '../db/database.js'

const router = Router()

const CONDITIONS = ['new', 'good', 'fair', 'poor']

function validate(body) {
  const { label, length, width, height, condition, quantity, company } = body
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

router.get('/', (req, res) => {
  const cartons = db.prepare('SELECT * FROM cartons ORDER BY id DESC').all()
  res.json(cartons)
})

router.get('/:id', (req, res) => {
  const carton = db.prepare('SELECT * FROM cartons WHERE id = ?').get(req.params.id)
  if (!carton) return res.status(404).json({ error: 'Carton not found' })
  res.json(carton)
})

router.post('/', (req, res) => {
  const error = validate(req.body)
  if (error) return res.status(400).json({ error })

  const { label, company = '', length, width, height, condition, quantity = 0 } = req.body
  const result = db.prepare(
    'INSERT INTO cartons (label, company, length, width, height, condition, quantity) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(label.trim(), company.trim(), Number(length), Number(width), Number(height), condition, Number(quantity))

  const carton = db.prepare('SELECT * FROM cartons WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(carton)
})

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM cartons WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Carton not found' })

  const error = validate(req.body)
  if (error) return res.status(400).json({ error })

  const { label, company = '', length, width, height, condition, quantity = 0 } = req.body
  db.prepare(
    'UPDATE cartons SET label=?, company=?, length=?, width=?, height=?, condition=?, quantity=? WHERE id=?'
  ).run(label.trim(), company.trim(), Number(length), Number(width), Number(height), condition, Number(quantity), req.params.id)

  const carton = db.prepare('SELECT * FROM cartons WHERE id = ?').get(req.params.id)
  res.json(carton)
})

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM cartons WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Carton not found' })

  db.prepare('DELETE FROM cartons WHERE id = ?').run(req.params.id)
  res.status(204).send()
})

export default router
