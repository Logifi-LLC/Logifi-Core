import { analyzeDigifiScanRows } from '../../app/utils/digifiScanDiagnostics'
import type { DigifiScanRow, DigifiScanStrategy } from '../../app/utils/digifiTypes'
import type { DigifiTemplateColumn } from '../../app/utils/digifiTypes'
import type { DigifiScanMetaInput } from './digifiSchema'
import {
  getDigifiEnv,
  getDigifiModelChain,
  shouldTryNextDigifiModel,
} from './digifiEnv'
import type {
  DigifiCallStats,
  DigifiImagePart,
  DigifiProvider,
  DigifiScanResult,
  DigifiScanTimings,
} from './digifiExtractorTypes'
import { DigifiExtractorError } from './digifiExtractorTypes'
import { buildScanPrompt } from './digifiPrompt'
import { mergePrimaryAndRescueRows, mergeRowsByIndex } from './digifiScanMerge'
import { countRowsWithCells, isScanResponseIncomplete } from './digifiScanValidation'

export interface LabeledChunk extends DigifiImagePart {
  rowStart: number
  rowEnd: number
}

export type DigifiRowsCaller = (
  models: string[],
  prompt: string,
  overviewImage: DigifiImagePart,
  chunkImages: DigifiImagePart[],
  allowedColumnIds: Set<string>,
  maxRowCount: number,
  focusRows: Set<number> | undefined,
  options?: { allowFallbackOnInvalidResponse?: boolean; callStats?: DigifiCallStats }
) => Promise<{ rows: DigifiScanRow[]; modelUsed: string }>

export interface RunDigifiScanOrchestrationOptions {
  meta: DigifiScanMetaInput
  targetColumns: DigifiTemplateColumn[]
  chunkImages: Array<{ rowStart: number; rowEnd: number; imageBase64: string; mimeType: string }>
  overviewImage: DigifiImagePart
  labeledChunks: LabeledChunk[]
  providerUsed: DigifiProvider
  callRows: DigifiRowsCaller
  logLabel: string
}

export async function runDigifiScanOrchestration(
  options: RunDigifiScanOrchestrationOptions
): Promise<DigifiScanResult> {
  const startedAt = Date.now()
  const env = getDigifiEnv()
  const {
    meta,
    targetColumns,
    chunkImages,
    overviewImage,
    labeledChunks,
    providerUsed,
    callRows,
    logLabel,
  } = options

  const allowedColumnIds = new Set(targetColumns.map((column) => column.id))
  const modelChain = getDigifiModelChain()
  const sendRowBands = labeledChunks.length > 0 && !env.disableRowBandsToGemini
  const strategyUsed: DigifiScanStrategy = sendRowBands ? 'page-overview+row-bands' : 'page-overview'
  const callStats: DigifiCallStats = { apiRequests: 0 }

  const apiChunks: DigifiImagePart[] = labeledChunks.map((chunk) => ({
    label: chunk.label,
    imageBase64: chunk.imageBase64,
    mimeType: chunk.mimeType,
  }))

  let modelUsed = modelChain[0]
  let fallbackUsed = false
  const modelsAttempted = new Set<string>()
  let rescueAttempted = false
  let rescueRecoveredCount = 0
  let primaryMs = 0
  let rescueMs = 0
  let finalRows: DigifiScanRow[] = []
  let duplicateRowIndices = new Set<number>()

  const buildPromptForScan = (focusRows?: number[]) =>
    buildScanPrompt(meta, targetColumns, {
      includeRowBands: sendRowBands,
      chunkImages: labeledChunks,
      focusRows,
    })

  const runModelChainFallback = async () => {
    if (!env.enableCapacityModelFallback) {
      console.warn('[digifi] capacity model fallback disabled — keeping primary scan result')
      return
    }
    const fallbackModels = modelChain.slice(1)
    if (fallbackModels.length === 0) {
      console.warn('[digifi] skipping model fallback — no alternate models after primary')
      return
    }
    console.warn(`[digifi] primary model unavailable, trying ${fallbackModels.join(' → ')}`)
    rescueAttempted = true
    const rescueStartedAt = Date.now()
    const fallbackResult = await callRows(
      fallbackModels,
      buildPromptForScan(),
      overviewImage,
      apiChunks,
      allowedColumnIds,
      meta.rowCount,
      undefined,
      { callStats }
    )
    modelUsed = fallbackResult.modelUsed
    modelsAttempted.add(fallbackResult.modelUsed)
    fallbackUsed = fallbackResult.modelUsed !== modelChain[0]
    const fallbackMerged = mergeRowsByIndex(fallbackResult.rows)
    finalRows = fallbackMerged.rows
    duplicateRowIndices = new Set(fallbackMerged.duplicateRowIndices)
    rescueMs += Date.now() - rescueStartedAt
  }

  const primaryStartedAt = Date.now()
  try {
    const primaryResult = await callRows(
      [modelChain[0]],
      buildPromptForScan(),
      overviewImage,
      apiChunks,
      allowedColumnIds,
      meta.rowCount,
      undefined,
      { allowFallbackOnInvalidResponse: false, callStats }
    )
    modelUsed = primaryResult.modelUsed
    modelsAttempted.add(primaryResult.modelUsed)
    const primaryMerged = mergeRowsByIndex(primaryResult.rows)
    finalRows = primaryMerged.rows
    duplicateRowIndices = new Set(primaryMerged.duplicateRowIndices)
    if (isScanResponseIncomplete(finalRows, meta.rowCount)) {
      console.warn(
        `[digifi] primary scan incomplete (${countRowsWithCells(finalRows)}/${meta.rowCount} rows); not retrying with alternate model`
      )
    }
  } catch (error) {
    if (!(error instanceof DigifiExtractorError)) {
      throw error
    }
    if (shouldTryNextDigifiModel(error.code)) {
      await runModelChainFallback()
    } else {
      throw error
    }
  } finally {
    primaryMs = Date.now() - primaryStartedAt
  }

  const primaryDiagnostics = analyzeDigifiScanRows(finalRows, meta.rowCount)
  if (env.enableRescueScan && primaryDiagnostics.missingRowIndices.length > 0) {
    rescueAttempted = true
    const focusRows = primaryDiagnostics.missingRowIndices
    const rescueStartedAt = Date.now()
    const rescueResult = await callRows(
      [modelChain[0]],
      buildPromptForScan(focusRows),
      overviewImage,
      sendRowBands
        ? labeledChunks
            .filter((chunk) =>
              focusRows.some((row) => row >= chunk.rowStart && row <= chunk.rowEnd)
            )
            .map((chunk) => ({
              label: chunk.label,
              imageBase64: chunk.imageBase64,
              mimeType: chunk.mimeType,
            }))
        : [],
      allowedColumnIds,
      meta.rowCount,
      new Set(focusRows),
      { callStats }
    )
    modelsAttempted.add(rescueResult.modelUsed)
    if (rescueResult.modelUsed !== modelChain[0]) fallbackUsed = true
    if (rescueResult.modelUsed !== modelUsed) {
      console.info(
        `[digifi] rescue scan used ${rescueResult.modelUsed} (primary used ${modelUsed})`
      )
    }
    const rescueMerged = mergeRowsByIndex(rescueResult.rows)
    finalRows = mergePrimaryAndRescueRows(finalRows, rescueMerged.rows)
    for (const rowIndex of rescueMerged.duplicateRowIndices) {
      duplicateRowIndices.add(rowIndex)
    }
    const finalDiagnostics = analyzeDigifiScanRows(finalRows, meta.rowCount)
    rescueRecoveredCount = focusRows.filter(
      (rowIndex) => !finalDiagnostics.missingRowIndices.includes(rowIndex)
    ).length
    rescueMs += Date.now() - rescueStartedAt
  } else if (primaryDiagnostics.missingRowIndices.length > 0) {
    console.warn(
      `[digifi] ${primaryDiagnostics.missingRowIndices.length} missing row(s); rescue scan disabled (one API call per page)`
    )
  }

  const apiCallCount = callStats.apiRequests
  console.info(`[digifi] ${logLabel} API calls this page:`, apiCallCount, {
    provider: providerUsed,
    models: [...modelsAttempted],
  })

  const timings: DigifiScanTimings = {
    primaryMs,
    rescueMs,
    totalMs: Date.now() - startedAt,
  }

  return {
    rows: finalRows,
    modelUsed,
    providerUsed,
    strategyUsed,
    chunkCount: chunkImages.length,
    rescueAttempted,
    rescueRecoveredCount,
    duplicateRowIndices: [...duplicateRowIndices].sort((a, b) => a - b),
    fallbackUsed,
    modelsAttempted: [...modelsAttempted],
    apiCallCount,
    timings,
  }
}
