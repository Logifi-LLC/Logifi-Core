import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const serverDb = path.join(root, 'server/data/aircraft-database.json')
const serverMeta = path.join(root, 'server/data/aircraft-database-meta.json')
const publicDir = path.join(root, 'public/data')
const publicDb = path.join(publicDir, 'aircraft-database.json')
const publicMeta = path.join(publicDir, 'aircraft-database-meta.json')

if (!existsSync(serverDb)) {
  console.log('Aircraft database not found — downloading FAA data...')
  const result = spawnSync('node', ['scripts/download-faa-aircraft.js'], {
    cwd: root,
    stdio: 'inherit',
  })
  if (result.status !== 0) {
    console.error('Failed to download aircraft database. Run: npm run update-aircraft-db')
    process.exit(1)
  }
}

mkdirSync(publicDir, { recursive: true })
copyFileSync(serverDb, publicDb)
console.log(`Copied aircraft database to ${publicDb}`)
if (existsSync(serverMeta)) {
  copyFileSync(serverMeta, publicMeta)
  console.log(`Copied aircraft database meta to ${publicMeta}`)
}
