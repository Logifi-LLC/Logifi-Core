import type { DigifiExtractorErrorCode } from './digifiExtractorTypes'
import { getSupabaseServiceClient } from './supabaseService'
import { sanitizeDigifiColumnCorrectionCounts } from '../../shared/digifiColumnCorrectionCounts'

export type DigifiScanEventStatus = 'ok' | 'error' | 'import'

export interface DigifiScanEventContext {
  userId: string
  scanSessionId: string
  spreadId: string
  pageSide: 'left' | 'right'
}

export interface DigifiGeminiCallEventInput {
  context: DigifiScanEventContext
  model: string
  promptTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
  latencyMs: number
  status: 'ok' | 'error'
  errorCode?: DigifiExtractorErrorCode | null
}

export interface DigifiImportCorrectionsEventInput {
  userId: string
  spreadId: string
  columnCorrections: Record<string, number>
}

/** Approximate Gemini list pricing for analytics (USD per 1M tokens). */
const FLASH_INPUT_USD_PER_M = 0.15
const FLASH_OUTPUT_USD_PER_M = 0.6
const PRO_INPUT_USD_PER_M = 1.25
const PRO_OUTPUT_USD_PER_M = 5

export function estimateGeminiCostUsd(
  model: string,
  promptTokens: number,
  outputTokens: number
): string {
  const flash = /flash/i.test(model)
  const inputRate = flash ? FLASH_INPUT_USD_PER_M : PRO_INPUT_USD_PER_M
  const outputRate = flash ? FLASH_OUTPUT_USD_PER_M : PRO_OUTPUT_USD_PER_M
  const cost = (promptTokens * inputRate + outputTokens * outputRate) / 1_000_000
  return cost.toFixed(8)
}

export async function insertDigifiScanEvent(row: {
  user_id: string
  scan_session_id?: string | null
  spread_id?: string | null
  page_side?: 'left' | 'right' | null
  model?: string | null
  prompt_tokens?: number | null
  output_tokens?: number | null
  total_tokens?: number | null
  estimated_cost_usd?: string | null
  latency_ms?: number | null
  status: DigifiScanEventStatus
  error_code?: string | null
  column_corrections?: Record<string, number> | null
}): Promise<void> {
  const service = getSupabaseServiceClient()
  if (!service) return

  const { error } = await (service.from('digifi_scan_events') as any).insert(row)
  if (error) {
    console.warn('[digifi-scan-events] insert failed:', error.message)
  }
}

export async function recordDigifiGeminiCallEvent(input: DigifiGeminiCallEventInput): Promise<void> {
  const prompt = input.promptTokens ?? 0
  const output = input.outputTokens ?? 0
  const estimated =
    input.status === 'ok' && input.promptTokens != null && input.outputTokens != null
      ? estimateGeminiCostUsd(input.model, prompt, output)
      : null

  await insertDigifiScanEvent({
    user_id: input.context.userId,
    scan_session_id: input.context.scanSessionId,
    spread_id: input.context.spreadId,
    page_side: input.context.pageSide,
    model: input.model,
    prompt_tokens: input.promptTokens,
    output_tokens: input.outputTokens,
    total_tokens: input.totalTokens,
    estimated_cost_usd: estimated,
    latency_ms: input.latencyMs,
    status: input.status,
    error_code: input.errorCode ?? null,
    column_corrections: null,
  })
}

export async function recordDigifiImportCorrectionsEvent(
  input: DigifiImportCorrectionsEventInput
): Promise<void> {
  const columnCorrections = sanitizeDigifiColumnCorrectionCounts(input.columnCorrections)
  if (!columnCorrections) return

  await insertDigifiScanEvent({
    user_id: input.userId,
    scan_session_id: null,
    spread_id: input.spreadId,
    page_side: null,
    model: null,
    prompt_tokens: null,
    output_tokens: null,
    total_tokens: null,
    estimated_cost_usd: null,
    latency_ms: null,
    status: 'import',
    error_code: null,
    column_corrections: columnCorrections,
  })
}

/** Fire-and-forget: never throws to callers. */
export function logDigifiGeminiCallEventSafe(input: DigifiGeminiCallEventInput): void {
  void recordDigifiGeminiCallEvent(input).catch((error) => {
    console.warn('[digifi-scan-events] gemini log failed:', error)
  })
}

/** Fire-and-forget: never throws to callers. */
export function logDigifiImportCorrectionsEventSafe(input: DigifiImportCorrectionsEventInput): void {
  void recordDigifiImportCorrectionsEvent(input).catch((error) => {
    console.warn('[digifi-scan-events] import corrections log failed:', error)
  })
}
