import { describe, expect, it } from 'vitest'
import { buildAtpProgress, progressPercent } from '../atpProgress'
import type { AirplaneTotals } from '../totalsReport'
import { requirementsForAtpTrack } from '../atpRequirements'

const sampleTotals: AirplaneTotals = {
  total: 1200,
  pic: 300,
  sic: 50,
  crossCountry: 400,
  night: 80,
  actualInstrument: 50,
  simulatedInstrument: 10,
  dualReceived: 0,
  dualGiven: 0,
  multiEngine: 25,
  approaches: 40,
  dayLandings: 100,
  nightLandings: 20,
}

describe('atpProgress', () => {
  it('builds rows for ATP track with 1500 total requirement', () => {
    const snap = buildAtpProgress(sampleTotals, 'atp')
    const totalRow = snap.rows.find((r) => r.key === 'total')
    expect(totalRow?.requiredHours).toBe(1500)
    expect(totalRow?.actualHours).toBe(1200)
  })

  it('switches total requirement for R-ATP 1250', () => {
    const snap = buildAtpProgress(sampleTotals, 'ratp_1250')
    expect(snap.rows.find((r) => r.key === 'total')?.requiredHours).toBe(1250)
  })

  it('counts instrument as actual plus simulated', () => {
    const snap = buildAtpProgress(sampleTotals, 'atp')
    const inst = snap.rows.find((r) => r.key === 'instrument')
    expect(inst?.actualHours).toBe(60)
  })

  it('progressPercent caps at 100', () => {
    expect(progressPercent(2000, 1500)).toBe(100)
    expect(progressPercent(750, 1500)).toBe(50)
  })

  it('requirements cite 61.159/61.160', () => {
    for (const row of requirementsForAtpTrack('atp')) {
      expect(row.regulation).toMatch(/14 CFR 61\.(159|160)/)
    }
  })
})