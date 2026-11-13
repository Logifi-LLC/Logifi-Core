import type {
  FlightTimeBreakdown,
  FlightTimeKey,
  LogEntry,
  OOOITimes,
  PerformanceMetrics,
} from './logbookTypes'
import { getApproachesFromPerformance } from './logbookTypes'

export const ENTRY_FORM_MODES = ['full', 'quick'] as const
export type EntryFormMode = (typeof ENTRY_FORM_MODES)[number]

/** Default for new and existing users until they pick Quick. */
export const DEFAULT_ENTRY_FORM_MODE: EntryFormMode = 'full'

export const CATEGORY_CLASS_TIME_HELP =
  'Copied from Total Time; change only if different'

/**
 * Quick always shows these. Everything else sits behind More fields
 * unless the current entry already has a value there.
 */
export const QUICK_CORE_FIELDS = [
  'date',
  'role',
  'aircraftMakeModel',
  'registration',
  'departure',
  'destination',
  'total',
  'dayLandings',
  'nightLandings',
  'sim-type',
  'sim-time',
] as const

export type QuickCoreFieldId = (typeof QUICK_CORE_FIELDS)[number]

export type EntryFormFieldId =
  | QuickCoreFieldId
  | 'flightNumber'
  | 'aircraftCategoryClass'
  | 'categoryClassTime'
  | 'route'
  | 'pic'
  | 'sic'
  | 'dual'
  | 'solo'
  | 'night'
  | 'nvg'
  | 'actualInstrument'
  | 'dualGiven'
  | 'crossCountry'
  | 'simulatedInstrument'
  | 'ffs'
  | 'ftd'
  | 'atd'
  | 'holdingProcedures'
  | 'approaches'
  | 'flightConditions'
  | 'tags'
  | 'remarks'
  | 'trainingInstructor'
  | 'trainingElements'
  | 'oooi'

const QUICK_CORE_FIELD_SET = new Set<string>(QUICK_CORE_FIELDS)

const FLIGHT_TIME_FIELDS = new Set<FlightTimeKey>([
  'total',
  'pic',
  'sic',
  'dual',
  'solo',
  'night',
  'nvg',
  'actualInstrument',
  'dualGiven',
  'crossCountry',
  'simulatedInstrument',
  'ffs',
  'ftd',
  'atd',
])

export interface EntryFormFieldSource {
  date?: string | null
  role?: string | null
  aircraftCategoryClass?: string | null
  categoryClassTime?: number | null
  aircraftMakeModel?: string | null
  registration?: string | null
  flightNumber?: string | null
  departure?: string | null
  destination?: string | null
  route?: string | null
  trainingElements?: string | null
  trainingInstructor?: string | null
  flightConditions?: string[] | null
  remarks?: string | null
  tags?: string[] | null
  flightTime?: FlightTimeBreakdown | null
  performance?: PerformanceMetrics | null
  oooi?: OOOITimes | null
}

export function parseEntryFormMode(raw: unknown): EntryFormMode {
  if (typeof raw !== 'string') return DEFAULT_ENTRY_FORM_MODE
  const normalized = raw.trim().toLowerCase()
  return normalized === 'quick' ? 'quick' : DEFAULT_ENTRY_FORM_MODE
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value && value.trim())
}

function hasNumber(value: number | null | undefined): boolean {
  return value != null && Number.isFinite(value)
}

function hasStringList(value: string[] | null | undefined): boolean {
  return Boolean(value && value.some((item) => hasText(item)))
}

function oooiHasValue(oooi: OOOITimes | null | undefined): boolean {
  if (!oooi) return false
  return hasText(oooi.out) || hasText(oooi.off) || hasText(oooi.on) || hasText(oooi.in)
}

function approachesHaveValue(performance: PerformanceMetrics | null | undefined): boolean {
  return getApproachesFromPerformance(performance).some((row) => hasText(row.type) || (row.count ?? 0) > 0)
}

/**
 * Category/Class time is auto-copied from Total Time. Treat a matching
 * copy as empty so Quick does not surface the second total box.
 */
export function categoryClassTimeIsIndependent(
  entry: Pick<EntryFormFieldSource, 'categoryClassTime' | 'flightTime'>
): boolean {
  const value = entry.categoryClassTime
  if (!hasNumber(value)) return false
  const total = entry.flightTime?.total
  return value !== total
}

export function isEntryFormFieldFilled(
  entry: EntryFormFieldSource | LogEntry | null | undefined,
  field: EntryFormFieldId
): boolean {
  if (!entry) return false

  switch (field) {
    case 'date':
      return hasText(entry.date)
    case 'role':
      return hasText(entry.role)
    case 'aircraftMakeModel':
      return hasText(entry.aircraftMakeModel)
    case 'registration':
      return hasText(entry.registration)
    case 'departure':
      return hasText(entry.departure)
    case 'destination':
      return hasText(entry.destination)
    case 'flightNumber':
      return hasText(entry.flightNumber)
    case 'aircraftCategoryClass':
      return hasText(entry.aircraftCategoryClass)
    case 'categoryClassTime':
      return categoryClassTimeIsIndependent(entry)
    case 'route':
      return hasText(entry.route)
    case 'remarks':
      return hasText(entry.remarks)
    case 'trainingInstructor':
      return hasText(entry.trainingInstructor)
    case 'trainingElements':
      return hasText(entry.trainingElements)
    case 'flightConditions':
      return hasStringList(entry.flightConditions)
    case 'tags':
      return hasStringList(entry.tags)
    case 'dayLandings':
      return hasNumber(entry.performance?.dayLandings)
    case 'nightLandings':
      return hasNumber(entry.performance?.nightLandings)
    case 'holdingProcedures':
      return hasNumber(entry.performance?.holdingProcedures)
    case 'approaches':
      return approachesHaveValue(entry.performance)
    case 'oooi':
      return oooiHasValue(entry.oooi)
    case 'sim-type':
      return hasText(entry.aircraftCategoryClass)
    case 'sim-time':
      return (
        hasNumber(entry.flightTime?.ffs) ||
        hasNumber(entry.flightTime?.ftd) ||
        hasNumber(entry.flightTime?.atd)
      )
    default:
      if (FLIGHT_TIME_FIELDS.has(field as FlightTimeKey)) {
        return hasNumber(entry.flightTime?.[field as FlightTimeKey])
      }
      return false
  }
}

export function shouldShowEntryFormField(args: {
  mode: EntryFormMode
  field: EntryFormFieldId
  entry: EntryFormFieldSource | LogEntry | null | undefined
  moreFieldsOpen: boolean
}): boolean {
  if (args.mode !== 'quick') return true
  if (QUICK_CORE_FIELD_SET.has(args.field)) return true
  if (args.moreFieldsOpen) return true
  return isEntryFormFieldFilled(args.entry, args.field)
}

export function shouldShowAnyEntryFormField(args: {
  mode: EntryFormMode
  fields: readonly EntryFormFieldId[]
  entry: EntryFormFieldSource | LogEntry | null | undefined
  moreFieldsOpen: boolean
}): boolean {
  return args.fields.some((field) =>
    shouldShowEntryFormField({
      mode: args.mode,
      field,
      entry: args.entry,
      moreFieldsOpen: args.moreFieldsOpen,
    })
  )
}
