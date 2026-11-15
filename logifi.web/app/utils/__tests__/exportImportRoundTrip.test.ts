import { describe, expect, it } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import type { LogEntry } from '~/utils/logbookTypes'
import {
  createEmptyFlightTime,
  createEmptyPerformance,
} from '~/utils/logbookTypes'
import { useExport } from '~/composables/useExport'
import { buildLogbookJsonBackupString, entriesArrayFromJsonBackup } from '../logbookJsonBackup'
import { extractLogbookJsonFromZipBytes } from '../fullBackupImport'
import { FULL_BACKUP_JSON_ENTRY } from '../fullBackupConstants'
import { normalizeImportedEntry } from '../normalizeImportedEntry'
import { normalizePerformanceForDisplay } from '../logEntryPerformance'
import { exportToLogifiNative } from '../../../shared/logbookDataBridge/exportService'
import { parseBridgeFile } from '../../../shared/logbookDataBridge/fileParser'

function fictionalBase(overrides: Partial<LogEntry>): LogEntry {
  return {
    id: 'fiction-base',
    date: '2025-08-15',
    role: 'PIC',
    aircraftCategoryClass: 'ASEL',
    categoryClassTime: null,
    aircraftMakeModel: 'E170',
    registration: 'N9900F',
    flightNumber: null,
    departure: 'KAPA',
    destination: 'KCOS',
    route: '',
    trainingElements: '',
    trainingInstructor: '',
    instructorCertificate: '',
    picName: 'Alex Fictional',
    sicName: null,
    flightConditions: ['ifr'],
    remarks: 'Training flight',
    tags: [],
    logbookType: 'flight',
    flightTime: {
      ...createEmptyFlightTime(),
      total: 1.2,
      pic: 1.2,
    },
    performance: {
      ...createEmptyPerformance(),
      dayTakeoffs: 1,
      dayLandings: 1,
    },
    oooi: undefined,
    flagged: false,
    isVoid: false,
    amendsEntryId: null,
    signaturePending: false,
    ...overrides,
  }
}

/** Fictional fixtures only — never copy a real logbook. */
function fictionalRoundTripEntries(): LogEntry[] {
  return [
    fictionalBase({
      id: 'fiction-local-oooi',
      date: '2025-03-02',
      departure: 'KIND',
      destination: 'KDEN',
      aircraftMakeModel: 'E170',
      registration: 'N430YX',
      flightConditions: ['ifr', 'crossCountry'],
      remarks: 'Local clocks with explicit total',
      tags: ['Checkride'],
      flightTime: {
        ...createEmptyFlightTime(),
        total: 3.5,
        pic: 3.5,
        crossCountry: 3.5,
      },
      performance: {
        ...createEmptyPerformance(),
        dayTakeoffs: 1,
        dayLandings: 1,
      },
      oooi: {
        out: '08:00',
        off: '08:12',
        on: '09:18',
        in: '09:30',
        isZulu: false,
      },
    }),
    fictionalBase({
      id: 'fiction-zulu-oooi',
      date: '2025-03-03',
      departure: 'KLAX',
      destination: 'KJFK',
      registration: 'N855RW',
      flightNumber: '0003',
      remarks: 'Zulu clocks',
      flightTime: {
        ...createEmptyFlightTime(),
        total: 5.2,
        pic: 5.2,
        night: 1.0,
        nvg: 0.4,
      },
      performance: {
        ...createEmptyPerformance(),
        nightTakeoffs: 1,
        nightLandings: 1,
        dayTakeoffs: 0,
        dayLandings: 0,
        approaches: [
          { type: 'ILS', count: 1 },
          { type: 'RNAV', count: 1 },
        ],
        approachCount: 2,
        approachType: 'ILS',
        holdingProcedures: 1,
      },
      oooi: {
        out: '02:10',
        off: '02:22',
        on: '07:20',
        in: '07:32',
        isZulu: true,
      },
    }),
    fictionalBase({
      id: 'fiction-voided-amendment',
      date: '2025-03-04',
      departure: 'KAPA',
      destination: 'KCOS',
      remarks: 'Voided amendment must keep total 0',
      flightTime: {
        ...createEmptyFlightTime(),
        total: 0,
        pic: 0,
        dual: 0,
      },
      performance: {
        ...createEmptyPerformance(),
      },
      oooi: {
        out: '08:00',
        off: null,
        on: null,
        in: '09:30',
        isZulu: true,
      },
      isVoid: true,
      amendsEntryId: 'fiction-local-oooi',
      signaturePending: false,
    }),
    fictionalBase({
      id: 'fiction-blank-hours-quoted-remarks',
      date: '2025-03-05',
      departure: 'KOSH',
      destination: 'KORD',
      remarks: '"Bat" callsign\nSecond line of remarks',
      tags: ['IPC'],
      logbookType: 'flight',
      flightTime: {
        ...createEmptyFlightTime(),
        total: 1.0,
        pic: 1.0,
        sic: null,
        dual: null,
        solo: null,
        night: null,
        nvg: 1.1,
        actualInstrument: null,
        simulatedInstrument: null,
        crossCountry: null,
        dualGiven: null,
      },
      performance: {
        ...createEmptyPerformance(),
        dayTakeoffs: 2,
        nightTakeoffs: null,
        dayLandings: 2,
        nightLandings: null,
        approaches: [
          { type: 'ILS', count: 1 },
          { type: 'RNAV', count: 1 },
        ],
        approachCount: 2,
        approachType: 'ILS',
      },
    }),
  ]
}

function comparableEntry(entry: LogEntry, keepId: boolean) {
  const performance = normalizePerformanceForDisplay(entry.performance)
  return {
    id: keepId ? entry.id : undefined,
    date: entry.date,
    role: entry.role,
    aircraftCategoryClass: entry.aircraftCategoryClass,
    aircraftMakeModel: entry.aircraftMakeModel,
    registration: entry.registration,
    flightNumber: entry.flightNumber ?? null,
    departure: entry.departure,
    destination: entry.destination,
    route: entry.route,
    trainingElements: entry.trainingElements,
    trainingInstructor: entry.trainingInstructor,
    instructorCertificate: entry.instructorCertificate,
    picName: entry.picName ?? null,
    sicName: entry.sicName ?? null,
    flightConditions: [...(entry.flightConditions || [])].sort(),
    remarks: entry.remarks,
    tags: [...(entry.tags || [])].sort(),
    logbookType: entry.logbookType ?? 'flight',
    flightTime: { ...createEmptyFlightTime(), ...entry.flightTime },
    performance: {
      dayTakeoffs: performance.dayTakeoffs,
      nightTakeoffs: performance.nightTakeoffs,
      dayLandings: performance.dayLandings,
      nightLandings: performance.nightLandings,
      holdingProcedures: performance.holdingProcedures,
      approaches: [...(performance.approaches || [])],
    },
    oooi: entry.oooi
      ? {
          out: entry.oooi.out,
          off: entry.oooi.off,
          on: entry.oooi.on,
          in: entry.oooi.in,
          isZulu: entry.oooi.isZulu,
        }
      : undefined,
    isVoid: entry.isVoid ?? false,
    amendsEntryId: entry.amendsEntryId ?? null,
    signaturePending: entry.signaturePending ?? false,
  }
}

async function restoreCsv(entries: LogEntry[]): Promise<LogEntry[]> {
  const exported = exportToLogifiNative(entries, { baseDate: '2025-03-06' })
  const parsed = parseBridgeFile(exported.content, 'logifi-native')
  const restored: LogEntry[] = []
  for (const row of parsed.rows) {
    const entry = await normalizeImportedEntry(row, 'logifi-native')
    expect(entry).not.toBeNull()
    restored.push(entry!)
  }
  return restored
}

async function restoreJson(entries: LogEntry[]): Promise<LogEntry[]> {
  const { prepareEntryForExport } = useExport()
  const json = buildLogbookJsonBackupString({
    preparedEntries: entries.map((entry) => prepareEntryForExport(entry, [])),
    pilotProfile: { name: 'Alex Fictional', certificateNumber: '000000000' },
  })
  const payload = JSON.parse(json)
  const rawEntries = entriesArrayFromJsonBackup(payload)
  expect(rawEntries).not.toBeNull()
  const restored: LogEntry[] = []
  for (const raw of rawEntries!) {
    const entry = await normalizeImportedEntry(raw as Record<string, unknown>)
    expect(entry).not.toBeNull()
    restored.push(entry!)
  }
  return restored
}

async function restoreZip(entries: LogEntry[]): Promise<LogEntry[]> {
  const { prepareEntryForExport } = useExport()
  const json = buildLogbookJsonBackupString({
    preparedEntries: entries.map((entry) => prepareEntryForExport(entry, [])),
    pilotProfile: { name: 'Alex Fictional', certificateNumber: '000000000' },
  })
  const archive = zipSync({
    [FULL_BACKUP_JSON_ENTRY]: strToU8(json),
  })
  const { text } = await extractLogbookJsonFromZipBytes(archive)
  const payload = JSON.parse(text)
  const rawEntries = entriesArrayFromJsonBackup(payload)
  expect(rawEntries).not.toBeNull()
  const restored: LogEntry[] = []
  for (const raw of rawEntries!) {
    const entry = await normalizeImportedEntry(raw as Record<string, unknown>)
    expect(entry).not.toBeNull()
    restored.push(entry!)
  }
  return restored
}

function expectFieldByField(source: LogEntry[], restored: LogEntry[], keepId: boolean) {
  expect(restored).toHaveLength(source.length)
  for (let i = 0; i < source.length; i++) {
    expect(comparableEntry(restored[i]!, keepId)).toEqual(comparableEntry(source[i]!, keepId))
  }
}

describe('export/import round-trip (fictional fixtures)', () => {
  const source = fictionalRoundTripEntries()

  it('native CSV export then import preserves fields', async () => {
    const restored = await restoreCsv(source)
    expectFieldByField(source, restored, false)
    const local = restored[0]!
    expect(local.flightTime.total).toBe(3.5)
    expect(local.oooi?.isZulu).toBe(false)
    const zulu = restored[1]!
    expect(zulu.oooi?.isZulu).toBe(true)
    expect(zulu.performance.approaches).toEqual([
      { type: 'ILS', count: 1 },
      { type: 'RNAV', count: 1 },
    ])
    expect(zulu.flightTime.nvg).toBe(0.4)
    expect(zulu.performance.nightTakeoffs).toBe(1)
    const voided = restored[2]!
    expect(voided.isVoid).toBe(true)
    expect(voided.flightTime.total).toBe(0)
    expect(voided.amendsEntryId).toBe('fiction-local-oooi')
    const quoted = restored[3]!
    expect(quoted.remarks).toBe('"Bat" callsign\nSecond line of remarks')
    expect(quoted.flightTime.dual).toBeNull()
    expect(quoted.flightTime.sic).toBeNull()
    expect(quoted.flightTime.nvg).toBe(1.1)
  })

  it('JSON backup then restore preserves fields including ids', async () => {
    const restored = await restoreJson(source)
    expectFieldByField(source, restored, true)
    expect(restored[2]!.flightTime.total).toBe(0)
    expect(restored[2]!.isVoid).toBe(true)
    expect(restored[0]!.aircraftMakeModel).toBe('E170')
    expect(restored[1]!.performance.dayTakeoffs).toBe(0)
    expect(restored[1]!.performance.approaches).toHaveLength(2)
  })

  it('ZIP backup then restore uses the same JSON path', async () => {
    const restored = await restoreZip(source)
    expectFieldByField(source, restored, true)
    expect(restored[3]!.remarks).toBe('"Bat" callsign\nSecond line of remarks')
    expect(restored[0]!.tags).toEqual(['Checkride'])
    expect(restored[0]!.logbookType).toBe('flight')
  })
})
