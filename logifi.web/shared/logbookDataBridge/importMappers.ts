import {
  createEmptyFlightTime,
  createEmptyPerformance,
  type LogEntry,
} from '../../app/utils/logbookTypes'
import type { BridgeSource } from './types'
import {
  formatRegistrationForExport,
  normalizeImportHoldCount,
  normalizeImportNumber,
  parseImportDate,
  splitAirportCodes,
} from './formatters'

export function findFieldValue(
  rawEntry: Record<string, unknown>,
  possibleNames: string[]
): string {
  for (const name of possibleNames) {
    const val = rawEntry[name]
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val).trim()
    }
    const lowerName = name.toLowerCase()
    for (const key in rawEntry) {
      if (
        key.toLowerCase() === lowerName &&
        rawEntry[key] !== undefined &&
        rawEntry[key] !== null &&
        String(rawEntry[key]).trim() !== ''
      ) {
        return String(rawEntry[key]).trim()
      }
    }
  }
  return ''
}

function findRegistration(rawEntry: Record<string, unknown>): string {
  let registration = findFieldValue(rawEntry, [
    'aircraft_aircraftID',
    'Aircraft_Registration',
    'Aircraft Registration',
    'aircraft_registration',
    'flight_aircraft',
    'flight_aircraftID',
    'flight_aircraftRegistration',
    'flight_tailNumber',
    'flight_aircraftIdentifier',
    'flight_aircraftIdentifierID',
    'Tail Number',
    'tail number',
    'TailNumber',
    'tailNumber',
    'Display Tail',
    'display tail',
    'Registration',
    'registration',
    'REGISTRATION',
    'N-Number',
    'n-number',
    'NNumber',
    'nNumber',
    'Aircraft Registration',
    'Ident',
    'ident',
    'IDENT',
    'Aircraft',
    'aircraft',
    'AIRCRAFT',
    'Aircraft ID',
    'aircraft id',
    'AircraftID',
    'aircraftID',
  ])

  if (!registration) {
    for (const key in rawEntry) {
      const value = String(rawEntry[key] || '').trim().toUpperCase()
      if (value && /^N\d{1,5}[A-Z]*$/.test(value)) {
        registration = value
        break
      }
    }
  }

  return formatRegistrationForExport(registration)
}

function findDate(rawEntry: Record<string, unknown>): string | null {
  const dateValue = findFieldValue(rawEntry, [
    'flight_flightDate',
    'Flight_Date',
    'Flight Date',
    'FlightDate',
    'Date',
    'date',
    'DATE',
    'flight date',
  ])
  return parseImportDate(dateValue)
}

function normalizeCategoryClassLabel(value: string): string {
  if (!value) return ''
  const v = value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
  if (/(^| )asel( |$)/.test(v) || v.includes('airplane sel')) return 'ASEL'
  if (/(^| )amel( |$)/.test(v) || v.includes('airplane mel')) return 'AMEL'
  if (/(^| )ases( |$)/.test(v)) return 'ASES'
  if (/(^| )ames( |$)/.test(v)) return 'AMES'
  if (v.includes('rotor') || v.includes('helicopter')) return 'HELI'
  return value.trim()
}

function extractBaseModelName(model: string): string {
  if (!model?.trim()) return ''
  const trimmed = model.trim()
  const modelPattern = /^([A-Z]{1,3})-(\d{2,4})/i
  const match = trimmed.match(modelPattern)
  if (match?.[1] && match[2]) return `${match[1].toUpperCase()}-${match[2]}`
  const commaIdx = trimmed.indexOf(',')
  if (commaIdx > 0) return trimmed.slice(0, commaIdx).trim()
  return trimmed
}

function parseRouteFields(rawEntry: Record<string, unknown>): {
  departure: string
  destination: string
  route: string
} {
  let departure = findFieldValue(rawEntry, [
    'flight_from',
    'Departure',
    'departure',
    'From',
    'from',
    'FROM',
  ])
  let destination = findFieldValue(rawEntry, [
    'flight_to',
    'Destination',
    'destination',
    'To',
    'to',
    'TO',
  ])
  let route = findFieldValue(rawEntry, [
    'flight_route',
    'Route',
    'route',
    'ROUTE',
  ])

  if ((!departure || departure === 'UNKNOWN') && route) {
    const routeParts = route.trim().split(/\s+/).filter((part) => part.length >= 3)
    const firstAirport = routeParts[0]
    const lastAirport = routeParts.length > 1 ? routeParts[routeParts.length - 1] : null

    if (firstAirport) departure = firstAirport.toUpperCase()
    if (lastAirport) {
      destination = lastAirport.toUpperCase()
      route = routeParts.length > 2 ? routeParts.slice(1, -1).join(' ') : ''
    }
  }

  if (!departure.trim()) departure = 'UNKNOWN'
  if (!destination.trim()) destination = 'UNKNOWN'

  return {
    departure: departure.toUpperCase(),
    destination: destination.toUpperCase(),
    route: route.toUpperCase(),
  }
}

function defaultGenerateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `import-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function mapRawRowToLogEntry(
  rawEntry: Record<string, unknown>,
  options?: { source?: BridgeSource; generateId?: () => string }
): LogEntry | null {
  const dateStr = findDate(rawEntry)
  if (!dateStr) return null

  const registration = findRegistration(rawEntry)
  if (!registration) return null

  const { departure, destination, route } = parseRouteFields(rawEntry)
  const picTime =
    normalizeImportNumber(
      findFieldValue(rawEntry, ['flight_pic', 'PIC', 'pic', 'PilotInCommand']) ||
        rawEntry.flight_pic ||
        rawEntry.PIC
    ) ?? 0
  const sicTime =
    normalizeImportNumber(
      findFieldValue(rawEntry, ['flight_sic', 'SIC', 'sic']) || rawEntry.flight_sic
    ) ?? 0

  const hasLogtenOOOI = !!(
    findFieldValue(rawEntry, ['flight_actualDepartureTime']) ||
    findFieldValue(rawEntry, ['flight_actualArrivalTime'])
  )

  const make = findFieldValue(rawEntry, ['aircraftType_make', 'Make', 'make'])
  const model = findFieldValue(rawEntry, [
    'aircraftType_model',
    'Model',
    'model',
    'Aircraft Make/Model',
  ])
  const combinedModel = make && model ? `${make} ${model}`.trim() : model

  const simulatedFlight = findFieldValue(rawEntry, ['SimulatedFlight', 'simulatedflight'])
  const logbookType = simulatedFlight ? ('simulator' as const) : undefined

  const approachCount = normalizeImportNumber(
    findFieldValue(rawEntry, [
      'Instrument Approaches',
      'Approaches',
      'approachCount',
    ])
  )
  const approachType =
    findFieldValue(rawEntry, ['Approach Type', 'approachType', 'ApproachType']) || null

  const entry: LogEntry = {
    id: (options?.generateId ?? defaultGenerateId)(),
    date: dateStr,
    role: (() => {
      if (picTime > 0) return 'PIC'
      if (sicTime > 0) return 'SIC'
      return findFieldValue(rawEntry, ['Role', 'role', 'ROLE']) || ''
    })(),
    aircraftCategoryClass: normalizeCategoryClassLabel(
      findFieldValue(rawEntry, [
        'aircraftType_selectedAircraftClass',
        'aircraftType_selectedCategory',
        'Category / Class',
        'Aircraft Category/Class',
        'Category/Class',
        'categoryClass',
      ])
    ),
    categoryClassTime: normalizeImportNumber(
      findFieldValue(rawEntry, [
        'flight_totalTime',
        'Total Flight Time',
        'TotalTime',
        'Total Time',
        'total',
      ])
    ),
    aircraftMakeModel: extractBaseModelName(combinedModel),
    registration,
    flightNumber:
      findFieldValue(rawEntry, [
        'flight_flightNumber',
        'Flight Number',
        'flightNumber',
      ]) || null,
    departure,
    destination,
    route,
    trainingElements: findFieldValue(rawEntry, [
      'Training Elements',
      'trainingElements',
    ]),
    trainingInstructor: findFieldValue(rawEntry, [
      'Training Instructor',
      'trainingInstructor',
    ]),
    instructorCertificate: findFieldValue(rawEntry, [
      'Instructor Certificate',
      'instructorCertificate',
    ]),
    flightConditions: [],
    remarks:
      findFieldValue(rawEntry, [
        'Remarks',
        'remarks',
        'Comments',
        'comments',
        'PilotComments',
        'Pilot Comments',
      ]) || '',
    tags: (() => {
      const t = findFieldValue(rawEntry, ['Tags', 'tags'])
      if (t) return t.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
      return []
    })(),
    logbookType,
    flightTime: {
      ...createEmptyFlightTime(),
      total: hasLogtenOOOI
        ? null
        : normalizeImportNumber(
            findFieldValue(rawEntry, [
              'flight_totalTime',
              'Total Flight Time',
              'TotalTime',
              'Total Time',
              'total',
            ])
          ),
      pic: normalizeImportNumber(
        findFieldValue(rawEntry, ['flight_pic', 'PIC', 'pic', 'PilotInCommand'])
      ),
      sic: normalizeImportNumber(
        findFieldValue(rawEntry, ['flight_sic', 'SIC', 'sic'])
      ),
      dual: normalizeImportNumber(
        findFieldValue(rawEntry, [
          'flight_dualReceived',
          'DualReceived',
          'Dual Received',
          'dual',
        ])
      ),
      solo: normalizeImportNumber(
        findFieldValue(rawEntry, ['flight_solo', 'Solo', 'Solo Time', 'solo'])
      ),
      night: normalizeImportNumber(
        findFieldValue(rawEntry, [
          'flight_nightTime',
          'flight_night',
          'Night',
          'Night Time',
        ])
      ),
      actualInstrument: normalizeImportNumber(
        findFieldValue(rawEntry, [
          'flight_actualInstrument',
          'ActualInstrument',
          'Actual Instrument',
          'IMC',
          'imc',
        ])
      ),
      dualGiven: normalizeImportNumber(
        findFieldValue(rawEntry, [
          'flight_dualGiven',
          'DualGiven',
          'Dual Given',
          'CFI',
          'cfi',
        ])
      ),
      crossCountry: normalizeImportNumber(
        findFieldValue(rawEntry, [
          'flight_crossCountry',
          'CrossCountry',
          'Cross Country',
          'X-Country',
          'X-C',
        ])
      ),
      simulatedInstrument: normalizeImportNumber(
        findFieldValue(rawEntry, [
          'flight_simulatedInstrument',
          'SimulatedInstrument',
          'Simulated Instrument',
        ])
      ),
    },
    performance: {
      ...createEmptyPerformance(),
      dayLandings: normalizeImportNumber(
        findFieldValue(rawEntry, [
          'flight_dayLandings',
          'DayLandingsFullStop',
          'Day Landings',
          'Landings',
          'landings',
        ])
      ),
      nightLandings: normalizeImportNumber(
        findFieldValue(rawEntry, [
          'flight_nightLandings',
          'NightLandingsFullStop',
          'Night Landings',
        ])
      ),
      approachCount,
      approachType,
      approaches: (() => {
        const count = approachCount ?? 0
        const type = (approachType || '').trim() || 'Unknown'
        if (count > 0) return [{ type, count }]
        if (type !== 'Unknown') return [{ type, count: 1 }]
        return []
      })(),
      holdingProcedures: normalizeImportHoldCount(
        findFieldValue(rawEntry, ['Holding Procedures', 'Holds', 'Hold', 'hold'])
      ),
    },
    isImported: true,
    importSource: options?.source ?? 'csv',
  }

  return entry
}

export function mapRawRowsToLogEntries(
  rows: Record<string, unknown>[],
  options?: { source?: BridgeSource; generateId?: () => string }
): { entries: LogEntry[]; skipped: number } {
  const entries: LogEntry[] = []
  let skipped = 0

  for (const row of rows) {
    const entry = mapRawRowToLogEntry(row, options)
    if (entry) entries.push(entry)
    else skipped++
  }

  return { entries, skipped }
}
