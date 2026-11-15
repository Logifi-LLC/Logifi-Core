import { describe, expect, it } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import type { LogEntry } from '~/utils/logbookTypes'
import { createEmptyFlightTime, createEmptyPerformance } from '~/utils/logbookTypes'
import { useExport } from '~/composables/useExport'
import { buildLogbookJsonBackupString, entriesArrayFromJsonBackup } from '../logbookJsonBackup'
import { extractLogbookJsonFromZipBytes } from '../fullBackupImport'
import { FULL_BACKUP_JSON_ENTRY } from '../fullBackupConstants'
import { normalizeImportedEntry } from '../normalizeImportedEntry'
import { normalizePerformanceForDisplay } from '../logEntryPerformance'

const fictionalEntry = (): LogEntry => ({
  id: 'fiction-entry-1',
  date: '2025-08-15',
  role: 'PIC',
  aircraftCategoryClass: 'ASEL',
  categoryClassTime: null,
  aircraftMakeModel: 'PA-28-181',
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
  tags: ['Flight Review'],
  logbookType: 'flight',
  flightTime: {
    ...createEmptyFlightTime(),
    total: 1.2,
    pic: 1.2,
    crossCountry: 0.8,
  },
  performance: {
    ...createEmptyPerformance(),
    dayTakeoffs: 1,
    dayLandings: 1,
    approaches: [{ type: 'ILS', count: 1 }],
    approachCount: 1,
    approachType: 'ILS',
  },
  oooi: {
    out: '08:00',
    off: null,
    on: null,
    in: '09:30',
    isZulu: true,
  },
  flagged: false,
  isVoid: false,
  amendsEntryId: null,
  signaturePending: false,
})

describe('full backup round-trip', () => {
  it('export JSON inside ZIP matches the real restore path field by field', async () => {
    const { prepareEntryForExport } = useExport()
    const source = fictionalEntry()
    const prepared = prepareEntryForExport(source, [])
    const json = buildLogbookJsonBackupString({
      preparedEntries: [prepared],
      pilotProfile: { name: 'Alex Fictional', certificateNumber: '000000000' },
    })

    const archive = zipSync({
      [FULL_BACKUP_JSON_ENTRY]: strToU8(json),
    })

    const { text } = await extractLogbookJsonFromZipBytes(archive)
    const data = JSON.parse(text)
    const rawEntries = entriesArrayFromJsonBackup(data)
    expect(rawEntries).not.toBeNull()
    const rehydrated = await normalizeImportedEntry(rawEntries![0] as Record<string, unknown>)

    expect(rehydrated).not.toBeNull()
    expect(rehydrated!.id).toBe(source.id)
    expect(rehydrated!.date).toBe(source.date)
    expect(rehydrated!.registration).toBe(source.registration)
    expect(rehydrated!.departure).toBe(source.departure)
    expect(rehydrated!.destination).toBe(source.destination)
    expect(rehydrated!.aircraftMakeModel).toBe('PA-28-181')
    expect(rehydrated!.aircraftCategoryClass).toBe('ASEL')
    expect(rehydrated!.flightTime.total).toBe(1.2)
    expect(rehydrated!.flightTime.crossCountry).toBe(0.8)
    expect(rehydrated!.picName).toBe(source.picName)
    expect(rehydrated!.tags).toEqual(['Flight Review'])
    expect(rehydrated!.logbookType).toBe('flight')
    expect(rehydrated!.performance.dayTakeoffs).toBe(1)
    expect(rehydrated!.performance.dayLandings).toBe(1)
    expect(normalizePerformanceForDisplay(rehydrated!.performance).approaches).toEqual([
      { type: 'ILS', count: 1 },
    ])
    expect(rehydrated!.oooi?.out).toBe('08:00')
    expect(rehydrated!.oooi?.in).toBe('09:30')
    expect(rehydrated!.oooi?.isZulu).toBe(true)
    expect(rehydrated!.isVoid).toBe(false)
  })
})
