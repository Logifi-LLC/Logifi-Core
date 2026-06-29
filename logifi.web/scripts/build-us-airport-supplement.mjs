/**
 * Build US airport supplement JSON from OurAirports data for codes missing
 * from @nwpr/airport-codes (common GA fields like KBEH, KFRR, etc.).
 *
 * Usage: node scripts/build-us-airport-supplement.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'csv-parse/sync'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const outputPath = path.join(rootDir, 'server/data/us-airport-supplement.json')
const csvUrl = 'https://davidmegginson.github.io/ourairports-data/airports.csv'
const csvPath = path.join(rootDir, 'scripts/.cache/ourairports-airports.csv')

const nwprAirports = require('@nwpr/airport-codes/dist/airports.json')
const nwprIcao = new Set(nwprAirports.map((a) => a.icao).filter(Boolean))

async function ensureCsv() {
  fs.mkdirSync(path.dirname(csvPath), { recursive: true })
  if (fs.existsSync(csvPath)) return
  console.log('Downloading OurAirports CSV...')
  const res = await fetch(csvUrl)
  if (!res.ok) throw new Error(`Failed to download OurAirports CSV: ${res.status}`)
  fs.writeFileSync(csvPath, await res.text())
}

function buildSupplement(rows) {
  const supplement = {}

  for (const row of rows) {
    if (row.iso_country !== 'US') continue

    const icao = (row.icao_code || row.gps_code || row.ident || '').trim().toUpperCase()
    if (!/^K[A-Z0-9]{3}$/.test(icao)) continue
    if (nwprIcao.has(icao)) continue

    const latitude = Number(row.latitude_deg)
    const longitude = Number(row.longitude_deg)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue

    const iata = (row.iata_code || '').trim().toUpperCase() || undefined
    const faa = (row.local_code || '').trim().toUpperCase() || undefined
    const state = (row.iso_region || '').replace(/^US-/, '').trim().toUpperCase() || undefined

    supplement[icao] = {
      icao,
      ...(iata ? { iata } : {}),
      ...(faa ? { faa } : {}),
      name: row.name,
      ...(row.municipality ? { city: row.municipality } : {}),
      ...(state ? { state } : {}),
      country: 'US',
      latitude,
      longitude
    }
  }

  return supplement
}

async function main() {
  await ensureCsv()
  const csvText = fs.readFileSync(csvPath, 'utf8')
  const rows = parse(csvText, { columns: true, skip_empty_lines: true, relax_column_count: true })
  const supplement = buildSupplement(rows)

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, `${JSON.stringify(supplement, null, 2)}\n`)

  console.log(`Wrote ${Object.keys(supplement).length} airports to ${outputPath}`)
  console.log('Sample KBEH:', supplement.KBEH)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
