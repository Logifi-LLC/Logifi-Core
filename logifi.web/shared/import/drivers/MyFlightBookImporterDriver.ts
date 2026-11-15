import { findFieldValue } from '../../logbookDataBridge/importMappers'
import { normalizeImportNumber } from '../../logbookDataBridge/formatters'
import type { LogEntry } from '../../../app/utils/logbookTypes'
import { createBridgeBackedImporter } from './baseDriver'
import type { ProviderImporter } from '../types'

/**
 * MyFlightBook UTF-8 CSV.
 *
 * WHY: MFB exports total `Landings` plus full-stop breakdowns. Day landings are
 * all landings minus night (mapper). Do not copy FS Day onto dayLandings — that
 * drops touch-and-goes. FS Night is the source night count when present.
 *
 * HOW: Re-read FS Night only. Comments fill remarks when Remarks is empty.
 */
function enrichMyFlightBookEntries(
  entries: LogEntry[],
  rawRows: Record<string, string>[]
): string[] {
  const warnings: string[] = []
  let fsNightOverrides = 0

  entries.forEach((entry, index) => {
    const raw = rawRows[index]
    if (!raw) return

    const fsNight = normalizeImportNumber(
      findFieldValue(raw, [
        'FS Night Landings',
        'FS Night Landings ',
        'fs night landings',
      ])
    )

    if (fsNight != null && entry.performance.nightLandings == null) {
      entry.performance.nightLandings = fsNight
      fsNightOverrides++
    }

    // WHY: MFB uses Comments for remarks; base mapper already maps Comments → remarks.
    // Ensure empty Remarks with Comments still land in remarks.
    if (!entry.remarks?.trim()) {
      const comments = findFieldValue(raw, ['Comments', 'comments'])
      if (comments) entry.remarks = comments
    }
  })

  if (fsNightOverrides > 0) {
    warnings.push(
      `Applied MyFlightBook FS Night landing counts on ${fsNightOverrides} field(s).`
    )
  }

  return warnings
}

export const MyFlightBookImporterDriver: ProviderImporter = createBridgeBackedImporter({
  provider: 'myflightbook',
  bridgeSource: 'myflightbook',
  enrich: enrichMyFlightBookEntries,
})
