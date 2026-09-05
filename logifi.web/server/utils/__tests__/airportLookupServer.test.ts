import { describe, expect, it } from 'vitest'
import { lookupAirportServer } from '../airportLookupServer'

describe('lookupAirportServer', () => {
  it('resolves KTIP as Rantoul from the US supplement', () => {
    const info = lookupAirportServer('KTIP')
    expect(info).not.toBeNull()
    expect(info?.icao).toBe('KTIP')
    expect(info?.name).toContain('Rantoul')
    expect(info?.country).toBe('US')
    expect(info?.source).toContain('Supplement')
  })

  it('does not resolve KAWA as Awassa', () => {
    expect(lookupAirportServer('KAWA')).toBeNull()
  })

  it('still resolves TIP IATA as Tripoli and HALA as Awassa', () => {
    expect(lookupAirportServer('TIP')?.icao).toBe('HLLT')
    expect(lookupAirportServer('HALA')?.name).toContain('Awassa')
  })

  it('resolves KLGA by ICAO', () => {
    expect(lookupAirportServer('KLGA')?.iata).toBe('LGA')
  })
})
