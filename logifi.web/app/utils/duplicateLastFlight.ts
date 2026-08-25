import { sortEntriesByDateAndOOOI } from '../../shared/oooiSort'
import { inferLogbookType } from './importSimulator'
import {
  createEmptyFlightTime,
  createEmptyOOOI,
  createEmptyPerformance,
  type EditableLogEntry,
  type LogEntry,
} from './logbookTypes'

export function findDuplicableLastEntry(
  entries: readonly LogEntry[],
  activeLogbook: 'flight' | 'simulator',
  supersededIds: ReadonlySet<string>
): LogEntry | null {
  const candidates = entries.filter((entry) => {
    if (entry.isVoid) return false
    if (supersededIds.has(entry.id)) return false
    return inferLogbookType(entry) === activeLogbook
  })
  const sorted = sortEntriesByDateAndOOOI(candidates)
  return sorted[0] ?? null
}

function emptyHoursKeepingSimType(source: LogEntry) {
  const flightTime = createEmptyFlightTime()
  if (source.flightTime?.ffs != null) flightTime.ffs = 0
  if (source.flightTime?.ftd != null) flightTime.ftd = 0
  if (source.flightTime?.atd != null) flightTime.atd = 0
  return flightTime
}

/** Copy aircraft/route/crew/date/logbookType. Hours, OOOI, and amend link stay empty. */
export function buildDuplicatedDraft(source: LogEntry): EditableLogEntry {
  return {
    date: source.date,
    role: source.role,
    aircraftCategoryClass: source.aircraftCategoryClass,
    categoryClassTime: source.categoryClassTime,
    aircraftMakeModel: source.aircraftMakeModel,
    registration: source.registration,
    flightNumber: source.flightNumber,
    departure: source.departure,
    destination: source.destination,
    route: source.route,
    trainingElements: source.trainingElements,
    trainingInstructor: source.trainingInstructor,
    instructorCertificate: source.instructorCertificate,
    flightConditions: [],
    remarks: '',
    tags: [],
    logbookType: inferLogbookType(source),
    flightTime: emptyHoursKeepingSimType(source),
    performance: createEmptyPerformance(),
    oooi: createEmptyOOOI(),
    flagged: false,
  }
}
