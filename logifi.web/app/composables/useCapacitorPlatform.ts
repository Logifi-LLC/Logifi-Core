import { Capacitor } from '@capacitor/core'
import { computed } from 'vue'

export type CapacitorPlatform = 'ios' | 'android' | 'web'

export function getCapacitorPlatform(): CapacitorPlatform {
  if (typeof window === 'undefined') return 'web'
  const platform = Capacitor.getPlatform()
  if (platform === 'ios' || platform === 'android') return platform
  return 'web'
}

export function isCapacitorIos(): boolean {
  return getCapacitorPlatform() === 'ios'
}

export function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false
  return Capacitor.isNativePlatform()
}

/** Clears iOS WebView input-focus zoom after auth forms (inputs must be ≥16px to avoid re-zoom). */
export function resetIosInputZoom(): void {
  if (!isCapacitorIos() || typeof document === 'undefined') return
  ;(document.activeElement as HTMLElement | null)?.blur?.()
  const meta = document.querySelector('meta[name="viewport"]')
  if (!meta) return
  const content = meta.getAttribute('content') ?? ''
  meta.setAttribute('content', `${content}, maximum-scale=1.0`)
  requestAnimationFrame(() => meta.setAttribute('content', content))
}

const platform = computed<CapacitorPlatform>(() => getCapacitorPlatform())
const isNative = computed(() => isCapacitorNative())
const isIos = computed(() => platform.value === 'ios')
const isWeb = computed(() => platform.value === 'web')

export const useCapacitorPlatform = () => ({
  platform,
  isNative,
  isIos,
  isWeb,
})
