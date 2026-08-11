import { findFieldValue } from '../../logbookDataBridge/importMappers'
import { normalizeImportNumber } from '../../logbookDataBridge/formatters'
import type { LogEntry } from '../../../app/utils/logbookTypes'
import { createBridgeBackedImporter } from './baseDriver'
import type { ProviderImporter } from '../types'

/**
 * MyFlightBook UTF-8 CSV.
 *
 * WHY: MFB exports both total `Landings` and full-stop breakdowns
 * (`FS Day Landings` / `FS Night Landings`). Using total `Landings` as day
 * landings double-counts / mis-attributes night. Prefer FS columns when present.
 *
 * HOW: After base map, re-read FS Day/Night from the raw row and override
 * performance.dayLandings / nightLandings. Base mapper already prefers FS via
 * alias order in importMappers — this driver re-asserts the rule for clarity
 * and future-proofing if alias order drifts.
 */
function enrichMyFlightBookEntries(
  entries: LogEntry[],
  rawRows: Record<string, string>[]
): string[] {
  const warnings: string[] = []
  let fsOverrides = 0

  entries.forEach((entry, index) => {
    const raw = rawRows[index]
    if (!raw) return

    const fsDay = normalizeImportNumber(
      findFieldValue(raw, [
        'FS Day Landings',
        'FS Day Landings ',
        'fs day landings',
      ])
    )
    const fsNight = normalizeImportNumber(
      findFieldValue(raw, [
        'FS Night Landings',
        'FS Night Landings ',
        'fs night landings',
      ])
    )

    if (fsDay != null) {
      entry.performance.dayLandings = fsDay
      fsOverrides++
    }
    if (fsNight != null) {
      entry.performance.nightLandings = fsNight
      fsOverrides++
    }

    // WHY: MFB uses Comments for remarks; base mapper already maps Comments → remarks.
    // Ensure empty Remarks with Comments still land in remarks.
    if (!entry.remarks?.trim()) {
      const comments = findFieldValue(raw, ['Comments', 'comments'])
      if (comments) entry.remarks = comments
    }
  })

  if (fsOverrides > 0) {
    warnings.push(
      `Applied MyFlightBook FS Day/Night landing breakdowns on ${fsOverrides} field(s).`
    )
  }

  return warnings
}

export const MyFlightBookImporterDriver: ProviderImporter = createBridgeBackedImporter({
  provider: 'myflightbook',
  bridgeSource: 'myflightbook',
  enrich: enrichMyFlightBookEntries,
})
