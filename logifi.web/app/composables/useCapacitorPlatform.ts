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
