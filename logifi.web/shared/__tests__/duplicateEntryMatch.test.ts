import { describe, expect, it } from 'vitest'
import { entriesDuplicateMatch } from '../duplicateEntryMatch'

describe('entriesDuplicateMatch', () => {
  it('matches same leg when total differs by manual rounding (FCV block vs 1 decimal hour)', () => {
    const fcv = {
      date: '2026-04-01',
      registration: 'N131HQ',
      departure: 'KBUF',
      destination: 'KLGA',
      flightTimeTotal: 1.35 as number | null,
    }
    const manual = { ...fcv, flightTimeTotal: 1.4 }
    expect(entriesDuplicateMatch(fcv, manual)).toBe(true)
    expect(entriesDuplicateMatch(manual, fcv)).toBe(true)
  })

  it('still distinguishes materially different block times on same route (standard mode)', () => {
    const a = {
      date: '2026-04-01',
      registration: 'N131HQ',
      departure: 'KBUF',
      destination: 'KLGA',
      flightTimeTotal: 1.0 as number | null,
    }
    const b = { ...a, flightTimeTotal: 1.5 }
    expect(entriesDuplicateMatch(a, b)).toBe(false)
  })

  it('importLeg mode matches on date + tail + route even when totals differ a lot', () => {
    const a = {
      date: '2026-04-01',
      registration: 'N131HQ',
      departure: 'KBUF',
      destination: 'KLGA',
      flightTimeTotal: 1.35 as number | null,
    }
    const b = { ...a, flightTimeTotal: 3.0 }
    expect(entriesDuplicateMatch(a, b, 'importLeg')).toBe(true)
    expect(entriesDuplicateMatch(a, b, 'standard')).toBe(false)
  })

  it('importLeg still splits when both sides have different OOOI out', () => {
    const a = {
      date: '2026-04-01',
      registration: 'N131HQ',
      departure: 'KBUF',
      destination: 'KLGA',
      oooiOut: '08:00',
      flightTimeTotal: 1.2 as number | null,
    }
    const b = { ...a, oooiOut: '18:00', flightTimeTotal: 1.25 }
    expect(entriesDuplicateMatch(a, b, 'importLeg')).toBe(false)
  })

  it('matches same leg when OOOI out differs only by formatting (14:30 vs 1430)', () => {
    const fcv = {
      date: '2026-04-01',
      registration: 'N131HQ',
      departure: 'KBUF',
      destination: 'KLGA',
      oooiOut: '1430',
      flightTimeTotal: 1.2 as number | null,
    }
    const manual = { ...fcv, oooiOut: '14:30' }
    expect(entriesDuplicateMatch(fcv, manual, 'importLeg')).toBe(true)
    expect(entriesDuplicateMatch(fcv, manual, 'standard')).toBe(true)
  })

  it('still splits different OOOI out times after normalization', () => {
    const a = {
      date: '2026-04-01',
      registration: 'N131HQ',
      departure: 'KBUF',
      destination: 'KLGA',
      oooiOut: '08:00',
      flightTimeTotal: 1.2 as number | null,
    }
    const b = { ...a, oooiOut: '18:00' }
    expect(entriesDuplicateMatch(a, b, 'importLeg')).toBe(false)
  })
})
