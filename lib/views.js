import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const viewsDir = join(__dirname, '..', 'views')

export function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function readView(name) {
  return readFileSync(join(viewsDir, name), 'utf8')
}

export function renderLayout(title, body, user = null) {
  const navUser = user
    ? `<span class="nav-username">${escHtml(user)}</span>
       <form method="POST" action="/logout" style="display:inline">
         <button type="submit" class="btn-secondary btn-sm">Sign Out</button>
       </form>`
    : ''
  return readView('layout.html')
    .replace('{{TITLE}}', title)
    .replace('{{BODY}}', body)
    .replace('{{NAV_USER}}', navUser)
}
