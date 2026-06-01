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

const DEFAULT_FLASH_FALLBACKS = ['gemini-2.5-flash', 'gemini-2.0-flash']
const DEFAULT_PRO_FALLBACKS = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash']

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
    ) || 'gemini-3.5-flash',
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
  }
}
