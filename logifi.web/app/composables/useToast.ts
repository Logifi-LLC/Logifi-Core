import { ref } from 'vue'

const toastMessage = ref<string | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

export function useToast() {
  const showToast = (message: string, duration = 6000) => {
    toastMessage.value = message
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

  return { toastMessage, showToast, dismissToast }
}
