import { toCatalogAirportCode } from '../../shared/airportCodeCanonical'
import {
  getTotalApproachCount,
  type LogbookColumnKey,
  type LogEntry,
} from './logbookTypes'
import { getDisplayConditions } from './flightConditions'

function isAirlineScheduleImport(source: string | undefined): boolean {
  return source === 'fc_view' || source === 'flica_aerodatabox'
}

/** Display airport codes in catalog ICAO form for airline-imported entries (LGA → KLGA). */
export function formatEntryAirportCode(
  entry: Pick<LogEntry, 'importSource'>,
  code: string | null | undefined
): string {
  const raw = (code ?? '').trim()
  if (!raw) return raw
  if (isAirlineScheduleImport(entry.importSource)) return toCatalogAirportCode(raw)
  return raw
}

export function roleDisplayLabel(role: string): string {
  return role === 'Dual Received' ? 'Student' : role
}

export function formatLogbookNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  const num = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(num) || !Number.isFinite(num)) return '—'
  if (num === 0 || Math.abs(num) < 0.05) return '—'
  return num.toFixed(1)
}

export function formatDisplayDate(date: string): string {
  if (!date) return '—'

  const isoMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    return `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`
  }

  const mdyMatch = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdyMatch?.[1] && mdyMatch[2] && mdyMatch[3]) {
    return `${mdyMatch[1].padStart(2, '0')}/${mdyMatch[2].padStart(2, '0')}/${mdyMatch[3]}`
  }

  const d = new Date(`${date}T00:00:00`)
  if (!Number.isNaN(d.getTime())) {
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${mm}/${dd}/${yyyy}`
  }

  return '—'
}

type SimTypeKey = 'FFS' | 'FTD' | 'ATD'

function getSelectedSimType(entry: LogEntry): '' | SimTypeKey {
  const ft = entry.flightTime
  if (ft.ffs != null) return 'FFS'
  if (ft.ftd != null) return 'FTD'
  if (ft.atd != null) return 'ATD'
  return ''
}

export interface EntryFieldDisplay {
  text: string
  isEmpty: boolean
  conditions?: string[]
}

export function getEntryFieldDisplay(entry: LogEntry, key: LogbookColumnKey): EntryFieldDisplay {
  switch (key) {
    case 'date':
      return { text: formatDisplayDate(entry.date), isEmpty: !entry.date }
    case 'aircraft': {
      const text = [entry.aircraftMakeModel, entry.aircraftCategoryClass].filter(Boolean).join(' · ')
      return { text: text || '—', isEmpty: !text }
    }
    case 'identification':
      return { text: entry.registration || '—', isEmpty: !entry.registration }
    case 'flightNumber':
      return { text: entry.flightNumber || '—', isEmpty: !entry.flightNumber }
    case 'fromTo': {
      const dep = formatEntryAirportCode(entry, entry.departure)
      const dest = formatEntryAirportCode(entry, entry.destination)
      const route = `${dep} → ${dest}`
      const text = entry.route ? `${route} (${entry.route})` : route
      return { text, isEmpty: !entry.departure && !entry.destination }
    }
    case 'conditions': {
      const conditions = getDisplayConditions(entry)
      return { text: conditions.join(', ') || '—', isEmpty: conditions.length === 0, conditions }
    }
    case 'remarks':
      return { text: entry.remarks || '—', isEmpty: !entry.remarks?.trim() }
    case 'pic':
      return { text: formatLogbookNumber(entry.flightTime.pic), isEmpty: formatLogbookNumber(entry.flightTime.pic) === '—' }
    case 'sic':
      return { text: formatLogbookNumber(entry.flightTime.sic), isEmpty: formatLogbookNumber(entry.flightTime.sic) === '—' }
    case 'dualR':
      return { text: formatLogbookNumber(entry.flightTime.dual), isEmpty: formatLogbookNumber(entry.flightTime.dual) === '—' }
    case 'solo':
      return { text: formatLogbookNumber(entry.flightTime.solo), isEmpty: formatLogbookNumber(entry.flightTime.solo) === '—' }
    case 'night':
      return { text: formatLogbookNumber(entry.flightTime.night), isEmpty: formatLogbookNumber(entry.flightTime.night) === '—' }
    case 'nvg':
      return { text: formatLogbookNumber(entry.flightTime.nvg), isEmpty: formatLogbookNumber(entry.flightTime.nvg) === '—' }
    case 'actual':
      return { text: formatLogbookNumber(entry.flightTime.actualInstrument), isEmpty: formatLogbookNumber(entry.flightTime.actualInstrument) === '—' }
    case 'hood':
      return { text: formatLogbookNumber(entry.flightTime.simulatedInstrument), isEmpty: formatLogbookNumber(entry.flightTime.simulatedInstrument) === '—' }
    case 'dualG':
      return { text: formatLogbookNumber(entry.flightTime.dualGiven), isEmpty: formatLogbookNumber(entry.flightTime.dualGiven) === '—' }
    case 'xc':
      return { text: formatLogbookNumber(entry.flightTime.crossCountry), isEmpty: formatLogbookNumber(entry.flightTime.crossCountry) === '—' }
    case 'dayLandings':
      return { text: entry.performance.dayLandings != null ? String(entry.performance.dayLandings) : '—', isEmpty: entry.performance.dayLandings == null }
    case 'nightLandings':
      return { text: entry.performance.nightLandings != null ? String(entry.performance.nightLandings) : '—', isEmpty: entry.performance.nightLandings == null }
    case 'approach':
      return { text: String(getTotalApproachCount(entry.performance) || '—'), isEmpty: !getTotalApproachCount(entry.performance) }
    case 'pilots':
      return { text: entry.trainingElements || '—', isEmpty: !entry.trainingElements?.trim() }
    case 'total':
      return { text: formatLogbookNumber(entry.flightTime.total), isEmpty: formatLogbookNumber(entry.flightTime.total) === '—' }
    default:
      return { text: '—', isEmpty: true }
  }
}

export function getTotalTimeColorClass(entry: LogEntry, isDarkMode: boolean): string {
  if (isAirlineScheduleImport(entry.importSource)) {
    return isDarkMode ? 'text-amber-400' : 'text-amber-600'
  }
  if (entry.importSource === 'logbook_builder') {
    return isDarkMode ? 'text-green-400' : 'text-green-600'
  }
  if (entry.isImported && entry.importSource !== 'localStorage') {
    return isDarkMode ? 'text-red-400' : 'text-red-600'
  }
  return isDarkMode ? 'text-blue-400' : 'text-blue-600'
}

export function getSimHeaderLabel(entry: LogEntry): string {
  const simType = getSelectedSimType(entry)
  if (simType) return simType
  return entry.aircraftCategoryClass || 'Simulator'
}

export function getSimHeaderTime(entry: LogEntry): string {
  const simType = getSelectedSimType(entry)
  if (!simType) return formatLogbookNumber(entry.flightTime.total)
  const val = entry.flightTime[simType.toLowerCase() as 'ffs' | 'ftd' | 'atd']
  return formatLogbookNumber(val ?? entry.flightTime.total)
}
