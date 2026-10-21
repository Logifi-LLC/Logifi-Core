import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AirportClientDb } from '../airportDbCore'
import { __setAirportClientDbForTests } from '../airportClientDb'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function loadAirportClientDbFixture(): AirportClientDb {
  const jsonPath = path.join(__dirname, '../../public/data/airports-client.json')
  const raw = fs.readFileSync(jsonPath, 'utf8')
  return JSON.parse(raw) as AirportClientDb
}

export function withAirportClientDbFixture(): void {
  beforeAll(() => {
    __setAirportClientDbForTests(loadAirportClientDbFixture())
  })
  afterAll(() => {
    __setAirportClientDbForTests(null)
  })
}
