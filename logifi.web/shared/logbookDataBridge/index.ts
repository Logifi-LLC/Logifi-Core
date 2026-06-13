import type { BridgeImportOptions, BridgeParseResult, ExportBuildOptions, ExportResult } from './types'
import { detectSourceFromContent } from './sourceDetector'
import { ingestBridgeFile } from './importService'
import {
  exportToForeFlight,
  exportToGenericCSV,
  exportToLogifiNative,
  exportToLogTenPro,
  exportToMyFlightbook,
} from './exportService'

export const logbookDataBridgeService = {
  detectSource: detectSourceFromContent,
  ingestFile: (content: string, options?: BridgeImportOptions): BridgeParseResult =>
    ingestBridgeFile(content, options),
  exportToForeFlight,
  exportToMyFlightbook,
  exportToGenericCSV,
  exportToLogTenPro,
  exportToLogifiNative,
}

export type { BridgeImportOptions, BridgeParseResult, BridgeSource, ExportBuildOptions, ExportResult }
export {
  EXPORT_DESTINATION_HINTS,
  EXPORT_DESTINATION_LABELS,
} from './types'

export * from './formatters'
export * from './fileParser'
export * from './sourceDetector'
export * from './importMappers'
export * from './importService'
export * from './exportMappers'
export * from './exportService'
