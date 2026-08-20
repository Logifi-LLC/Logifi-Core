import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastOptions {
  type?: ToastType
  duration?: number
}

const DEFAULT_DURATION = 6000

const toastMessage = ref<string | null>(null)
const toastType = ref<ToastType>('info')
let toastTimer: ReturnType<typeof setTimeout> | null = null

function isToastOptions(value: unknown): value is ToastOptions {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function useToast() {
  const showToast = (
    message: string,
    durationOrOptions: number | ToastOptions = DEFAULT_DURATION,
    type?: ToastType
  ) => {
    let duration = DEFAULT_DURATION
    let nextType: ToastType = 'info'

    if (typeof durationOrOptions === 'number') {
      duration = durationOrOptions
      if (type) nextType = type
    } else if (isToastOptions(durationOrOptions)) {
      duration = durationOrOptions.duration ?? DEFAULT_DURATION
      nextType = durationOrOptions.type ?? 'info'
    }

    toastMessage.value = message
    toastType.value = nextType
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => {
      toastMessage.value = null
      toastTimer = null
    }, duration)
  }

  const dismissToast = () => {
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = null
    toastMessage.value = null
  }

  return { toastMessage, toastType, showToast, dismissToast }
}
