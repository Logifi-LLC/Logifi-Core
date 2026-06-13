import type { BridgeImportOptions, BridgeParseResult } from './types'
import { parseBridgeFile } from './fileParser'
import { mapRawRowsToLogEntries } from './importMappers'

export function ingestBridgeFile(
  content: string,
  options?: BridgeImportOptions
): BridgeParseResult {
  const parsed = parseBridgeFile(content, options?.source)
  const warnings: string[] = []

  if (parsed.skippedAircraftRows > 0) {
    warnings.push(
      `Skipped ${parsed.skippedAircraftRows} aircraft table row(s); imported flights section only.`
    )
  }

  if (parsed.rows.length === 0) {
    return {
      source: parsed.source,
      entries: [],
      skipped: 0,
      warnings: [...warnings, 'No flight rows found in file.'],
      aircraftRowCount: parsed.aircraftRows?.length ?? 0,
    }
  }

  const { entries, skipped } = mapRawRowsToLogEntries(parsed.rows, {
    source: parsed.source,
    generateId: options?.generateId,
  })

  if (skipped > 0) {
    warnings.push(`${skipped} row(s) skipped due to missing date or registration.`)
  }

  return {
    source: parsed.source,
    entries,
    skipped,
    warnings,
    aircraftRowCount: parsed.aircraftRows?.length ?? 0,
  }
}
