import { onMounted, onUnmounted, type Ref } from 'vue'
import { isCapacitorIos } from '~/composables/useCapacitorPlatform'

const EDGE_ZONE_PX = 24
const SWIPE_THRESHOLD_PX = 60

export type DrawerGesturesOptions = {
  side: 'left' | 'right'
  isOpen: Ref<boolean>
  drawerEl: Ref<HTMLElement | null>
  onOpen?: () => void
  onClose: () => void
}

export function useDrawerGestures(options: DrawerGesturesOptions): void {
  let touchStartX = 0
  let touchStartY = 0
  let tracking = false
  let mode: 'open' | 'close' | null = null

  function resetTouch() {
    tracking = false
    mode = null
  }

  function onTouchStart(e: TouchEvent) {
    if (!isCapacitorIos()) return

    const touch = e.touches[0]
    if (!touch) return

    touchStartX = touch.clientX
    touchStartY = touch.clientY
    tracking = true

    if (options.side === 'left') {
      if (!options.isOpen.value && touch.clientX <= EDGE_ZONE_PX) {
        mode = 'open'
        return
      }

      if (options.isOpen.value && options.drawerEl.value?.contains(e.target as Node)) {
        mode = 'close'
        return
      }
    } else if (options.isOpen.value && options.drawerEl.value?.contains(e.target as Node)) {
      mode = 'close'
      return
    }

    resetTouch()
  }

  function onTouchMove(e: TouchEvent) {
    if (!tracking || !mode) return

    const touch = e.touches[0]
    if (!touch) return

    const dx = touch.clientX - touchStartX
    const dy = touch.clientY - touchStartY

    if (Math.abs(dy) > Math.abs(dx)) {
      resetTouch()
      return
    }

    if (options.side === 'left') {
      if (mode === 'open' && dx >= SWIPE_THRESHOLD_PX) {
        options.onOpen?.()
        resetTouch()
      } else if (mode === 'close' && dx <= -SWIPE_THRESHOLD_PX) {
        options.onClose()
        resetTouch()
      }
    } else if (mode === 'close' && dx >= SWIPE_THRESHOLD_PX) {
      options.onClose()
      resetTouch()
    }
  }

  function onTouchEnd() {
    resetTouch()
  }

  onMounted(() => {
    if (!isCapacitorIos()) return

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    document.addEventListener('touchcancel', onTouchEnd, { passive: true })
  })

  onUnmounted(() => {
    if (!isCapacitorIos()) return

    document.removeEventListener('touchstart', onTouchStart)
    document.removeEventListener('touchmove', onTouchMove)
    document.removeEventListener('touchend', onTouchEnd)
    document.removeEventListener('touchcancel', onTouchEnd)
  })
}
