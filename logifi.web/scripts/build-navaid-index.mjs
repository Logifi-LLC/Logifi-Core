/**
 * Build navaid index JSON from OurAirports navaids.csv for route-token classification.
 *
 * Usage: node scripts/build-navaid-index.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'csv-parse/sync'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const outputPath = path.join(rootDir, 'server/data/navaid-index.json')
const csvUrl = 'https://davidmegginson.github.io/ourairports-data/navaids.csv'
const csvPath = path.join(rootDir, 'scripts/.cache/ourairports-navaids.csv')

async function ensureCsv() {
  fs.mkdirSync(path.dirname(csvPath), { recursive: true })
  if (fs.existsSync(csvPath)) return
  console.log('Downloading OurAirports navaids CSV...')
  const res = await fetch(csvUrl)
  if (!res.ok) throw new Error(`Failed to download navaids CSV: ${res.status}`)
  fs.writeFileSync(csvPath, await res.text())
}

function buildIndex(rows) {
  const index = {}

  for (const row of rows) {
    const ident = (row.ident || '').trim().toUpperCase()
    if (!ident || ident.length < 2) continue

    const latitude = Number(row.latitude_deg)
    const longitude = Number(row.longitude_deg)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue

    const associated = (row.associated_airport || '').trim().toUpperCase() || undefined

    // Prefer first entry per ident (duplicates are rare)
    if (index[ident]) continue

    index[ident] = {
      ident,
      name: row.name || ident,
      type: row.type || 'NAVAID',
      latitude,
      longitude,
      ...(associated ? { associatedAirport: associated } : {}),
      ...(row.iso_country ? { country: row.iso_country } : {})
    }
  }

  return index
}

async function main() {
  await ensureCsv()
  const csvText = fs.readFileSync(csvPath, 'utf8')
  const rows = parse(csvText, { columns: true, skip_empty_lines: true, relax_column_count: true })
  const index = buildIndex(rows)

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, `${JSON.stringify(index, null, 2)}\n`)

  console.log(`Wrote ${Object.keys(index).length} navaids to ${outputPath}`)
  console.log('Sample FWA:', index.FWA)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
