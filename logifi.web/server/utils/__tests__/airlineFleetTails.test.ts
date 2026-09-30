import { describe, expect, it, vi } from 'vitest'
import {
  extendAirlineFleetTail,
  lookupAirlineFleetTail,
  recordAirlineFleetTailSighting,
  resolveAirlineFleetTail,
  type AirlineFleetTail,
} from '../airlineFleetTails'

const rpaA06: AirlineFleetTail[] = [
  {
    airlineIcao: 'RPA',
    fleetNumber: 'A06',
    registration: 'N111YX',
    aircraftType: 'E75L',
    firstSeenDate: '2024-01-01',
    lastSeenDate: '2025-06-30',
  },
  {
    airlineIcao: 'RPA',
    fleetNumber: 'A06',
    registration: 'N222YX',
    aircraftType: 'E75L',
    firstSeenDate: '2025-07-01',
    lastSeenDate: '2026-09-30',
  },
]

describe('resolveAirlineFleetTail', () => {
  it('picks the assignment whose range contains the flight date', () => {
    expect(resolveAirlineFleetTail(rpaA06, '2025-03-15')?.registration).toBe('N111YX')
    expect(resolveAirlineFleetTail(rpaA06, '2025-08-01')?.registration).toBe('N222YX')
    expect(resolveAirlineFleetTail(rpaA06, '2024-01-01')?.registration).toBe('N111YX')
    expect(resolveAirlineFleetTail(rpaA06, '2026-09-30')?.registration).toBe('N222YX')
  })

  it('uses the nearest assignment outside every range, including after a re-registration', () => {
    expect(resolveAirlineFleetTail(rpaA06, '2023-06-01')?.registration).toBe('N111YX')
    expect(resolveAirlineFleetTail(rpaA06, '2027-01-01')?.registration).toBe('N222YX')
  })

  it('prefers the later assignment when ranges overlap', () => {
    const overlap: AirlineFleetTail[] = [
      {
        airlineIcao: 'RPA',
        fleetNumber: '506',
        registration: 'N111YX',
        aircraftType: null,
        firstSeenDate: '2024-01-01',
        lastSeenDate: '2025-12-31',
      },
      {
        airlineIcao: 'RPA',
        fleetNumber: '506',
        registration: 'N333YX',
        aircraftType: 'E170',
        firstSeenDate: '2025-06-01',
        lastSeenDate: '2026-01-01',
      },
    ]
    expect(resolveAirlineFleetTail(overlap, '2025-08-01')?.registration).toBe('N333YX')
  })

  it('returns null for an empty list or a bad date', () => {
    expect(resolveAirlineFleetTail([], '2025-08-01')).toBeNull()
    expect(resolveAirlineFleetTail(rpaA06, '08/01/2025')).toBeNull()
  })
})

describe('extendAirlineFleetTail', () => {
  it('widens the date range for the same registration', () => {
    const existing = rpaA06[1]!
    const extended = extendAirlineFleetTail(existing, {
      airlineIcao: 'rpa',
      fleetNumber: 'a06',
      registration: 'n222yx',
      aircraftType: 'E75L',
      seenDate: '2026-12-01',
    })
    expect(extended).toMatchObject({
      airlineIcao: 'RPA',
      fleetNumber: 'A06',
      registration: 'N222YX',
      firstSeenDate: '2025-07-01',
      lastSeenDate: '2026-12-01',
    })
  })

  it('starts a new row when the same fleet number is re-registered', () => {
    const created = extendAirlineFleetTail(rpaA06[0]!, {
      airlineIcao: 'RPA',
      fleetNumber: 'A06',
      registration: 'N999YX',
      aircraftType: 'E75L',
      seenDate: '2026-10-01',
    })
    expect(created).toEqual({
      airlineIcao: 'RPA',
      fleetNumber: 'A06',
      registration: 'N999YX',
      aircraftType: 'E75L',
      firstSeenDate: '2026-10-01',
      lastSeenDate: '2026-10-01',
    })
    expect(rpaA06[0]?.registration).toBe('N111YX')
  })
})

describe('airline fleet tail storage failures', () => {
  it('does not throw when the service client is unavailable', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(
      recordAirlineFleetTailSighting({
        airlineIcao: 'RPA',
        fleetNumber: 'A06',
        registration: 'N475YX',
        aircraftType: 'E75L',
        seenDate: '2026-08-04',
      })
    ).resolves.toBeUndefined()
    await expect(lookupAirlineFleetTail('RPA', 'A06', '2026-08-04')).resolves.toBeNull()
    expect(warn.mock.calls.map((call) => String(call[0])).join('\n')).toContain(
      '[airline_fleet_tails]'
    )
    warn.mockRestore()
  })
})
