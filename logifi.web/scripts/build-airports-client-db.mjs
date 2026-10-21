/**
 * Build trimmed airport catalog for client fetch (public/data/airports-client.json).
 *
 * Usage: node scripts/build-airports-client-db.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const outputPath = path.join(rootDir, 'public/data/airports-client.json')

const nwprAirports = require('@nwpr/airport-codes/dist/airports.json')

function buildDb(airports) {
  const rows = {}
  const iataToIcao = {}

  for (const a of airports) {
    const icao = typeof a.icao === 'string' ? a.icao.trim().toUpperCase() : ''
    if (!icao) continue

    const iata = typeof a.iata === 'string' ? a.iata.trim().toUpperCase() : ''
    if (iata) iataToIcao[iata] = icao

    const elevationFt =
      a.elevation != null
        ? Number(a.elevation)
        : a.altitude != null
          ? Number(a.altitude)
          : undefined

    const row = {}
    if (iata) row.iata = iata
    if (a.name) row.name = a.name
    if (a.city) row.city = a.city
    if (a.state) row.state = a.state
    if (a.country) row.country = a.country
    if (elevationFt != null && Number.isFinite(elevationFt)) row.elevationFt = elevationFt
    if (a.latitude != null) row.latitude = Number(a.latitude)
    if (a.longitude != null) row.longitude = Number(a.longitude)
    if (a.timezone != null && a.timezone !== '') row.timezone = a.timezone

    rows[icao] = row
  }

  return { version: 1, rows, iataToIcao }
}

function main() {
  const db = buildDb(nwprAirports)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, `${JSON.stringify(db)}\n`)
  const bytes = fs.statSync(outputPath).size
  console.log(
    `Wrote ${Object.keys(db.rows).length} airports (${(bytes / 1024).toFixed(1)} KiB) to ${outputPath}`
  )
}

main()
