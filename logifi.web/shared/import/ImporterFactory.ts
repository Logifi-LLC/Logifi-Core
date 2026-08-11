import { CustomCsvImporterDriver } from './drivers/CustomCsvImporterDriver'
import { ForeFlightImporterDriver } from './drivers/ForeFlightImporterDriver'
import { LogTenImporterDriver } from './drivers/LogTenImporterDriver'
import { MyFlightBookImporterDriver } from './drivers/MyFlightBookImporterDriver'
import type { ImportProviderKey, ProviderImporter, ProviderParseResult } from './types'

/**
 * Factory for provider-specific logbook importers.
 *
 * WHY: Pilots pick their source software; forcing the correct driver avoids
 * fragile auto-detect (e.g. LogTen Dynamic headers looking like ForeFlight).
 * All drivers parse strictly in-browser for privacy and zero server cost.
 */
const DRIVERS: Record<ImportProviderKey, ProviderImporter> = {
  foreflight: ForeFlightImporterDriver,
  myflightbook: MyFlightBookImporterDriver,
  logten: LogTenImporterDriver,
  custom_csv: CustomCsvImporterDriver,
}

export function getImporter(provider: ImportProviderKey): ProviderImporter {
  const driver = DRIVERS[provider]
  if (!driver) {
    throw new Error(`Unknown import provider: ${provider}`)
  }
  return driver
}

/** Alias matching the plan name `createImporter`. */
export function createImporter(provider: ImportProviderKey): ProviderImporter {
  return getImporter(provider)
}

/**
 * Convenience: parse a file string with the selected provider in one call.
 */
export function parseWithProvider(
  provider: ImportProviderKey,
  content: string,
  options?: { generateId?: () => string }
): ProviderParseResult {
  return getImporter(provider).parse(content, options)
}

export type { ImportProviderKey, ProviderImporter, ProviderParseResult }
export { PROVIDER_GUIDES, PROVIDER_GUIDE_LIST } from './providerGuides'
export type { ProviderGuide } from './providerGuides'
export {
  assertFiniteCoreNumbers,
  providerKeyToBridgeSource,
  toLogifiCoreFlightRecord,
} from './types'
export type { LogifiCoreFlightRecord } from './types'
