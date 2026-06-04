import { ref, computed, onMounted } from 'vue'
import { PRODUCT_UPDATES, type ProductUpdate } from '~/data/productUpdates'

export const UPDATES_DISMISSED_STORAGE_KEY = 'logifi-updates-dismissed-id'

export function readDismissedUpdateId(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(UPDATES_DISMISSED_STORAGE_KEY)
}

export function writeDismissedUpdateId(id: string): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(UPDATES_DISMISSED_STORAGE_KEY, id)
}

export function isUpdateDismissed(updateId: string, dismissedId: string | null): boolean {
  return dismissedId === updateId
}

export function useProductUpdates() {
  const dismissedId = ref<string | null>(null)

  onMounted(() => {
    dismissedId.value = readDismissedUpdateId()
  })

  const allUpdates = computed((): ProductUpdate[] => PRODUCT_UPDATES)

  const latestUpdate = computed((): ProductUpdate | null => PRODUCT_UPDATES[0] ?? null)

  const isLatestDismissed = computed((): boolean => {
    const latest = latestUpdate.value
    if (!latest) return true
    return isUpdateDismissed(latest.id, dismissedId.value)
  })

  const showLatestBanner = computed((): boolean => {
    return latestUpdate.value !== null && !isLatestDismissed.value
  })

  function dismissLatest(): void {
    const latest = latestUpdate.value
    if (!latest) return
    dismissedId.value = latest.id
    writeDismissedUpdateId(latest.id)
  }

  function restoreLatestBanner(): void {
    dismissedId.value = null
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(UPDATES_DISMISSED_STORAGE_KEY)
    }
  }

  return {
    allUpdates,
    latestUpdate,
    isLatestDismissed,
    showLatestBanner,
    dismissLatest,
    restoreLatestBanner,
  }
}
