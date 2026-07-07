import { ref, onMounted, onUnmounted, nextTick, type ComputedRef, type Ref } from 'vue'
import { isCapacitorIos } from '~/composables/useCapacitorPlatform'

const PULL_THRESHOLD = 70
const MAX_PULL = 120

export type PullToRefreshOptions = {
  onRefresh: () => Promise<void>
  disabled?: Ref<boolean> | ComputedRef<boolean>
  scrollContainerRef?: Ref<HTMLElement | null>
}

export function usePullToRefresh(options: PullToRefreshOptions) {
  const pullDistance = ref(0)
  const isPulling = ref(false)
  const isRefreshing = ref(false)

  let touchStartY = 0
  let touchStartX = 0
  let tracking = false
  let touchTarget: HTMLElement | Document | null = null

  function getScrollTop(): number {
    if (typeof window === 'undefined') return 0
    const container = options.scrollContainerRef?.value
    if (container) return container.scrollTop
    return window.scrollY || document.documentElement.scrollTop
  }

  function isDisabled(): boolean {
    return options.disabled?.value ?? false
  }

  function resetPull() {
    pullDistance.value = 0
    isPulling.value = false
    tracking = false
  }

  function onTouchStart(e: TouchEvent) {
    if (!isCapacitorIos() || isRefreshing.value || isDisabled()) return
    if (getScrollTop() > 0) return

    const touch = e.touches[0]
    if (!touch) return

    touchStartY = touch.clientY
    touchStartX = touch.clientX
    tracking = true
    isPulling.value = false
  }

  function onTouchMove(e: TouchEvent) {
    if (!tracking || isRefreshing.value || isDisabled()) return
    if (getScrollTop() > 0) {
      resetPull()
      return
    }

    const touch = e.touches[0]
    if (!touch) return

    const dx = touch.clientX - touchStartX
    const dy = touch.clientY - touchStartY

    if (dy <= 0) {
      resetPull()
      return
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      resetPull()
      return
    }

    isPulling.value = true
    e.preventDefault()
    pullDistance.value = Math.min(dy, MAX_PULL)
  }

  async function onTouchEnd() {
    if (!tracking) return

    const shouldRefresh = pullDistance.value >= PULL_THRESHOLD && !isDisabled()

    if (shouldRefresh) {
      isRefreshing.value = true
      pullDistance.value = PULL_THRESHOLD
      try {
        await options.onRefresh()
      } finally {
        isRefreshing.value = false
        resetPull()
      }
    } else {
      resetPull()
    }
  }

  onMounted(async () => {
    if (!isCapacitorIos()) return

    await nextTick()
    touchTarget = options.scrollContainerRef?.value ?? document

    touchTarget.addEventListener('touchstart', onTouchStart, { passive: true })
    touchTarget.addEventListener('touchmove', onTouchMove, { passive: false })
    touchTarget.addEventListener('touchend', onTouchEnd, { passive: true })
    touchTarget.addEventListener('touchcancel', onTouchEnd, { passive: true })
  })

  onUnmounted(() => {
    if (!isCapacitorIos() || !touchTarget) return

    touchTarget.removeEventListener('touchstart', onTouchStart)
    touchTarget.removeEventListener('touchmove', onTouchMove)
    touchTarget.removeEventListener('touchend', onTouchEnd)
    touchTarget.removeEventListener('touchcancel', onTouchEnd)
    touchTarget = null
  })

  return {
    pullDistance,
    isPulling,
    isRefreshing,
  }
}
