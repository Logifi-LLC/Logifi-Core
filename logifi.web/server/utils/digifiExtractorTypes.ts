import type { DigifiScanRow, DigifiScanStrategy } from '../../app/utils/digifiTypes'
import type { DigifiScanMetaInput } from './digifiSchema'

export type DigifiProvider = 'gemini' | 'anthropic'

export type DigifiExtractorErrorCode = 'CAPACITY' | 'CONFIG' | 'INVALID_RESPONSE' | 'UNKNOWN'

/** @deprecated Use DigifiExtractorError */
export type DigifiGeminiErrorCode = DigifiExtractorErrorCode

export class DigifiExtractorError extends Error {
  readonly code: DigifiExtractorErrorCode
  readonly modelsAttempted: string[]

  constructor(
    message: string,
    code: DigifiExtractorErrorCode,
    modelsAttempted: string[] = []
  ) {
    super(message)
    this.name = 'DigifiExtractorError'
    this.code = code
    this.modelsAttempted = modelsAttempted
  }
}

/** @deprecated Use DigifiExtractorError */
export class DigifiGeminiError extends DigifiExtractorError {
  constructor(
    message: string,
    code: DigifiExtractorErrorCode,
    modelsAttempted: string[] = []
  ) {
    super(message, code, modelsAttempted)
    this.name = 'DigifiGeminiError'
  }
}

export interface DigifiImagePart {
  label: string
  imageBase64: string
  mimeType: string
}

export interface ScanLogbookImageOptions {
  imageBase64: string
  mimeType: string
  meta: DigifiScanMetaInput
  chunkImages?: Array<{
    partName: string
    rowStart: number
    rowEnd: number
    imageBase64: string
    mimeType: string
  }>
}

export interface DigifiScanTimings {
  primaryMs: number
  rescueMs: number
  totalMs: number
}

export interface DigifiScanResult {
  rows: DigifiScanRow[]
  modelUsed: string
  providerUsed: DigifiProvider
  strategyUsed: DigifiScanStrategy
  chunkCount: number
  rescueAttempted: boolean
  rescueRecoveredCount: number
  duplicateRowIndices: number[]
  fallbackUsed: boolean
  modelsAttempted: string[]
  apiCallCount: number
  timings: DigifiScanTimings
}

export interface DigifiCallStats {
  apiRequests: number
}
