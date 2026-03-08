export function requireAuth(req, res, next) {
  if (req.session?.userId) return next()
  res.redirect('/login')
}

export function requireAuthApi(req, res, next) {
  if (req.session?.userId) return next()
  res.status(401).json({ error: 'Authentication required' })
}
