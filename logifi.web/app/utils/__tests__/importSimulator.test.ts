import { describe, it, expect } from 'vitest'
import type { LogEntry } from '../logbookTypes'
import { createEmptyFlightTime, createEmptyPerformance } from '../logbookTypes'
import {
  parseSimDeviceType,
  readSimHintsFromRawRow,
  applySimulatorImport,
  inferLogbookType,
  isLikelySimulatorRow,
  normalizeSimulatorInstrumentTime,
} from '../importSimulator'

function createTestEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 'test-id',
    date: '2024-06-01',
    role: 'PIC',
    aircraftCategoryClass: 'Airplane Single Engine Land',
    categoryClassTime: null,
    aircraftMakeModel: 'C172',
    registration: 'N12345',
    flightNumber: null,
    departure: 'KJFK',
    destination: 'KLGA',
    route: '',
    trainingElements: '',
    trainingInstructor: '',
    instructorCertificate: '',
    flightConditions: [],
    remarks: '',
    flightTime: createEmptyFlightTime(),
    performance: createEmptyPerformance(),
    ...overrides,
  }
}

describe('importSimulator', () => {
  describe('parseSimDeviceType', () => {
    it('parses FFS, FTD, ATD tokens', () => {
      expect(parseSimDeviceType('FFS')).toBe('ffs')
      expect(parseSimDeviceType('FTD')).toBe('ftd')
      expect(parseSimDeviceType('ATD')).toBe('atd')
      expect(parseSimDeviceType('Redbird ATD')).toBe('atd')
    })
  })

  describe('readSimHintsFromRawRow', () => {
    it('reads explicit logbook type and ground simulator time', () => {
      const hints = readSimHintsFromRawRow({
        'Logbook Type': 'simulator',
        'Ground Simulator': '2.0',
      })
      expect(hints.explicitLogbookType).toBe('simulator')
      expect(hints.groundSimTime).toBe(2)
      expect(hints.isSimulator).toBe(true)
    })

    it('reads FFS/FTD/ATD columns', () => {
      const hints = readSimHintsFromRawRow({
        ATD: '1.5',
        'Logbook Type': 'flight',
      })
      expect(hints.atd).toBe(1.5)
      expect(hints.simDeviceType).toBe('atd')
      expect(hints.explicitLogbookType).toBe('flight')
    })
  })

  describe('inferLogbookType', () => {
    it('returns simulator when only sim buckets have time', () => {
      const entry = createTestEntry({
        flightTime: { ...createEmptyFlightTime(), atd: 2, total: 2 },
      })
      expect(inferLogbookType(entry)).toBe('simulator')
    })

    it('returns flight when airplane time remains', () => {
      const entry = createTestEntry({
        flightTime: { ...createEmptyFlightTime(), total: 2, pic: 2 },
      })
      expect(inferLogbookType(entry)).toBe('flight')
    })
  })

  describe('applySimulatorImport', () => {
    it('classifies from explicit Logbook Type column', () => {
      const entry = createTestEntry({
        flightTime: { ...createEmptyFlightTime(), total: 1.5 },
      })
      const hints = readSimHintsFromRawRow({ 'Logbook Type': 'simulator', ATD: '1.5' })
      applySimulatorImport(entry, hints)
      expect(entry.logbookType).toBe('simulator')
      expect(entry.flightTime.atd).toBe(1.5)
    })

    it('does not classify hood time alone as simulator', () => {
      const entry = createTestEntry({
        flightTime: { ...createEmptyFlightTime(), total: 1.5, simulatedInstrument: 0.5 },
      })
      applySimulatorImport(entry)
      expect(entry.logbookType).toBe('flight')
    })

    it('builder-style simulator flag moves total into atd by default', () => {
      const entry = createTestEntry({
        departure: '',
        destination: '',
        flightTime: { ...createEmptyFlightTime(), total: 2 },
      })
      applySimulatorImport(entry, { isSimulator: true })
      expect(entry.logbookType).toBe('simulator')
      expect(entry.flightTime.atd).toBe(2)
      expect(entry.departure).toBe('—')
      expect(entry.destination).toBe('—')
    })

    it('uses isTrainingDevice fallback for device names', () => {
      const entry = createTestEntry({
        aircraftMakeModel: 'Redbird FMX',
        registration: 'SIM-01',
        flightTime: { ...createEmptyFlightTime(), total: 1 },
      })
      applySimulatorImport(entry)
      expect(entry.logbookType).toBe('simulator')
      expect(entry.flightTime.atd).toBe(1)
    })

    it('respects explicit flight logbook type', () => {
      const entry = createTestEntry({
        aircraftMakeModel: 'Redbird FMX',
        flightTime: { ...createEmptyFlightTime(), total: 1 },
      })
      applySimulatorImport(entry, { explicitLogbookType: 'flight' })
      expect(entry.logbookType).toBe('flight')
      expect(entry.flightTime.atd).toBeNull()
    })

    it('backfills dual received from sim time when role is Dual Received', () => {
      const entry = createTestEntry({
        role: 'Dual Received',
        flightTime: { ...createEmptyFlightTime(), atd: 2 },
      })
      applySimulatorImport(entry, { isSimulator: true })
      expect(entry.flightTime.dual).toBe(2)
    })

    it('does not overwrite existing dual time on import', () => {
      const entry = createTestEntry({
        role: 'Dual Received',
        flightTime: { ...createEmptyFlightTime(), atd: 2, dual: 1.5 },
      })
      applySimulatorImport(entry, { isSimulator: true })
      expect(entry.flightTime.dual).toBe(1.5)
    })

    it('round-trips Logbook Type + ATD export columns', () => {
      const raw = {
        'Logbook Type': 'simulator',
        ATD: '3.0',
        'Aircraft Make/Model': 'Redbird',
        Registration: 'SIM-1',
      }
      const hints = readSimHintsFromRawRow(raw)
      const entry = createTestEntry({
        aircraftMakeModel: 'Redbird',
        registration: 'SIM-1',
        flightTime: {
          ...createEmptyFlightTime(),
          atd: hints.atd,
        },
      })
      applySimulatorImport(entry, hints)
      expect(entry.logbookType).toBe('simulator')
      expect(entry.flightTime.atd).toBe(3)
    })
  })

  describe('normalizeSimulatorInstrumentTime', () => {
    it('moves actual instrument to simulated on simulator entries', () => {
      const entry = createTestEntry({
        logbookType: 'simulator',
        flightTime: { ...createEmptyFlightTime(), atd: 2, total: 2, actualInstrument: 1.0 },
      })
      expect(normalizeSimulatorInstrumentTime(entry)).toBe(true)
      expect(entry.flightTime.actualInstrument).toBeNull()
      expect(entry.flightTime.simulatedInstrument).toBe(1.0)
    })

    it('sums actual with existing hood time', () => {
      const entry = createTestEntry({
        logbookType: 'simulator',
        flightTime: {
          ...createEmptyFlightTime(),
          atd: 2,
          total: 2,
          actualInstrument: 1.0,
          simulatedInstrument: 0.5,
        },
      })
      normalizeSimulatorInstrumentTime(entry)
      expect(entry.flightTime.actualInstrument).toBeNull()
      expect(entry.flightTime.simulatedInstrument).toBe(1.5)
    })

    it('does not change flight entries', () => {
      const entry = createTestEntry({
        logbookType: 'flight',
        flightTime: { ...createEmptyFlightTime(), total: 2, actualInstrument: 1.0 },
      })
      expect(normalizeSimulatorInstrumentTime(entry)).toBe(false)
      expect(entry.flightTime.actualInstrument).toBe(1.0)
      expect(entry.flightTime.simulatedInstrument).toBeNull()
    })

    it('returns false when simulator entry has no actual instrument', () => {
      const entry = createTestEntry({
        logbookType: 'simulator',
        flightTime: { ...createEmptyFlightTime(), atd: 2, simulatedInstrument: 0.5 },
      })
      expect(normalizeSimulatorInstrumentTime(entry)).toBe(false)
    })
  })

  describe('applySimulatorImport instrument normalization', () => {
    it('moves actual instrument to simulated after import classification', () => {
      const entry = createTestEntry({
        flightTime: {
          ...createEmptyFlightTime(),
          total: 2,
          actualInstrument: 1.2,
        },
      })
      applySimulatorImport(entry, { isSimulator: true })
      expect(entry.logbookType).toBe('simulator')
      expect(entry.flightTime.actualInstrument).toBeNull()
      expect(entry.flightTime.simulatedInstrument).toBe(1.2)
    })
  })

  describe('isLikelySimulatorRow', () => {
    it('detects simulator hints before registration is resolved', () => {
      const hints = readSimHintsFromRawRow({ 'Ground Simulator': '1.0' })
      expect(isLikelySimulatorRow(hints)).toBe(true)
    })

    it('returns false when explicitly flight', () => {
      expect(isLikelySimulatorRow({ explicitLogbookType: 'flight' })).toBe(false)
    })
  })
})
