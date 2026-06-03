const clean = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const pick = (...candidates: unknown[]) => {
  for (const c of candidates) {
    const s = clean(c)
    if (s) return s
  }
  return ''
}

export type DigifiGeminiErrorCode = 'CAPACITY' | 'CONFIG' | 'INVALID_RESPONSE' | 'UNKNOWN'

export class DigifiGeminiError extends Error {
  readonly code: DigifiGeminiErrorCode
  readonly modelsAttempted: string[]

  constructor(
    message: string,
    code: DigifiGeminiErrorCode,
    modelsAttempted: string[] = []
  ) {
    super(message)
    this.name = 'DigifiGeminiError'
    this.code = code
    this.modelsAttempted = modelsAttempted
  }
}

/** Stay in the Gemini 3.x line — avoid silent downgrade to 2.x (much weaker for logbook OCR). */
/** Used only when 3.5 Flash hits capacity/outage (429/503/etc.), not for weak OCR. */
const DEFAULT_MODEL_FALLBACKS = ['gemini-3-flash-preview']

/** Paid-tier default is gemini-3.5-flash; map legacy Pro ids to 3.5 Flash. */
export function normalizeDigifiModelId(model: string): string {
  const trimmed = model.trim()
  if (
    trimmed === 'gemini-3.1-pro' ||
    trimmed === 'gemini-3.1-pro-preview'
  ) {
    return 'gemini-3.5-flash'
  }
  return trimmed
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

/** Primary gemini-3.5-flash; optional fallbacks when enableCapacityModelFallback is true. */
export function getDigifiModelChain(): string[] {
  const env = getDigifiEnv()
  const configuredFallbacks = env.enableCapacityModelFallback ? env.modelFallbacks : []
  const defaultFallbacks = env.enableCapacityModelFallback ? DEFAULT_MODEL_FALLBACKS : []
  return buildDigifiModelChain(env.model, configuredFallbacks, defaultFallbacks)
}

/** Advance model chain only on outage / rate limit — not on truncation or bad OCR. */
export function shouldTryNextDigifiModel(errorCode: DigifiGeminiErrorCode): boolean {
  return errorCode === 'CAPACITY' || errorCode === 'CONFIG'
}

/** OCR: keep internal reasoning low so visible TSV fits maxOutputTokens (thinking shares the budget on 3.x). */
export function resolveDigifiThinkingLevel(
  envLevel?: DigifiGeminiThinkingLevel
): DigifiGeminiThinkingLevel {
  const level = envLevel ?? 'low'
  if (level === 'high' || level === 'medium') return 'low'
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
    model: normalizeDigifiModelId(
      pick(
        process.env.NUXT_DIGIFI_MODEL,
        process.env.DIGIFI_MODEL,
        config.digifiModel
      ) || 'gemini-3.5-flash'
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
    /** When true (default), try gemini-3-flash-preview if 3.5 is unavailable (429/503/404). */
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
  }
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

/**
 * Gemini 3.x (incl. 3.5 Flash): thinkingConfig.thinkingLevel only — never mix with thinkingBudget.
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
