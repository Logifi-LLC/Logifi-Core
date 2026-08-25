/**
 * AeroDataBox (RapidAPI) env resolution — mirrors fcvEnv pick pattern.
 */
export function getAeroDataBoxEnv() {
  const config = useRuntimeConfig()
  const clean = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
  const pick = (...candidates: unknown[]) => {
    for (const c of candidates) {
      const s = clean(c)
      if (s) return s
    }
    return ''
  }

  return {
    apiKey: pick(
      process.env.AERODATABOX_API_KEY,
      process.env.NUXT_AERODATABOX_API_KEY,
      config.aeroDataBoxApiKey
    ),
    apiHost: pick(
      process.env.AERODATABOX_API_HOST,
      process.env.NUXT_AERODATABOX_API_HOST,
      config.aeroDataBoxApiHost,
      'aerodatabox.p.rapidapi.com'
    ),
  }
}
