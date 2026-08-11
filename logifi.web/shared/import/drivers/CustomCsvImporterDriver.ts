import { createBridgeBackedImporter } from './baseDriver'
import type { ProviderImporter } from '../types'

/**
 * Excel / Standard CSV importer.
 *
 * WHY: Pilots often bring arbitrary spreadsheets. We force bridge source
 * `generic` so auto-detect cannot mis-label a simple CSV as ForeFlight/LogTen
 * when the user explicitly chose "Excel / Standard CSV".
 *
 * HOW: Alias-based header matching in importMappers + existing preview path
 * acts as the interactive column mapper (flexible headers, Part 61 validation).
 */
export const CustomCsvImporterDriver: ProviderImporter = createBridgeBackedImporter({
  provider: 'custom_csv',
  bridgeSource: 'generic',
})
