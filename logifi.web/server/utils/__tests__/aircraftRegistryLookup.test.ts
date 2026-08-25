import { describe, expect, it, vi } from 'vitest'
import {
  asOfFromMeta,
  lookupAircraftRegistration,
  overlayOwnerFromLive,
  parseFaaRegistryHtml,
  withLocalSource,
} from '../aircraftRegistryLookup'

const localRecord = {
  registration: '653PA',
  make: 'CESSNA',
  model: '172S',
  year: '2018',
  engineType: 'Piston',
  engineModel: 'LYCOMING IO-360-L2A',
  category: 'Fixed wing single engine',
  owner: 'PURDUE AVIATION LLC',
  city: 'WEST LAFAYETTE',
  state: 'IN',
}

describe('asOfFromMeta', () => {
  it('returns the date portion of generatedAt', () => {
    expect(asOfFromMeta({ generatedAt: '2026-08-14T12:00:00.000Z' })).toBe('2026-08-14')
  })
})

describe('overlayOwnerFromLive', () => {
  it('overlays owner without dropping make/model/engine', () => {
    const local = withLocalSource(localRecord, 'N653PA', '2026-06-10')
    const merged = overlayOwnerFromLive(local, {
      owner: 'NEW OWNER LLC',
      city: 'INDIANAPOLIS',
      state: 'IN',
    }, '2026-08-14')

    expect(merged.make).toBe('CESSNA')
    expect(merged.model).toBe('172S')
    expect(merged.engineType).toBe('Piston')
    expect(merged.engineModel).toBe('LYCOMING IO-360-L2A')
    expect(merged.owner).toBe('NEW OWNER LLC')
    expect(merged.city).toBe('INDIANAPOLIS')
    expect(merged.ownerCheckedAt).toBe('2026-08-14')
  })

  it('keeps snapshot owner when live scrape returns nothing', () => {
    const local = withLocalSource(localRecord, 'N653PA', '2026-06-10')
    const merged = overlayOwnerFromLive(local, null)
    expect(merged.owner).toBe('PURDUE AVIATION LLC')
    expect(merged.ownerCheckedAt).toBeUndefined()
    expect(merged.source).toBe('Local Database (FAA)')
  })
})

describe('parseFaaRegistryHtml', () => {
  it('extracts owner and engine fields from inquiry HTML', () => {
    const html = `
      <table>
        <tr><td>Manufacturer Name</td><td>CESSNA</td></tr>
        <tr><td>Model</td><td>172S</td></tr>
        <tr><td>Engine Type</td><td>Reciprocating</td></tr>
        <tr><td>Engine Model</td><td>LYCOMING IO-360-L2A</td></tr>
        <tr><td>Name</td><td>NEW OWNER LLC</td></tr>
        <tr><td>City</td><td>INDIANAPOLIS</td></tr>
        <tr><td>State</td><td>IN</td></tr>
      </table>
    `
    expect(parseFaaRegistryHtml(html, 'N653PA')).toMatchObject({
      make: 'CESSNA',
      model: '172S',
      engineType: 'Reciprocating',
      engineModel: 'LYCOMING IO-360-L2A',
      owner: 'NEW OWNER LLC',
    })
  })
})

describe('lookupAircraftRegistration', () => {
  const db = { '653PA': localRecord }
  const meta = { generatedAt: '2026-08-01T00:00:00.000Z', recordCount: 1 }

  it('returns decoded local fields with asOf and does not query live by default', async () => {
    const queryLiveRegistry = vi.fn()
    const result = await lookupAircraftRegistration('N653PA', {}, {
      loadDatabase: () => db,
      loadMeta: () => meta,
      queryLiveRegistry,
    })

    expect(result.success).toBe(true)
    expect(result.data).toMatchObject({
      registration: 'N653PA',
      make: 'CESSNA',
      engineType: 'Piston',
      engineModel: 'LYCOMING IO-360-L2A',
      asOf: '2026-08-01',
      source: 'Local Database (FAA)',
    })
    expect(queryLiveRegistry).not.toHaveBeenCalled()
  })

  it('overlays live owner when refreshOwner is set', async () => {
    const result = await lookupAircraftRegistration('N653PA', { refreshOwner: true }, {
      loadDatabase: () => db,
      loadMeta: () => meta,
      queryLiveRegistry: async () => ({ owner: 'NEW OWNER LLC', city: 'INDIANAPOLIS', state: 'IN' }),
    })

    expect(result.data?.owner).toBe('NEW OWNER LLC')
    expect(result.data?.make).toBe('CESSNA')
    expect(result.data?.engineModel).toBe('LYCOMING IO-360-L2A')
    expect(result.data?.asOf).toBe('2026-08-01')
  })

  it('keeps snapshot owner when live scrape fails', async () => {
    const result = await lookupAircraftRegistration('N653PA', { refreshOwner: true }, {
      loadDatabase: () => db,
      loadMeta: () => meta,
      queryLiveRegistry: async () => {
        throw new Error('FAA down')
      },
    })

    expect(result.success).toBe(true)
    expect(result.data?.owner).toBe('PURDUE AVIATION LLC')
    expect(result.data?.make).toBe('CESSNA')
  })
})
