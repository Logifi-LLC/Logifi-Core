export function getFlightAwareEnv() {
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
      process.env.FLIGHTAWARE_API_KEY,
      process.env.NUXT_FLIGHTAWARE_API_KEY,
      config.flightAwareApiKey
    ),
    apiBase: pick(
      process.env.FLIGHTAWARE_API_BASE,
      process.env.NUXT_FLIGHTAWARE_API_BASE,
      config.flightAwareApiBase,
      'https://aeroapi.flightaware.com/aeroapi'
    ),
  }
}
