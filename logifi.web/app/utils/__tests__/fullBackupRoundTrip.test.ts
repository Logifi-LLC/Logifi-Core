import { describe, expect, it } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import type { LogEntry } from '~/utils/logbookTypes'
import { useExport } from '~/composables/useExport'
import { buildLogbookJsonBackupString } from '../logbookJsonBackup'
import { extractLogbookJsonFromZipBytes } from '../fullBackupImport'
import { FULL_BACKUP_JSON_ENTRY } from '../fullBackupConstants'
import { mapRawRowToLogEntry } from '../../../shared/logbookDataBridge/importMappers'

const fictionalEntry = (): LogEntry => ({
  id: 'fiction-entry-1',
  date: '2025-08-15',
  role: 'PIC',
  aircraftCategoryClass: 'Airplane SEL',
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
  flightConditions: ['VFR'],
  remarks: 'Training flight',
  flightTime: {
    total: 1.2,
    pic: 1.2,
    sic: null,
    dual: null,
    solo: null,
    night: null,
    actualInstrument: null,
    simulatedInstrument: null,
    crossCountry: 0.8,
  },
  performance: {
    dayTakeoffs: 1,
    dayLandings: 1,
    nightTakeoffs: null,
    nightLandings: null,
    approachCount: null,
    holdingProcedures: null,
  },
  oooi: null,
  flagged: false,
})

describe('full backup round-trip', () => {
  it('export JSON inside ZIP matches re-imported entry fields', async () => {
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
    const raw = data.entries[0] as Record<string, unknown>
    const rehydrated = mapRawRowToLogEntry(raw, {
      generateId: () => 'new-id-should-not-be-used',
    })

    expect(rehydrated).not.toBeNull()
    expect(rehydrated!.date).toBe(source.date)
    expect(rehydrated!.registration).toBe(source.registration)
    expect(rehydrated!.departure).toBe(source.departure)
    expect(rehydrated!.destination).toBe(source.destination)
    expect(rehydrated!.flightTime.total).toBe(source.flightTime.total)
    expect(rehydrated!.flightTime.crossCountry).toBe(source.flightTime.crossCountry)
    expect(rehydrated!.picName).toBe(source.picName)
  })
})