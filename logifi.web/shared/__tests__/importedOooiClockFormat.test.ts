import { describe, expect, it } from 'vitest'
import {
  formatOooiClockForStorage,
  formatOooiTimesForStorage,
  oooiPairDurationHours,
} from '../oooiClock'
import { parseWithProvider } from '../import'
import { entriesDuplicateMatch } from '../duplicateEntryMatch'

/**
 * Fictional Autofi/import clocks only. Dashboard LogTen/generic/native CSV
 * assign OOOI through formatOooiTimesForStorage (same helper Autofi uses).
 */
describe('imported OOOI HH:MM storage (fictional)', () => {
  it('formats dashboard LogTen/generic/native CSV OOOI without changing totals', () => {
    const totalBefore = 1.5
    const raw = {
      out: '2110',
      off: '2121',
      on: '2230',
      in: '2240',
      isZulu: true,
    }
    const stored = formatOooiTimesForStorage(raw)
    expect(stored).toEqual({
      out: '21:10',
      off: '21:21',
      on: '22:30',
      in: '22:40',
      isZulu: true,
    })
    expect(
      oooiPairDurationHours({ start: raw.out, end: raw.in, isZulu: true })
    ).toBe(oooiPairDurationHours({ start: stored.out, end: stored.in, isZulu: true }))
    expect(totalBefore).toBe(1.5)
  })

  it('keeps unparseable LogTen timestamps as-is', () => {
    expect(formatOooiClockForStorage('2025-11-11T15:00:00Z')).toBe(
      '2025-11-11T15:00:00Z'
    )
  })

  it('native Logifi JSON/CSV restore is format-only on clock strings', () => {
    const alreadyHhMm = {
      out: '21:10',
      off: '21:21',
      on: '22:48',
      in: '22:59',
      isZulu: true,
    }
    expect(formatOooiTimesForStorage(alreadyHhMm)).toEqual(alreadyHhMm)

    const compact = formatOooiTimesForStorage({
      out: '2110',
      off: '2121',
      on: '2248',
      in: '2259',
      isZulu: true,
    })
    expect(compact.out).toBe('21:10')
    expect(compact.isZulu).toBe(true)
    expect(
      oooiPairDurationHours({ start: '2110', end: '2259', isZulu: true })
    ).toBe(oooiPairDurationHours({ start: compact.out, end: compact.in, isZulu: true }))
  })

  it('does not invent Digifi OOOI when the builder writes an empty block', () => {
    expect(formatOooiTimesForStorage({
      out: '',
      off: '',
      on: '',
      in: '',
      isZulu: true,
    })).toEqual({
      out: null,
      off: null,
      on: null,
      in: null,
      isZulu: true,
    })
  })

  it('ForeFlight driver stores HH:MM and leaves PIC/total untouched', () => {
    const csv = [
      'AircraftID,Make,Model,Category / Class',
      'N430YX,Embraer,E170,AMEL',
      '',
      'Date,AircraftID,From,To,TotalTime,PIC,TimeOut,TimeIn',
      '2025-03-02,N430YX,KIND,KORD,1.5,1.5,0800,0930',
    ].join('\n')
    const entry = parseWithProvider('foreflight', csv, { generateId: () => 'ff-1' }).entries[0]!
    expect(entry.oooi?.out).toBe('08:00')
    expect(entry.oooi?.in).toBe('09:30')
    expect(entry.flightTime.total).toBe(1.5)
    expect(entry.flightTime.pic).toBe(1.5)
  })

  it('Autofi duplicate match still treats 2248 and 22:48 as the same out', () => {
    const stored = {
      date: '2026-03-15',
      registration: 'N9900F',
      departure: 'KAPA',
      destination: 'KCOS',
      oooiOut: '22:48',
      flightTimeTotal: 1.2 as number | null,
    }
    const existing = { ...stored, oooiOut: '2248' }
    expect(entriesDuplicateMatch(stored, existing, 'importLeg')).toBe(true)
  })
})
