import type { LogEntry } from '../../../app/utils/logbookTypes'
import { parseBridgeFile } from '../../logbookDataBridge/fileParser'
import { mapRawRowToLogEntry } from '../../logbookDataBridge/importMappers'
import {
  enrichLogtenDynamicExportRow,
  isLogtenDynamicExportHeaders,
} from '../../logbookDataBridge/logtenDynamicExport'
import type { BridgeSource } from '../../logbookDataBridge/types'
import type {
  ImportProviderKey,
  ProviderImporter,
  ProviderParseResult,
} from '../types'
import { toLogifiCoreFlightRecord } from '../types'

export interface DriverEnrichContext {
  rawRows: Record<string, string>[]
  aircraftRows?: Record<string, string>[]
  headers: string[]
}

/**
 * Shared parse pipeline: forced bridge source → row map → provider enrich → core DTO.
 * WHY: Every driver must stay on-device and reuse battle-tested bridge parsers.
 */
export function createBridgeBackedImporter(options: {
  provider: ImportProviderKey
  bridgeSource: BridgeSource
  /**
   * Provider-specific post-map rules (aircraft join, FS landings, etc.).
   * Mutates entries in place; return warnings to surface in UI.
   */
  enrich?: (
    entries: LogEntry[],
    rawRows: Record<string, string>[],
    ctx: DriverEnrichContext
  ) => string[]
}): ProviderImporter {
  const { provider, bridgeSource, enrich } = options

  return {
    provider,
    bridgeSource,
    parse(content: string, parseOptions?: { generateId?: () => string }): ProviderParseResult {
      const parsed = parseBridgeFile(content, bridgeSource)
      const warnings: string[] = []

      if (parsed.skippedAircraftRows > 0 && bridgeSource === 'foreflight') {
        warnings.push(
          `Aircraft table had ${parsed.skippedAircraftRows} row(s); used to enrich flight type/class when present.`
        )
      }

      if (parsed.rows.length === 0) {
        return {
          provider,
          bridgeSource,
          records: [],
          entries: [],
          warnings: [...warnings, 'No flight rows found in file.'],
          skipped: 0,
        }
      }

      const entries: LogEntry[] = []
      const acceptedRawRows: Record<string, string>[] = []
      let skipped = 0

      for (const row of parsed.rows) {
        const entry = mapRawRowToLogEntry(row, {
          source: bridgeSource,
          generateId: parseOptions?.generateId,
        })
        if (!entry) {
          skipped++
          continue
        }

        // HOW: LogTen Dynamic Export needs crew/role enrichment after base map.
        if (
          bridgeSource === 'logten' &&
          isLogtenDynamicExportHeaders(Object.keys(row))
        ) {
          enrichLogtenDynamicExportRow(entry, row, '')
        }

        entry.importSource = bridgeSource
        entries.push(entry)
        acceptedRawRows.push(row)
      }

      if (enrich) {
        const extra = enrich(entries, acceptedRawRows, {
          rawRows: acceptedRawRows,
          aircraftRows: parsed.aircraftRows,
          headers: parsed.headers,
        })
        warnings.push(...extra)
      }

      if (skipped > 0) {
        warnings.push(`${skipped} row(s) skipped due to missing date or registration.`)
      }

      return {
        provider,
        bridgeSource,
        records: entries.map(toLogifiCoreFlightRecord),
        entries,
        warnings,
        skipped,
      }
    },
  }
}
