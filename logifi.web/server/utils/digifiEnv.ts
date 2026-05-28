const clean = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const pick = (...candidates: unknown[]) => {
  for (const c of candidates) {
    const s = clean(c)
    if (s) return s
  }
  return ''
}

export function getDigifiEnv() {
  const config = useRuntimeConfig()
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
    proModel: pick(
      process.env.NUXT_DIGIFI_PRO_MODEL,
      process.env.DIGIFI_PRO_MODEL,
      config.digifiProModel
    ) || 'gemini-3.1-pro',
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
