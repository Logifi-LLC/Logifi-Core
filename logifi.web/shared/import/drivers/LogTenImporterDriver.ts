import { createBridgeBackedImporter } from './baseDriver'
import type { ProviderImporter } from '../types'

/**
 * LogTen Pro importer.
 *
 * WHY: LogTen has two real export schemas:
 * 1) Native keys (`flight_flightDate`, `aircraft_aircraftID`, …) from internal /
 *    Export Flights (Tab) style dumps — preferred; more complete.
 * 2) Dynamic Export (Tab) with human headers (`Flight #`, `PIC/P1 Crew`, …) —
 *    filtered templates may omit flights; still supported via logtenDynamicExport.
 *
 * HOW: Force bridge source `logten` so delimiter + header detection stay LogTen-
 * oriented. Base driver applies Dynamic enrichment when headers match.
 * Prefer instructing pilots: Reports → Exporters → Export Flights (Tab), UTC/24h.
 */
export const LogTenImporterDriver: ProviderImporter = createBridgeBackedImporter({
  provider: 'logten',
  bridgeSource: 'logten',
  enrich: () => {
    // Mapping rules live in importMappers + logtenDynamicExport; no extra pass.
    return []
  },
})
