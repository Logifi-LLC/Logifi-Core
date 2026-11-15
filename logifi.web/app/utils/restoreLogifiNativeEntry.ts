import type { ApproachRecord, LogEntry, OOOITimes } from '~/utils/logbookTypes'
import {
  createEmptyFlightTime,
  createEmptyPerformance,
} from '~/utils/logbookTypes'
import {
  parseImportBoolean,
  parseImportDate,
  parseImportDuration,
} from '../../shared/logbookDataBridge/formatters'
import { normalizePerformanceForDisplay } from '~/utils/logEntryPerformance'

const MAX_TEXT = 20_000
const MAX_ID = 128
const MAX_CODE = 32
const MAX_CONDITIONS = 32
const MAX_TAGS = 32
const MAX_APPROACHES = 16

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

function sanitizeMetadataObject(value: unknown): Record<string, unknown> | undefined {
  if (!isPlainObject(value)) return undefined
  const out: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    if (DANGEROUS_KEYS.has(key)) continue
    const safeKey = asString(key, 80)
    if (!safeKey) continue
    if (typeof item === 'string') out[safeKey] = stripNulls(item).slice(0, 500)
    else if (typeof item === 'number' && Number.isFinite(item)) out[safeKey] = item
    else if (typeof item === 'boolean' || item === null) out[safeKey] = item
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function stripNulls(value: string): string {
  return value.replace(/\u0000/g, '')
}

function asString(value: unknown, max = MAX_TEXT): string {
  if (typeof value === 'string') return stripNulls(value).slice(0, max)
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value).slice(0, max)
  }
  return ''
}

function asNullableString(value: unknown, max = MAX_TEXT): string | null {
  if (value === null || value === undefined) return null
  const text = asString(value, max).trim()
  return text ? text : null
}

function asId(value: unknown): string | null {
  const text = asString(value, MAX_ID).trim()
  if (!text) return null
  if (/[<>\r\n]/.test(text)) return null
  return text
}

function asBoolean(value: unknown): boolean | undefined {
  const parsed = parseImportBoolean(value)
  return parsed == null ? undefined : parsed
}

function asDuration(value: unknown): number | null {
  return parseImportDuration(value as number | string | null | undefined)
}

function asStringList(value: unknown, maxItems: number, maxItemLength: number): string[] {
  if (!Array.isArray(value)) return []
  const items: string[] = []
  for (const item of value) {
    if (items.length >= maxItems) break
    if (typeof item !== 'string') continue
    const text = stripNulls(item).trim().slice(0, maxItemLength)
    if (text) items.push(text)
  }
  return items
}

function asApproaches(value: unknown): ApproachRecord[] {
  if (!Array.isArray(value)) return []
  const records: ApproachRecord[] = []
  for (const item of value) {
    if (records.length >= MAX_APPROACHES) break
    if (!isPlainObject(item)) continue
    const type = asString(item.type, 80).trim()
    const count = Number(item.count)
    if (!type || !Number.isFinite(count) || count <= 0) continue
    records.push({ type, count: Math.round(count) })
  }
  return records
}

function restoreFlightTime(raw: unknown): LogEntry['flightTime'] {
  const dest = createEmptyFlightTime()
  if (!isPlainObject(raw)) return dest
  dest.total = asDuration(raw.total)
  dest.pic = asDuration(raw.pic)
  dest.sic = asDuration(raw.sic)
  dest.dual = asDuration(raw.dual)
  dest.solo = asDuration(raw.solo)
  dest.night = asDuration(raw.night)
  dest.nvg = asDuration(raw.nvg)
  dest.actualInstrument = asDuration(raw.actualInstrument)
  dest.simulatedInstrument = asDuration(raw.simulatedInstrument)
  dest.crossCountry = asDuration(raw.crossCountry)
  dest.dualGiven = asDuration(raw.dualGiven)
  dest.ffs = asDuration(raw.ffs)
  dest.ftd = asDuration(raw.ftd)
  dest.atd = asDuration(raw.atd)
  return dest
}

function restoreOooi(raw: unknown): OOOITimes | undefined {
  if (!isPlainObject(raw)) return undefined
  const out = asNullableString(raw.out, 32)
  const off = asNullableString(raw.off, 32)
  const on = asNullableString(raw.on, 32)
  const inTime = asNullableString(raw.in, 32)
  if (!out && !off && !on && !inTime && raw.isZulu === undefined) return undefined
  const isZulu = asBoolean(raw.isZulu)
  return {
    out,
    off,
    on,
    in: inTime,
    isZulu: isZulu ?? true,
  }
}

/**
 * True when the payload is a Logifi JSON entry (backup or in-memory), not a
 * CSV header row.
 */
export function isLogifiNativeJsonEntry(raw: unknown): boolean {
  if (!isPlainObject(raw)) return false
  const hasDate = typeof raw.date === 'string' && raw.date.trim().length > 0
  const hasNestedFlightTime = isPlainObject(raw.flightTime)
  const hasNestedPerformance = isPlainObject(raw.performance)
  const hasNestedOooi = isPlainObject(raw.oooi)
  return hasDate && (hasNestedFlightTime || hasNestedPerformance || hasNestedOooi)
}

/**
 * Restore a Logifi-native JSON entry as-is after type validation and
 * sanitization. Never remaps CSV headers and never recomputes totals from OOOI.
 */
export function restoreLogifiNativeJsonEntry(
  raw: unknown,
  options?: { generateId?: () => string }
): LogEntry | null {
  if (!isLogifiNativeJsonEntry(raw)) return null
  const obj = raw as Record<string, unknown>
  const date = parseImportDate(asString(obj.date, 32))
  if (!date) return null

  const metadata = isPlainObject(obj.metadata) ? obj.metadata : {}
  const integrity = isPlainObject(obj.integrity) ? obj.integrity : {}
  const performanceRaw = isPlainObject(obj.performance) ? obj.performance : {}
  const restoredPerformance = normalizePerformanceForDisplay({
    ...createEmptyPerformance(),
    dayTakeoffs: asDuration(performanceRaw.dayTakeoffs),
    nightTakeoffs: asDuration(performanceRaw.nightTakeoffs),
    dayLandings: asDuration(performanceRaw.dayLandings),
    nightLandings: asDuration(performanceRaw.nightLandings),
    holdingProcedures: asDuration(performanceRaw.holdingProcedures),
    approachCount: asDuration(performanceRaw.approachCount),
    approachType: asNullableString(performanceRaw.approachType, 80),
    approaches: asApproaches(performanceRaw.approaches),
  })

  const logbookTypeRaw = asString(obj.logbookType, 16).trim().toLowerCase()
  const logbookType =
    logbookTypeRaw === 'simulator' || logbookTypeRaw === 'flight'
      ? logbookTypeRaw
      : undefined

  const id =
    asId(obj.id) ??
    (options?.generateId ? options.generateId() : `restore-${Date.now()}`)

  const isVoid = asBoolean(obj.isVoid)
  const signaturePending = asBoolean(obj.signaturePending)
  const flagged = asBoolean(obj.flagged)
  const isImported = asBoolean(obj.isImported ?? metadata.isImported)

  const entry: LogEntry = {
    id,
    date,
    role: asString(obj.role, 64).trim(),
    aircraftCategoryClass: asString(obj.aircraftCategoryClass, 64).trim(),
    categoryClassTime: asDuration(obj.categoryClassTime),
    aircraftMakeModel: asString(obj.aircraftMakeModel, 80).trim(),
    registration: asString(obj.registration, MAX_CODE).trim(),
    flightNumber: asNullableString(obj.flightNumber, 32),
    departure: asString(obj.departure, MAX_CODE).trim(),
    destination: asString(obj.destination, MAX_CODE).trim(),
    route: asString(obj.route, 500),
    trainingElements: asString(obj.trainingElements, 500),
    trainingInstructor: asString(obj.trainingInstructor, 120),
    instructorCertificate: asString(obj.instructorCertificate, 120),
    picName: asNullableString(obj.picName, 120),
    sicName: asNullableString(obj.sicName, 120),
    flightConditions: asStringList(obj.flightConditions, MAX_CONDITIONS, 40),
    remarks: asString(obj.remarks, MAX_TEXT),
    tags: asStringList(obj.tags, MAX_TAGS, 40),
    logbookType,
    flightTime: restoreFlightTime(obj.flightTime),
    performance: restoredPerformance,
    oooi: restoreOooi(obj.oooi),
    flagged: flagged ?? false,
  }

  if (isVoid != null) entry.isVoid = isVoid
  if (signaturePending != null) entry.signaturePending = signaturePending
  const amendsEntryId = asId(obj.amendsEntryId)
  if (amendsEntryId) entry.amendsEntryId = amendsEntryId
  const pendingInstructorId = asId(obj.pendingInstructorId)
  if (pendingInstructorId) entry.pendingInstructorId = pendingInstructorId

  if (isImported != null) entry.isImported = isImported
  const importSource = asNullableString(obj.importSource ?? metadata.importSource, 64)
  if (importSource) entry.importSource = importSource
  const importBatchId = asNullableString(obj.importBatchId ?? metadata.importBatchId, 80)
  if (importBatchId) entry.importBatchId = importBatchId
  const originalEntryDate = asNullableString(
    obj.originalEntryDate ?? metadata.originalEntryDate,
    40
  )
  if (originalEntryDate) entry.originalEntryDate = originalEntryDate
  const importMetadata = sanitizeMetadataObject(
    isPlainObject(obj.importMetadata) ? obj.importMetadata : metadata.importMetadata
  )
  if (importMetadata) entry.importMetadata = importMetadata

  const version = Number(obj.version ?? integrity.version)
  if (Number.isFinite(version) && version > 0) entry.version = Math.round(version)
  const dataHash = asNullableString(obj.dataHash ?? integrity.dataHash, 128)
  if (dataHash) entry.dataHash = dataHash
  const createdAt = asNullableString(obj.createdAt ?? integrity.createdAt, 40)
  if (createdAt) entry.createdAt = createdAt
  const updatedAt = asNullableString(obj.updatedAt ?? integrity.updatedAt, 40)
  if (updatedAt) entry.updatedAt = updatedAt

  return entry
}
