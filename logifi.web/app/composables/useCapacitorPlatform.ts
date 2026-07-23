import { Capacitor } from '@capacitor/core'
import { computed } from 'vue'

export type CapacitorPlatform = 'ios' | 'android' | 'web'

const NATIVE_VIEWPORT_BASE =
  'width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no'

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

/** Lock pinch/focus zoom on native WebViews and mark html for iOS CSS. */
export function lockNativeViewportZoom(): void {
  if (!isCapacitorNative() || typeof document === 'undefined') return
  if (isCapacitorIos()) {
    document.documentElement.classList.add('capacitor-ios')
  }
  const meta = document.querySelector('meta[name="viewport"]')
  if (!meta) return
  meta.setAttribute('content', NATIVE_VIEWPORT_BASE)
}

/**
 * Clears iOS WebView input-focus zoom after forms.
 * Re-applies the locked native viewport (does not unlock scale).
 */
export function resetIosInputZoom(): void {
  if (!isCapacitorIos() || typeof document === 'undefined') return
  ;(document.activeElement as HTMLElement | null)?.blur?.()
  lockNativeViewportZoom()
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
