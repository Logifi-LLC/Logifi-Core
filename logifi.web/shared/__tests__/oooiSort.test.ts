import { describe, expect, it } from 'vitest'
import {
  compareEntriesByDateAndOOOI,
  getOooiOutUtcMillis,
  sortEntriesByDateAndOOOI,
} from '../oooiSort'
import type { OooiSortEntryShape } from '../oooiSort'

function entry(
  id: string,
  overrides: Partial<OooiSortEntryShape> & Pick<OooiSortEntryShape, 'date'>
): OooiSortEntryShape & { id: string } {
  return {
    id,
    departure: 'KJFK',
    ...overrides,
  }
}

describe('getOooiOutUtcMillis', () => {
  it('treats Zulu out time as UTC on the entry date', () => {
    const millis = getOooiOutUtcMillis({
      date: '2024-06-15',
      departure: 'KJFK',
      oooi: { out: '1430', isZulu: true },
    })
    expect(millis).not.toBeNull()
    expect(new Date(millis!).toISOString()).toBe('2024-06-15T14:30:00.000Z')
  })

  it('converts local out time at departure airport to UTC', () => {
    const millis = getOooiOutUtcMillis({
      date: '2024-06-15',
      departure: 'KJFK',
      oooi: { out: '0930', isZulu: false },
    })
    expect(millis).not.toBeNull()
    // Eastern daylight: 09:30 local -> 13:30 UTC
    expect(new Date(millis!).toISOString()).toBe('2024-06-15T13:30:00.000Z')
  })

  it('returns null when out time is missing', () => {
    expect(
      getOooiOutUtcMillis({
        date: '2024-06-15',
        departure: 'KJFK',
        oooi: { isZulu: true },
      })
    ).toBeNull()
  })
})

describe('sortEntriesByDateAndOOOI', () => {
  it('orders same-day Zulu vs local chronologically (most recent first)', () => {
    const zuluLater = entry('zulu', {
      date: '2024-06-15',
      oooi: { out: '1430', isZulu: true },
    })
    const localEarlier = entry('local', {
      date: '2024-06-15',
      departure: 'KJFK',
      oooi: { out: '0930', isZulu: false },
    })

    const sorted = sortEntriesByDateAndOOOI([localEarlier, zuluLater])
    expect(sorted.map((e) => e.id)).toEqual(['zulu', 'local'])
  })

  it('would mis-order same-day Zulu vs local without timezone conversion', () => {
    const zuluLater = entry('zulu', {
      date: '2024-06-15',
      oooi: { out: '1430', isZulu: true },
    })
    const localEarlier = entry('local', {
      date: '2024-06-15',
      departure: 'KJFK',
      oooi: { out: '0930', isZulu: false },
    })

    // Raw HHMM compare would put 1430 before 0930; UTC compare should not.
    expect(compareEntriesByDateAndOOOI(zuluLater, localEarlier)).toBeLessThan(0)
  })

  it('keeps relative order for two Zulu entries on the same day', () => {
    const later = entry('later', {
      date: '2024-06-15',
      oooi: { out: '1800', isZulu: true },
    })
    const earlier = entry('earlier', {
      date: '2024-06-15',
      oooi: { out: '1200', isZulu: true },
    })

    const sorted = sortEntriesByDateAndOOOI([earlier, later])
    expect(sorted.map((e) => e.id)).toEqual(['later', 'earlier'])
  })

  it('keeps relative order for two local entries at the same airport', () => {
    const later = entry('later', {
      date: '2024-06-15',
      departure: 'KJFK',
      oooi: { out: '1800', isZulu: false },
    })
    const earlier = entry('earlier', {
      date: '2024-06-15',
      departure: 'KJFK',
      oooi: { out: '1200', isZulu: false },
    })

    const sorted = sortEntriesByDateAndOOOI([earlier, later])
    expect(sorted.map((e) => e.id)).toEqual(['later', 'earlier'])
  })

  it('sorts entries without out time after entries with out time on the same day', () => {
    const withOut = entry('with-out', {
      date: '2024-06-15',
      oooi: { out: '1000', isZulu: true },
    })
    const withoutOut = entry('without-out', {
      date: '2024-06-15',
      oooi: { isZulu: true },
    })

    const sorted = sortEntriesByDateAndOOOI([withoutOut, withOut])
    expect(sorted.map((e) => e.id)).toEqual(['with-out', 'without-out'])
  })

  it('sorts by date descending before OOOI out time', () => {
    const olderDay = entry('older', {
      date: '2024-06-14',
      oooi: { out: '2300', isZulu: true },
    })
    const newerDay = entry('newer', {
      date: '2024-06-15',
      oooi: { out: '0600', isZulu: true },
    })

    const sorted = sortEntriesByDateAndOOOI([olderDay, newerDay])
    expect(sorted.map((e) => e.id)).toEqual(['newer', 'older'])
  })
})
