import type { EditableLogEntry, LogEntry } from './logbookTypes'
import { createEmptyFlightTime, createEmptyOOOI, createEmptyPerformance } from './logbookTypes'

/**
 * Prefill a new log entry from an existing hop: keep aircraft, route, and crew;
 * bump the date; leave times / OOOI / remarks blank. Does not link as an amendment.
 */
export function buildRepeatedEntry(source: LogEntry, todayIso: string): EditableLogEntry {
  const tags = Array.isArray(source.tags)
    ? source.tags.filter((tag) => tag !== 'Void')
    : []

  return {
    date: todayIso,
    role: source.role,
    aircraftCategoryClass: source.aircraftCategoryClass,
    categoryClassTime: null,
    aircraftMakeModel: source.aircraftMakeModel,
    registration: source.registration,
    flightNumber: source.flightNumber ?? null,
    departure: source.departure,
    destination: source.destination,
    route: source.route,
    trainingElements: source.trainingElements,
    trainingInstructor: source.trainingInstructor,
    instructorCertificate: source.instructorCertificate,
    flightConditions: [...(source.flightConditions || [])],
    remarks: '',
    tags,
    logbookType: source.logbookType,
    flightTime: createEmptyFlightTime(),
    performance: createEmptyPerformance(),
    oooi: createEmptyOOOI(),
    flagged: false,
  }
}
