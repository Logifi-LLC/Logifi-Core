const clean = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const pick = (...candidates: unknown[]) => {
  for (const c of candidates) {
    const s = clean(c)
    if (s) return s
  }
  return ''
}

import type { DigifiExtractorErrorCode, DigifiProvider } from './digifiExtractorTypes'

/** Stay in the Gemini 3.x line — avoid silent downgrade to 2.x (much weaker for logbook OCR). */
/** Used only when 3.6 Flash hits capacity/outage (429/503/etc.), not for weak OCR. */
const DEFAULT_MODEL_FALLBACKS = ['gemini-3.5-flash']

/** Paid-tier Digifi default (Gemini path). */
export const DEFAULT_GEMINI_DIGIFI_MODEL = 'gemini-3.6-flash'

/** Current Anthropic Sonnet with vision — retired 3.5 snapshots map here. */
export const DEFAULT_CLAUDE_DIGIFI_MODEL = 'claude-sonnet-4-6'

const CLAUDE_MODEL_ALIASES: Record<string, string> = {
  'claude-3.5-sonnet': DEFAULT_CLAUDE_DIGIFI_MODEL,
  'claude-3-5-sonnet': DEFAULT_CLAUDE_DIGIFI_MODEL,
  'claude-3-5-sonnet-20241022': DEFAULT_CLAUDE_DIGIFI_MODEL,
  'claude-3-5-sonnet-20240620': DEFAULT_CLAUDE_DIGIFI_MODEL,
}

export function inferDigifiProvider(modelId: string): DigifiProvider {
  if (/^claude/i.test(modelId.trim())) return 'anthropic'
  return 'gemini'
}

/**
 * Paid-tier default is gemini-3.6-flash.
 * Legacy Pro ids map to 3.5 Flash (not 3.6) so env A/B against 3.5 stays intentional.
 * Do not auto-remap gemini-3.5-flash → 3.6.
 */
export function normalizeDigifiModelId(model: string): string {
  const trimmed = model.trim()
  if (
    trimmed === 'gemini-3.1-pro' ||
    trimmed === 'gemini-3.1-pro-preview'
  ) {
    return 'gemini-3.5-flash'
  }
  const claudeAlias = CLAUDE_MODEL_ALIASES[trimmed.toLowerCase()]
  if (claudeAlias) return claudeAlias
  return trimmed
}

/**
 * Gemini 3.6+ Flash deprecates temperature/topP/topK (ignored now; may 400 later).
 * @see https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash
 */
export function omitsDigifiGeminiSamplingParams(model: string): boolean {
  return /gemini-3\.[67]/i.test(model.trim())
}

/** Flash-Lite is excluded from automatic fallbacks (poor logbook OCR). */
export function isAllowedDigifiFallbackModel(model: string): boolean {
  return !/flash-lite/i.test(model.trim())
}

function parseModelList(value: string): string[] {
  return value
    .split(',')
    .map((part) => normalizeDigifiModelId(part.trim()))
    .filter((part) => part && isAllowedDigifiFallbackModel(part))
}

/** Ordered unique model ids: primary first, then configured/default fallbacks. */
export function buildDigifiModelChain(
  primary: string,
  configuredFallbacks: string[],
  defaultFallbacks: string[]
): string[] {
  const seen = new Set<string>()
  const chain: string[] = []
  for (const model of [primary, ...configuredFallbacks, ...defaultFallbacks]) {
    const trimmed = model.trim()
    if (!trimmed || seen.has(trimmed)) continue
    if (chain.length > 0 && !isAllowedDigifiFallbackModel(trimmed)) continue
    seen.add(trimmed)
    chain.push(trimmed)
  }
  return chain
}

/** Primary gemini-3.6-flash; optional fallbacks when enableCapacityModelFallback is true. */
export function getDigifiModelChain(): string[] {
  const env = getDigifiEnv()
  if (inferDigifiProvider(env.model) === 'anthropic') {
    return [env.model]
  }
  const configuredFallbacks = env.enableCapacityModelFallback ? env.modelFallbacks : []
  const defaultFallbacks = env.enableCapacityModelFallback ? DEFAULT_MODEL_FALLBACKS : []
  return buildDigifiModelChain(env.model, configuredFallbacks, defaultFallbacks)
}

/** Advance model chain only on outage / rate limit — not on truncation or bad OCR. */
export function shouldTryNextDigifiModel(errorCode: DigifiExtractorErrorCode): boolean {
  return errorCode === 'CAPACITY' || errorCode === 'CONFIG'
}

/** OCR: keep internal reasoning low so visible TSV fits maxOutputTokens (thinking shares the budget on 3.x). */
export function resolveDigifiThinkingLevel(
  envLevel?: DigifiGeminiThinkingLevel,
  model?: string
): DigifiGeminiThinkingLevel {
  const level = envLevel ?? 'low'
  if (level === 'high' || level === 'medium') return 'low'
  // Gemini 3.7 only supports low/medium/high — clamp 'minimal' to 'low'
  if (level === 'minimal' && model && /gemini-3\.7/i.test(model)) return 'low'
  return level
}

export function getDigifiEnv() {
  const config = useRuntimeConfig()
  const modelFallbacksRaw = pick(
    process.env.NUXT_DIGIFI_MODEL_FALLBACKS,
    process.env.DIGIFI_MODEL_FALLBACKS,
    config.digifiModelFallbacks
  )
  const capacityFallbackRaw = pick(
    process.env.NUXT_DIGIFI_ENABLE_CAPACITY_MODEL_FALLBACK,
    process.env.DIGIFI_ENABLE_CAPACITY_MODEL_FALLBACK,
    process.env.NUXT_DIGIFI_ENABLE_MODEL_FALLBACK,
    process.env.DIGIFI_ENABLE_MODEL_FALLBACK,
    config.digifiEnableCapacityModelFallback
  )
  return {
    geminiApiKey: pick(
      process.env.GEMINI_API_KEY,
      process.env.NUXT_GEMINI_API_KEY,
      config.geminiApiKey
    ),
    anthropicApiKey: pick(
      process.env.ANTHROPIC_API_KEY,
      process.env.NUXT_ANTHROPIC_API_KEY,
      config.anthropicApiKey
    ),
    model: normalizeDigifiModelId(
      pick(
        process.env.NUXT_DIGIFI_MODEL,
        process.env.DIGIFI_MODEL,
        config.digifiModel
      ) || DEFAULT_GEMINI_DIGIFI_MODEL
    ),
    modelFallbacks: modelFallbacksRaw ? parseModelList(modelFallbacksRaw) : [],
    maxScansPerDay: Math.max(
      1,
      parseInt(
        pick(
          process.env.NUXT_DIGIFI_MAX_SCANS_PER_DAY,
          process.env.DIGIFI_MAX_SCANS_PER_DAY,
          String(config.digifiMaxScansPerDay ?? 10)
        ) || '10',
        10
      )
    ),
    maxImageBytes: 8 * 1024 * 1024,
    /** Upper cap for maxOutputTokens (scaled per page via computeDigifiMaxOutputTokens). */
    geminiMaxOutputTokensCap: Math.min(
      20_000,
      Math.max(
        8192,
        parseInt(
          pick(
            process.env.NUXT_DIGIFI_GEMINI_MAX_OUTPUT_TOKENS,
            process.env.DIGIFI_GEMINI_MAX_OUTPUT_TOKENS,
            '20000'
          ) || '20000',
          10
        )
      )
    ),
    /** When true (default), try gemini-3.5-flash if 3.6 is unavailable (429/503/404). */
    enableCapacityModelFallback:
      capacityFallbackRaw === ''
        ? true
        : capacityFallbackRaw.toLowerCase() === 'true',
    /** When false (default), skip second Gemini call for missing rows. */
    enableRescueScan:
      pick(
        process.env.NUXT_DIGIFI_ENABLE_RESCUE_SCAN,
        process.env.DIGIFI_ENABLE_RESCUE_SCAN,
        'false'
      ).toLowerCase() === 'true',
    geminiMediaResolution:
      pick(
        process.env.NUXT_DIGIFI_GEMINI_MEDIA_RESOLUTION,
        process.env.DIGIFI_GEMINI_MEDIA_RESOLUTION,
        'MEDIA_RESOLUTION_HIGH'
      ) || 'MEDIA_RESOLUTION_HIGH',
    /** Set DIGIFI_SEND_ROW_BANDS=false to stop sending client row-band crops to Gemini. */
    disableRowBandsToGemini:
      pick(
        process.env.NUXT_DIGIFI_SEND_ROW_BANDS,
        process.env.DIGIFI_SEND_ROW_BANDS,
        'true'
      ).toLowerCase() === 'false',
    /**
     * Gemini 3.x thinking_level (REST: generationConfig.thinkingConfig.thinkingLevel).
     * Default "low" — "high" is capped to low so thinking does not exhaust output tokens.
     */
    geminiThinkingLevel: normalizeGeminiThinkingLevel(
      pick(
        process.env.NUXT_DIGIFI_GEMINI_THINKING_LEVEL,
        process.env.DIGIFI_GEMINI_THINKING_LEVEL,
        'low'
      ) || 'low'
    ),
    /** Claude-only OCR tuning (ignored by Gemini path). */
    claudeApiVersion:
      pick(
        process.env.NUXT_DIGIFI_CLAUDE_API_VERSION,
        process.env.DIGIFI_CLAUDE_API_VERSION,
        '2023-06-01'
      ) || '2023-06-01',
    claudeTemperature: parseClaudeTemperature(
      pick(
        process.env.NUXT_DIGIFI_CLAUDE_TEMPERATURE,
        process.env.DIGIFI_CLAUDE_TEMPERATURE,
        '0'
      ) || '0'
    ),
    claudeEnableThinking:
      pick(
        process.env.NUXT_DIGIFI_CLAUDE_ENABLE_THINKING,
        process.env.DIGIFI_CLAUDE_ENABLE_THINKING,
        'false'
      ).toLowerCase() === 'true',
    claudeThinkingBudgetTokens: Math.min(
      8192,
      Math.max(
        1024,
        parseInt(
          pick(
            process.env.NUXT_DIGIFI_CLAUDE_THINKING_BUDGET,
            process.env.DIGIFI_CLAUDE_THINKING_BUDGET,
            '2048'
          ) || '2048',
          10
        )
      )
    ),
    claudeMaxOutputTokensCap: Math.min(
      20_000,
      Math.max(
        8192,
        parseInt(
          pick(
            process.env.NUXT_DIGIFI_CLAUDE_MAX_OUTPUT_TOKENS,
            process.env.DIGIFI_CLAUDE_MAX_OUTPUT_TOKENS,
            pick(
              process.env.NUXT_DIGIFI_GEMINI_MAX_OUTPUT_TOKENS,
              process.env.DIGIFI_GEMINI_MAX_OUTPUT_TOKENS,
              '20000'
            ) || '20000'
          ) || '20000',
          10
        )
      )
    ),
    logRawResponse:
      pick(
        process.env.NUXT_DIGIFI_LOG_RAW_RESPONSE,
        process.env.DIGIFI_LOG_RAW_RESPONSE,
        'false'
      ).toLowerCase() === 'true',
  }
}

export function isDigifiConfigured(env = getDigifiEnv()): boolean {
  const provider = inferDigifiProvider(env.model)
  return provider === 'anthropic' ? !!env.anthropicApiKey : !!env.geminiApiKey
}

/** User-facing hint when the configured model id is invalid or inaccessible. */
export function digifiModelUnavailableMessage(env = getDigifiEnv()): string {
  const provider = inferDigifiProvider(env.model)
  if (provider === 'anthropic') {
    return `The Claude scan model (${env.model}) is not available on this API key. Set NUXT_DIGIFI_MODEL=${DEFAULT_CLAUDE_DIGIFI_MODEL} in .env and restart the dev server.`
  }
  return `The AI scan model is not available on this API key. Restart the dev server after pulling latest config, or set NUXT_DIGIFI_MODEL=${DEFAULT_GEMINI_DIGIFI_MODEL} in .env.`
}

const GEMINI_THINKING_LEVELS = ['minimal', 'low', 'medium', 'high'] as const
export type DigifiGeminiThinkingLevel = (typeof GEMINI_THINKING_LEVELS)[number]

function normalizeGeminiThinkingLevel(value: string): DigifiGeminiThinkingLevel {
  const normalized = value.trim().toLowerCase()
  if ((GEMINI_THINKING_LEVELS as readonly string[]).includes(normalized)) {
    return normalized as DigifiGeminiThinkingLevel
  }
  return 'low'
}

function parseClaudeTemperature(value: string): number {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.min(1, Math.max(0, parsed))
}

/**
 * Gemini 3.x (incl. 3.5 / 3.6 Flash): thinkingConfig.thinkingLevel only — never mix with thinkingBudget.
 * Gemini 2.5: thinkingBudget 0 (2.5 does not use thinkingLevel).
 * @see https://ai.google.dev/gemini-api/docs/thinking
 */
export function buildDigifiThinkingConfig(
  model: string,
  thinkingLevel: DigifiGeminiThinkingLevel
): { thinkingLevel: DigifiGeminiThinkingLevel } | { thinkingBudget: number } {
  if (/gemini-3/i.test(model)) {
    return { thinkingLevel }
  }
  return { thinkingBudget: 0 }
}

/** Scale output budget by page size; avoid a fixed 8192 floor that truncates dense pages when thinking runs. */
export function computeDigifiMaxOutputTokens(
  rowCount: number,
  columnCount: number,
  cap: number
): number {
  const scaled = 2048 + rowCount * Math.max(1, columnCount) * 16
  return Math.min(cap, Math.max(scaled, 12288))
}

export function resolveDigifiMediaResolution(envDefault: string): string {
  return envDefault === 'MEDIA_RESOLUTION_LOW' ? 'MEDIA_RESOLUTION_LOW' : 'MEDIA_RESOLUTION_HIGH'
}
