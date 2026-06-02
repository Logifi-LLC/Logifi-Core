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
const DEFAULT_FLASH_FALLBACKS = ['gemini-3.5-flash', 'gemini-3.1-flash-lite']
/** Pro unavailable → 3.5 Flash (near-Pro per Google), then other 3.x flash tiers. */
const DEFAULT_PRO_FALLBACKS = ['gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.1-flash-lite']

function parseModelList(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
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
    seen.add(trimmed)
    chain.push(trimmed)
  }
  return chain
}

export function getDigifiModelChain(useProModel: boolean): string[] {
  const env = getDigifiEnv()
  if (useProModel) {
    return buildDigifiModelChain(env.proModel, env.proModelFallbacks, DEFAULT_PRO_FALLBACKS)
  }
  return buildDigifiModelChain(env.model, env.modelFallbacks, DEFAULT_FLASH_FALLBACKS)
}

export function getDigifiEnv() {
  const config = useRuntimeConfig()
  const modelFallbacksRaw = pick(
    process.env.NUXT_DIGIFI_MODEL_FALLBACKS,
    process.env.DIGIFI_MODEL_FALLBACKS,
    config.digifiModelFallbacks
  )
  const proModelFallbacksRaw = pick(
    process.env.NUXT_DIGIFI_PRO_MODEL_FALLBACKS,
    process.env.DIGIFI_PRO_MODEL_FALLBACKS,
    config.digifiProModelFallbacks
  )
  return {
    geminiApiKey: pick(
      process.env.GEMINI_API_KEY,
      process.env.NUXT_GEMINI_API_KEY,
      config.geminiApiKey
    ),
    model: pick(
      process.env.NUXT_DIGIFI_MODEL,
      process.env.DIGIFI_MODEL,
      config.digifiModel
    ) || 'gemini-3-flash-preview',
    modelFallbacks: modelFallbacksRaw ? parseModelList(modelFallbacksRaw) : [],
    proModel: pick(
      process.env.NUXT_DIGIFI_PRO_MODEL,
      process.env.DIGIFI_PRO_MODEL,
      config.digifiProModel
    ) || 'gemini-3.1-pro',
    proModelFallbacks: proModelFallbacksRaw ? parseModelList(proModelFallbacksRaw) : [],
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
            '8192'
          ) || '8192',
          10
        )
      )
    ),
    geminiMediaResolution:
      pick(
        process.env.NUXT_DIGIFI_GEMINI_MEDIA_RESOLUTION,
        process.env.DIGIFI_GEMINI_MEDIA_RESOLUTION,
        'MEDIA_RESOLUTION_MEDIUM'
      ) || 'MEDIA_RESOLUTION_MEDIUM',
    /** Set DIGIFI_SEND_ROW_BANDS=false to stop sending client row-band crops to Gemini. */
    disableRowBandsToGemini:
      pick(
        process.env.NUXT_DIGIFI_SEND_ROW_BANDS,
        process.env.DIGIFI_SEND_ROW_BANDS,
        'true'
      ).toLowerCase() === 'false',
    /**
     * Gemini 3.x thinking_level (REST: generationConfig.thinkingConfig.thinkingLevel).
     * Use "low" for OCR — enough reasoning for row/column alignment without default "medium" cost.
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

/** Scale output budget by page size; visible TSV shares cap with thinking when level is not minimal. */
export function computeDigifiMaxOutputTokens(
  rowCount: number,
  columnCount: number,
  cap: number
): number {
  const scaled = 1024 + rowCount * Math.max(1, columnCount) * 12
  return Math.min(cap, Math.max(8192, scaled))
}

export function resolveDigifiMediaResolution(
  useProModel: boolean,
  envDefault: string
): string {
  if (useProModel) return 'MEDIA_RESOLUTION_HIGH'
  return envDefault
}
