import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const viewsDir = join(__dirname, '..', 'views')

export function escHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function readView(name: string): string {
  return readFileSync(join(viewsDir, name), 'utf8')
}

export function renderLayout(title: string, body: string, user: string | null = null): string {
  const navUser = user
    ? `<span class="nav-username">${escHtml(user)}</span>
       <form method="POST" action="/logout" style="display:inline">
         <button type="submit" class="btn-secondary btn-sm">Sign Out</button>
       </form>`
    : ''
  const subnav = user
    ? `<div class="subnav"><div class="subnav-inner"><a href="/cartons/new" class="btn-primary">+ Add Carton</a><a href="/cartons/find" class="btn-secondary">Find Carton</a></div></div>`
    : ''
  return readView('layout.html')
    .replace('{{TITLE}}', title)
    .replace('{{BODY}}', body)
    .replace('{{NAV_USER}}', navUser)
    .replace('{{SUBNAV}}', subnav)
}
