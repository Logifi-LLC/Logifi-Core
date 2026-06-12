import { onMounted, onUnmounted, type ComputedRef, type Ref } from 'vue'
import { isCapacitorIos } from '~/composables/useCapacitorPlatform'

const EDGE_ZONE_PX = 24
const SWIPE_THRESHOLD_PX = 60

type Options = {
  shellRef: Ref<HTMLElement | null>
  isOpen: ComputedRef<boolean>
  canPop: ComputedRef<boolean>
  onPop: () => void
}

export function useSettingsSwipeBack(options: Options): void {
  let touchStartX = 0
  let touchStartY = 0
  let tracking = false

  function resetTouch() {
    tracking = false
  }

  function onTouchStart(e: TouchEvent) {
    if (!isCapacitorIos() || !options.isOpen.value || !options.canPop.value) return

    const touch = e.touches[0]
    if (!touch || touch.clientX > EDGE_ZONE_PX) return

    touchStartX = touch.clientX
    touchStartY = touch.clientY
    tracking = true
  }

  function onTouchMove(e: TouchEvent) {
    if (!tracking) return

    const touch = e.touches[0]
    if (!touch) return

    const dx = touch.clientX - touchStartX
    const dy = touch.clientY - touchStartY

    if (Math.abs(dy) > Math.abs(dx)) {
      resetTouch()
      return
    }

    if (dx >= SWIPE_THRESHOLD_PX) {
      options.onPop()
      resetTouch()
    }
  }

  function onTouchEnd() {
    resetTouch()
  }

  onMounted(() => {
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
  })

  onUnmounted(() => {
    document.removeEventListener('touchstart', onTouchStart)
    document.removeEventListener('touchmove', onTouchMove)
    document.removeEventListener('touchend', onTouchEnd)
  })
}
