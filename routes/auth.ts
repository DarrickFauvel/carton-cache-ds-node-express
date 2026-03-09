import { Router } from 'express'
import bcrypt from 'bcrypt'
import db from '../db/database.ts'
import { readView, renderLayout } from '../lib/views.ts'

const router = Router()
const BCRYPT_ROUNDS = 12

router.get('/login', (req, res) => {
  res.send(renderLayout('Sign In', readView('login.html').replace('{{ERROR_MSG}}', '')))
})

router.get('/register', (req, res) => {
  res.send(renderLayout('Create Account', readView('register.html').replace('{{ERROR_MSG}}', '')))
})

router.post('/login', async (req, res) => {
  const { username, password } = req.body as { username: string; password: string }
  const errPage = (msg: string) =>
    res.status(401).send(
      renderLayout('Sign In', readView('login.html').replace('{{ERROR_MSG}}', `<p class="form-error">${msg}</p>`))
    )

  if (!username || !password) return errPage('Username and password are required.')

  const result = await db.execute({ sql: 'SELECT * FROM users WHERE username = ?', args: [username.trim()] })
  const user = result.rows[0]

  const valid = user && await bcrypt.compare(password, user.password_hash as string)
  if (!valid) return errPage('Invalid username or password.')

  req.session.regenerate((err) => {
    if (err) return res.status(500).send('Session error')
    req.session.userId = Number(user.id)
    req.session.username = user.username as string
    res.redirect('/')
  })
})

router.post('/register', async (req, res) => {
  const { username, password, confirmPassword } = req.body as { username: string; password: string; confirmPassword: string }
  const errPage = (msg: string) =>
    res.status(400).send(
      renderLayout('Create Account', readView('register.html').replace('{{ERROR_MSG}}', `<p class="form-error">${msg}</p>`))
    )

  if (!username || !password || !confirmPassword) return errPage('All fields are required.')
  if (username.trim().length < 3) return errPage('Username must be at least 3 characters.')
  if (password.length < 8) return errPage('Password must be at least 8 characters.')
  if (password !== confirmPassword) return errPage('Passwords do not match.')

  const existing = await db.execute({ sql: 'SELECT id FROM users WHERE username = ?', args: [username.trim()] })
  if (existing.rows[0]) return errPage('That username is already taken.')

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  const inserted = await db.execute({
    sql: 'INSERT INTO users (username, password_hash) VALUES (?, ?)',
    args: [username.trim(), hash],
  })

  req.session.regenerate((err) => {
    if (err) return res.status(500).send('Session error')
    req.session.userId = Number(inserted.lastInsertRowid)
    req.session.username = username.trim()
    res.redirect('/')
  })
})

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'))
})

export default router
