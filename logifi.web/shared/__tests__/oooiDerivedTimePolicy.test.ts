import { describe, expect, it } from 'vitest'
import {
  applyOooiDerivedFlightTimes,
  oooiClockInputKey,
  shouldApplyOooiDerivedTimes,
  type OooiClockInputs,
  type OooiDerivedFlightTime,
} from '../oooiDerivedTimePolicy'

/** Fictional stored times — not from a real logbook. Block 13:00–14:12Z is 1.2. */
const SAVED_OOOI: OooiClockInputs = {
  out: '1300',
  off: '1308',
  on: '1405',
  in: '1412',
}

function savedFlightTime(): OooiDerivedFlightTime & { crossCountry: number | null } {
  return {
    total: 1.0,
    pic: 0.8,
    sic: 0.4,
    dual: null,
    solo: null,
    crossCountry: 1.0,
  }
}

function simulateOooiWatcher(opts: {
  baseline: string | null
  previousOooi: OooiClockInputs | null
  currentOooi: OooiClockInputs
  role: string
  flightTime: OooiDerivedFlightTime & { crossCountry: number | null }
  categoryClassTime: number | null
  blockHours: number
}): {
  applied: boolean
  flightTime: OooiDerivedFlightTime & { crossCountry: number | null }
  categoryClassTime: number | null
} {
  const currentKey = oooiClockInputKey(opts.currentOooi)
  const applied = shouldApplyOooiDerivedTimes({
    inputsUnchangedFromOpen:
      opts.baseline != null && currentKey === opts.baseline,
    oooiClocksUnchangedFromPrevious:
      opts.previousOooi != null &&
      oooiClockInputKey(opts.previousOooi) === currentKey,
  })
  if (!applied) {
    return {
      applied: false,
      flightTime: opts.flightTime,
      categoryClassTime: opts.categoryClassTime,
    }
  }
  applyOooiDerivedFlightTimes(opts.flightTime, opts.role, opts.blockHours)
  opts.flightTime.crossCountry = Math.round(opts.blockHours * 10) / 10
  return {
    applied: true,
    flightTime: opts.flightTime,
    categoryClassTime: opts.blockHours,
  }
}

describe('oooiDerivedTimePolicy', () => {
  it('hydrating an OOOI entry and confirming unchanged keeps total/pic/sic/xc/categoryClassTime', () => {
    const baseline = oooiClockInputKey(SAVED_OOOI)
    const flightTime = savedFlightTime()
    const result = simulateOooiWatcher({
      baseline,
      previousOooi: null,
      currentOooi: { ...SAVED_OOOI },
      role: 'PIC',
      flightTime,
      categoryClassTime: 1.0,
      blockHours: 1.2,
    })

    expect(result.applied).toBe(false)
    expect(result.flightTime.total).toBe(1.0)
    expect(result.flightTime.pic).toBe(0.8)
    expect(result.flightTime.sic).toBe(0.4)
    expect(result.flightTime.crossCountry).toBe(1.0)
    expect(result.categoryClassTime).toBe(1.0)
  })

  it('does not rewrite times when role/date/airports change but OOOI clocks do not', () => {
    const baseline = oooiClockInputKey(SAVED_OOOI)
    const flightTime = savedFlightTime()
    const result = simulateOooiWatcher({
      baseline,
      previousOooi: { ...SAVED_OOOI },
      currentOooi: { ...SAVED_OOOI },
      role: 'SIC',
      flightTime,
      categoryClassTime: 1.0,
      blockHours: 1.2,
    })

    expect(result.applied).toBe(false)
    expect(result.flightTime.pic).toBe(0.8)
    expect(result.flightTime.sic).toBe(0.4)
  })

  it('recomputes total/pic/sic/xc/categoryClassTime after a real OOOI clock edit', () => {
    const baseline = oooiClockInputKey(SAVED_OOOI)
    const editedOooi = { ...SAVED_OOOI, in: '1430' }
    const flightTime = savedFlightTime()
    const result = simulateOooiWatcher({
      baseline,
      previousOooi: { ...SAVED_OOOI },
      currentOooi: editedOooi,
      role: 'PIC',
      flightTime,
      categoryClassTime: 1.0,
      blockHours: 1.2,
    })

    expect(result.applied).toBe(true)
    expect(result.flightTime.total).toBe(1.2)
    expect(result.flightTime.pic).toBe(1.2)
    expect(result.flightTime.sic).toBeNull()
    expect(result.flightTime.crossCountry).toBe(1.2)
    expect(result.categoryClassTime).toBe(1.2)
  })

  it('still auto-fills a new entry when OOOI clocks go from empty to filled', () => {
    const empty: OooiClockInputs = { out: null, off: null, on: null, in: null }
    const baseline = oooiClockInputKey(empty)
    const filled: OooiClockInputs = { out: '0900', off: '0908', on: '1000', in: '1012' }
    const flightTime: OooiDerivedFlightTime & { crossCountry: number | null } = {
      total: null,
      pic: null,
      sic: null,
      dual: null,
      solo: null,
      crossCountry: null,
    }
    const result = simulateOooiWatcher({
      baseline,
      previousOooi: empty,
      currentOooi: filled,
      role: 'PIC',
      flightTime,
      categoryClassTime: null,
      blockHours: 1.2,
    })

    expect(result.applied).toBe(true)
    expect(result.flightTime.total).toBe(1.2)
    expect(result.flightTime.pic).toBe(1.2)
    expect(result.flightTime.sic).toBeNull()
  })
})
