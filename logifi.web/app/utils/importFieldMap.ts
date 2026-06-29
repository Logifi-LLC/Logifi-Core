/** Case-insensitive CSV/JSON column alias resolution for logbook import. */

export type ImportNumericField =
  | 'total'
  | 'pic'
  | 'sic'
  | 'dual'
  | 'solo'
  | 'night'
  | 'nvg'
  | 'actualInstrument'
  | 'simulatedInstrument'
  | 'crossCountry'
  | 'dualGiven'

const NUMERIC_FIELD_ALIASES: Record<ImportNumericField, string[]> = {
  total: [
    'flight_totalTime',
    'Total Flight Time',
    'total',
    'Total',
    'Turbine',
    'flightTime?.total',
  ],
  pic: ['flight_pic', 'PIC', 'pic', 'flightTime?.pic'],
  sic: ['flight_sic', 'SIC', 'sic', 'flightTime?.sic'],
  dual: ['flight_dualReceived', 'Dual Received', 'dual', 'flightTime?.dual'],
  solo: ['flight_solo', 'Solo', 'Solo Time', 'solo', 'flightTime?.solo'],
  night: [
    'flight_nightTime',
    'flight_night',
    'Night Time',
    'night time',
    'NightTime',
    'nightTime',
    'Night',
    'night',
    'NIGHT',
    'flightTime?.night',
  ],
  nvg: ['NVG', 'nvg', 'Night Vision', 'Night Vision Goggle', 'Night Vision Goggles'],
  actualInstrument: [
    'flight_actualInstrument',
    'Actual Instrument',
    'Actual',
    'IMC',
    'imc',
    'actualInstrument',
    'flightTime?.actualInstrument',
  ],
  simulatedInstrument: [
    'flight_simulatedInstrument',
    'Simulated Instrument',
    'Hood',
    'hood',
    'simulatedInstrument',
    'flightTime?.simulatedInstrument',
  ],
  crossCountry: [
    'flight_crossCountry',
    'Cross Country',
    'X-Country',
    'X-C',
    'crossCountry',
    'flightTime?.crossCountry',
  ],
  dualGiven: [
    'flight_dualGiven',
    'Dual Given',
    'CFI',
    'cfi',
    'dualGiven',
    'flightTime?.dualGiven',
  ],
}

const AIRCRAFT_MAKE_MODEL_ALIASES = [
  'aircraftType_model',
  'Aircraft Make/Model',
  'aircraft make/model',
  'Aircraft Type',
  'aircraft type',
  'Type',
  'Model',
  'model',
  'MODEL',
  'aircraftMakeModel',
]

const ROLE_ALIASES = ['Role', 'role', 'ROLE']

/** Find a string field value from a raw import row (case-insensitive header match). */
export function findImportFieldValue(
  rawEntry: Record<string, unknown>,
  possibleNames: string[]
): string {
  for (const name of possibleNames) {
    const direct = rawEntry[name]
    if (direct !== undefined && direct !== null && direct !== '') {
      return String(direct).trim()
    }
    const lowerName = name.toLowerCase()
    for (const key in rawEntry) {
      if (key.toLowerCase() === lowerName) {
        const val = rawEntry[key]
        if (val !== undefined && val !== null && val !== '') {
          return String(val).trim()
        }
      }
    }
  }
  return ''
}

function parseImportDecimal(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null
  const n = parseFloat(String(value).trim())
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 10) / 10
}

/** Resolve a numeric import field from aliases; returns null when absent or invalid. */
export function resolveImportNumber(
  rawEntry: Record<string, unknown>,
  field: ImportNumericField
): number | null {
  const aliases = NUMERIC_FIELD_ALIASES[field]
  const str = findImportFieldValue(rawEntry, aliases)
  if (str) return parseImportDecimal(str)
  for (const name of aliases) {
    if (name.includes('?.') || name.includes('flightTime')) continue
    const direct = rawEntry[name]
    if (direct !== undefined && direct !== null && direct !== '') {
      return parseImportDecimal(direct)
    }
  }
  return null
}

export function resolveImportAircraftMakeModel(rawEntry: Record<string, unknown>): string {
  const direct = findImportFieldValue(rawEntry, AIRCRAFT_MAKE_MODEL_ALIASES)
  if (direct) return direct
  const make = findImportFieldValue(rawEntry, ['aircraftType_make'])
  const model = findImportFieldValue(rawEntry, ['aircraftType_model'])
  if (make && model) return `${make} ${model}`.trim()
  return ''
}

const TRAINING_DEVICE_NAME_PATTERN =
  /\b(sim|simulator|full\s+motion|motion|ffs|ftd|atd)\b/i

/** True when the string looks like a simulator / training device name, not an airframe model code. */
export function isTrainingDeviceMakeModel(model: string): boolean {
  return TRAINING_DEVICE_NAME_PATTERN.test((model || '').trim())
}

/**
 * Extract base aircraft model name from a full model string.
 * Examples: "C-172 S G-1000, Cessna Skyhawk SP" -> "C-172"; "L Sim - Full Motion" -> full string.
 */
export function extractBaseModelName(model: string): string {
  if (!model || !model.trim()) return ''

  const trimmed = model.trim()

  if (isTrainingDeviceMakeModel(trimmed)) {
    return trimmed
  }

  const modelPattern = /^([A-Z]{1,3})-(\d{2,4})/i
  const match = trimmed.match(modelPattern)
  if (match && match[1] && match[2]) {
    return `${match[1].toUpperCase()}-${match[2]}`
  }

  const commaIndex = trimmed.indexOf(',')
  if (commaIndex > 0) {
    const beforeComma = trimmed.substring(0, commaIndex).trim()
    const fallbackMatch = beforeComma.match(modelPattern)
    if (fallbackMatch && fallbackMatch[1] && fallbackMatch[2]) {
      return `${fallbackMatch[1].toUpperCase()}-${fallbackMatch[2]}`
    }
    const parts = beforeComma.split(/\s+/)
    if (parts.length > 0 && parts[0] && parts[0].length <= 20) {
      return parts[0]
    }
  }

  const words = trimmed.split(/\s+/)
  const firstWord = words[0]
  if (firstWord && words.length > 1 && firstWord.length <= 2) {
    return trimmed
  }
  if (firstWord && (firstWord.includes('-') || firstWord.length <= 10)) {
    return firstWord
  }

  return trimmed
}

/** Normalize role from import row; infers Dual Received when dual time > 0 and no PIC/SIC. */
export function resolveImportRole(rawEntry: Record<string, unknown>): string {
  const picTime = resolveImportNumber(rawEntry, 'pic') ?? 0
  const sicTime = resolveImportNumber(rawEntry, 'sic') ?? 0
  if (picTime > 0) return 'PIC'
  if (sicTime > 0) return 'SIC'

  let role = findImportFieldValue(rawEntry, ROLE_ALIASES)
  if (role) {
    const norm = role.trim().toLowerCase().replace(/\s+/g, ' ')
    if (norm === 'dual recieved' || norm === 'dual received' || norm === 'student') {
      return 'Dual Received'
    }
    return role.trim()
  }

  const dualTime = resolveImportNumber(rawEntry, 'dual') ?? 0
  if (dualTime > 0) return 'Dual Received'
  return ''
}
