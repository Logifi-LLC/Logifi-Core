import { ensureAirportClientDbLoaded } from '../../shared/airportClientDb'

/** Start airport catalog fetch after first paint — not on the critical JS parse path. */
export default defineNuxtPlugin((nuxtApp) => {
  const start = () => {
    void ensureAirportClientDbLoaded().catch((err) => {
      console.warn('[airports] Client catalog preload failed:', err)
    })
  }

  nuxtApp.hook('app:mounted', () => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(start, { timeout: 4000 })
    } else {
      window.setTimeout(start, 0)
    }
  })
})
