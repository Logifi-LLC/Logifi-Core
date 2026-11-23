import { inject } from '@vercel/analytics'
import { isCapacitorNative } from '~/composables/useCapacitorPlatform'

/** Vercel Web Analytics page views — web deployment only (not Capacitor iOS/Android). */
export default defineNuxtPlugin(() => {
  if (isCapacitorNative()) return
  inject()
})