import {
  createEmptyFlightTime,
  createEmptyPerformance,
  type ApproachRecord,
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
import { parseLogtenApproach1 } from './logtenDynamicExport'

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

/** ForeFlight flights with a blank AircraftID keep hours under this placeholder. */
export const FOREFLIGHT_MISSING_TAIL = 'NO TAIL'

export function normalizeCategoryClassLabel(value: string): string {
  if (!value) return ''
  const v = value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
  if (
    /(^| )asel( |$)/.test(v) ||
    v.includes('airplane sel') ||
    v.includes('single engine land')
  ) {
    return 'ASEL'
  }
  if (
    /(^| )amel( |$)/.test(v) ||
    v.includes('airplane mel') ||
    v.includes('multi engine land') ||
    v.includes('multiengine land')
  ) {
    return 'AMEL'
  }
  if (
    /(^| )ases( |$)/.test(v) ||
    v.includes('airplane ses') ||
    v.includes('single engine sea')
  ) {
    return 'ASES'
  }
  if (
    /(^| )ames( |$)/.test(v) ||
    v.includes('airplane mes') ||
    v.includes('multi engine sea') ||
    v.includes('multiengine sea')
  ) {
    return 'AMES'
  }
  if (v.includes('rotor') || v.includes('helicopter')) return 'HELI'
  return value.trim()
}

const MULTI_ENGINE_TYPE_CODES = /^(DA42|DA62|PA44|PA34|PA23|PA31|BE58|BE76|C310|C340|C402|C414|C421)/i

/** Infer ASEL/AMEL from ForeFlight TypeCode or make/model when FAA class is blank. */
export function inferCategoryClassFromAircraftHints(
  typeCode: string,
  makeModel: string
): string {
  const blob = `${typeCode} ${makeModel}`.toLowerCase()
  if (!blob.trim()) return ''
  if (
    blob.includes('helicopter') ||
    blob.includes('rotor') ||
    /\br22\b|\br44\b|\br66\b/.test(blob)
  ) {
    return 'HELI'
  }
  if (MULTI_ENGINE_TYPE_CODES.test(typeCode.trim()) || /\bda-?42\b|\bda-?62\b/.test(blob)) {
    return 'AMEL'
  }
  if (typeCode.trim() || makeModel.trim()) return 'ASEL'
  return ''
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

const PIC_NAME_FIELDS = [
  'PIC Name',
  'pic_name',
  'picName',
  'Captain',
  'Captain Name',
  'Name of PIC',
  'flight_selectedCrewPIC',
  'PIC/P1 Crew',
]

const SIC_NAME_FIELDS = [
  'SIC Name',
  'sic_name',
  'sicName',
  'First Officer',
  'First Officer Name',
  'FO',
  'Name of SIC',
  'flight_selectedCrewSIC',
  'SIC/P2 Crew',
]

function looksLikeHoursToken(value: string): boolean {
  return /^\d+(\.\d+)?$/.test(value.trim())
}

function normalizeCrewName(value: string): string | null {
  const trimmed = value.replace(/\s+/g, ' ').trim()
  if (!trimmed || looksLikeHoursToken(trimmed)) return null
  if (/^(PIC|SIC|IRP|ACM)$/i.test(trimmed)) return null
  return trimmed
}

/**
 * 777-style remarks: `PIC <name> SIC <name>` with optional (TOLA) and IRP/ACM after.
 * IRP/ACM names are not PIC/SIC. Does not invent hours.
 */
export function parsePicSicPairFromRemarks(
  remarks: string
): { picName: string; sicName: string } | null {
  const match = remarks.match(/\bPIC\s+(.+?)\s+SIC\s+(.+)/i)
  if (!match?.[1] || !match[2]) return null

  const picName = normalizeCrewName(match[1])
  const sicRaw = match[2].split(/\s+(?:IRP|ACM)\b/i)[0] ?? match[2]
  const sicName = normalizeCrewName(sicRaw.replace(/\s*\([^)]*\)/g, ' '))
  if (!picName || !sicName) return null
  return { picName, sicName }
}

/**
 * E-175 style: remarks is only `First Last` plus an optional employee number.
 * That name is the other crew: Role PIC → sicName, Role SIC → picName.
 */
export function parseOtherCrewFromRemarks(
  remarks: string,
  role: string
): { picName?: string; sicName?: string } | null {
  const trimmed = remarks.trim()
  if (!trimmed) return null
  if (/\b(PIC|SIC|IRP|ACM)\b/i.test(trimmed)) return null

  const match = trimmed.match(
    /^([A-Za-z][A-Za-z.'-]*(?:\s+[A-Za-z][A-Za-z.'-]*)+)(?:\s+\d{3,})?$/
  )
  const name = match?.[1] ? normalizeCrewName(match[1]) : null
  if (!name) return null

  const roleNorm = role.trim().toUpperCase()
  if (roleNorm === 'PIC') return { sicName: name }
  if (roleNorm === 'SIC') return { picName: name }
  return null
}

export function resolveCrewNamesFromRawRow(
  rawEntry: Record<string, unknown>,
  role: string,
  remarks: string
): { picName: string | null; sicName: string | null } {
  let picName = normalizeCrewName(findFieldValue(rawEntry, PIC_NAME_FIELDS))
  let sicName = normalizeCrewName(findFieldValue(rawEntry, SIC_NAME_FIELDS))

  if (!picName || !sicName) {
    const pair = parsePicSicPairFromRemarks(remarks)
    if (pair) {
      if (!picName) picName = pair.picName
      if (!sicName) sicName = pair.sicName
    }
  }

  if (!picName || !sicName) {
    const other = parseOtherCrewFromRemarks(remarks, role)
    if (other) {
      if (!picName && other.picName) picName = other.picName
      if (!sicName && other.sicName) sicName = other.sicName
    }
  }

  return { picName, sicName }
}

function defaultGenerateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `import-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function collectApproachRecords(rawEntry: Record<string, unknown>): {
  approaches: ApproachRecord[]
  approachCount: number | null
  approachType: string | null
} {
  const collected: ApproachRecord[] = []

  for (let i = 1; i <= 6; i++) {
    const raw = findFieldValue(rawEntry, [
      `Approach${i}`,
      `Approach ${i}`,
      `flight_selectedApproach${i}`,
    ])
    if (!raw) continue
    const parsed = parseLogtenApproach1(raw)
    if (parsed && parsed.count > 0) {
      collected.push({ type: parsed.type, count: parsed.count })
      continue
    }
    const count = normalizeImportNumber(raw)
    if (count != null && count > 0) {
      collected.push({ type: 'Unknown', count })
    }
  }

  if (collected.length === 0) {
    const approachRaw = findFieldValue(rawEntry, [
      'Instrument Approaches',
      'Approaches',
      'approachCount',
    ])
    const parsedApproach = parseLogtenApproach1(approachRaw)
    const approachType =
      findFieldValue(rawEntry, ['Approach Type', 'approachType', 'ApproachType']) ||
      parsedApproach?.type ||
      null
    const approachCount =
      parsedApproach?.count ?? normalizeImportNumber(approachRaw) ?? null
    if ((approachCount ?? 0) > 0) {
      collected.push({
        type: (approachType || '').trim() || 'Unknown',
        count: approachCount ?? 1,
      })
    } else if (approachType) {
      collected.push({ type: approachType, count: 1 })
    }
  }

  const total = collected.reduce((sum, item) => sum + item.count, 0)
  return {
    approaches: collected,
    approachCount: total > 0 ? total : null,
    approachType: collected[0]?.type ?? null,
  }
}

export function mapRawRowToLogEntry(
  rawEntry: Record<string, unknown>,
  options?: { source?: BridgeSource; generateId?: () => string }
): LogEntry | null {
  const dateStr = findDate(rawEntry)
  if (!dateStr) return null

  let registration = findRegistration(rawEntry)
  if (!registration) {
    if (options?.source === 'foreflight') {
      registration = FOREFLIGHT_MISSING_TAIL
    } else {
      return null
    }
  }

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
  const dualReceivedTime = normalizeImportNumber(
    findFieldValue(rawEntry, [
      'flight_dualReceived',
      'DualReceived',
      'Dual Received',
      'dual',
    ])
  )
  const dualGivenTime = normalizeImportNumber(
    findFieldValue(rawEntry, [
      'flight_dualGiven',
      'DualGiven',
      'Dual Given',
      'CFI',
      'cfi',
    ])
  )

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
    'Aircraft Type',
    'aircraft type',
  ])
  const combinedModel = make && model ? `${make} ${model}`.trim() : model

  const simulatedHours = normalizeImportNumber(
    findFieldValue(rawEntry, ['SimulatedFlight', 'simulatedflight'])
  )
  const logbookType =
    simulatedHours != null && simulatedHours > 0 ? ('simulator' as const) : undefined

  const { approaches, approachCount, approachType } = collectApproachRecords(rawEntry)

  const entry: LogEntry = {
    id: (options?.generateId ?? defaultGenerateId)(),
    date: dateStr,
    role: (() => {
      if (picTime > 0) return 'PIC'
      if (sicTime > 0) return 'SIC'
      if ((dualReceivedTime ?? 0) > 0) return 'Dual Received'
      if ((dualGivenTime ?? 0) > 0) return 'Instructor'
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
        'Flight #',
        'flight #',
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
        'flight_remarks',
        'Remarks',
        'remarks',
        'Comments',
        'comments',
        'PilotComments',
        'Pilot Comments',
      ]) || '',
    picName: null,
    sicName: null,
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
      dual: dualReceivedTime,
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
          'Actual Inst',
          'actual inst',
          'IMC',
          'imc',
        ])
      ),
      dualGiven: dualGivenTime,
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
      /**
       * WHY (MyFlightBook): Exports include both total `Landings` and
       * `FS Day Landings` / `FS Night Landings`. Prefer FS columns so night
       * full-stops are not stuffed into dayLandings via the generic Landings alias.
       * HOW: Alias order — FS / provider-specific first, total Landings last.
       */
      dayTakeoffs: normalizeImportNumber(
        findFieldValue(rawEntry, [
          'DayTakeoffs',
          'Day Takeoffs',
          'daytakeoffs',
          'Day T/O',
          'day t/o',
        ])
      ),
      nightTakeoffs: normalizeImportNumber(
        findFieldValue(rawEntry, [
          'NightTakeoffs',
          'Night Takeoffs',
          'nighttakeoffs',
          'Night T/O',
          'night t/o',
        ])
      ),
      dayLandings: normalizeImportNumber(
        findFieldValue(rawEntry, [
          'FS Day Landings',
          'fs day landings',
          'flight_dayLandings',
          'DayLandingsFullStop',
          'Day Landings',
          'Day Ldg',
          'day ldg',
          'Landings',
          'landings',
        ])
      ),
      nightLandings: normalizeImportNumber(
        findFieldValue(rawEntry, [
          'FS Night Landings',
          'fs night landings',
          'flight_nightLandings',
          'NightLandingsFullStop',
          'Night Landings',
          'Night Ldg',
          'night ldg',
        ])
      ),
      approachCount,
      approachType,
      approaches,
      holdingProcedures: normalizeImportHoldCount(
        findFieldValue(rawEntry, ['Holding Procedures', 'Holds', 'Hold', 'hold'])
      ),
    },
    isImported: true,
    importSource: options?.source ?? 'csv',
  }

  const crewNames = resolveCrewNamesFromRawRow(rawEntry, entry.role, entry.remarks)
  entry.picName = crewNames.picName
  entry.sicName = crewNames.sicName

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
