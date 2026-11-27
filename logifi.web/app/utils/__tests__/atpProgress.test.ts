import { describe, expect, it } from 'vitest'
import {
  buildAtpProgress,
  computeAtpHourAggregates,
  progressPercent,
} from '../atpProgress'
import {
  createEmptyFlightTime,
  createEmptyOOOI,
  createEmptyPerformance,
  type LogEntry,
} from '../logbookTypes'
import { requirementsForAtpTrack } from '../atpRequirements'

function entry(overrides: Partial<LogEntry>): LogEntry {
  return {
    id: overrides.id ?? 'e1',
    date: '2026-01-15',
    role: 'PIC',
    aircraftCategoryClass: 'ASEL',
    categoryClassTime: null,
    aircraftMakeModel: 'C172',
    registration: 'N17XX',
    flightNumber: null,
    departure: 'KATL',
    destination: 'KORD',
    route: '',
    trainingElements: '',
    trainingInstructor: '',
    instructorCertificate: '',
    picName: null,
    sicName: null,
    flightConditions: [],
    remarks: '',
    tags: [],
    logbookType: 'flight',
    flightTime: {
      ...createEmptyFlightTime(),
      total: 2,
      pic: 2,
      crossCountry: 1.5,
      night: 0.5,
      actualInstrument: 0.5,
      simulatedInstrument: 0.1,
    },
    performance: createEmptyPerformance(),
    oooi: createEmptyOOOI(),
    flagged: false,
    ...overrides,
  }
}

describe('atpProgress', () => {
  it('builds rows for ATP track with 1500 total requirement', () => {
    const aggregates = computeAtpHourAggregates([entry({})])
    const snap = buildAtpProgress(aggregates, 'atp')
    const totalRow = snap.rows.find((r) => r.key === 'total')
    expect(totalRow?.requiredHours).toBe(1500)
    expect(totalRow?.actualHours).toBe(aggregates.total)
  })

  it('switches total requirement for R-ATP 1250 only', () => {
    const aggregates = computeAtpHourAggregates([entry({})])
    const snap = buildAtpProgress(aggregates, 'ratp_1250')
    expect(snap.rows.find((r) => r.key === 'total')?.requiredHours).toBe(1250)
    expect(snap.rows.find((r) => r.key === 'crossCountry')?.requiredHours).toBe(500)
  })

  it('counts instrument as actual plus simulated', () => {
    const aggregates = computeAtpHourAggregates([entry({})])
    expect(aggregates.instrument).toBe(0.6)
  })

  it('derives PIC XC and PIC night from per-entry mins', () => {
    const aggregates = computeAtpHourAggregates([entry({})])
    expect(aggregates.picCrossCountry).toBe(1.5)
    expect(aggregates.picNight).toBe(0.5)
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