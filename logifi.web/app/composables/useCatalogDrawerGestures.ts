import type { Ref } from 'vue'
import { useDrawerGestures } from '~/composables/useDrawerGestures'

type CatalogDrawerGesturesOptions = {
  isOpen: Ref<boolean>
  drawerEl: Ref<HTMLElement | null>
  onOpen: () => void
  onClose: () => void
}

export function useCatalogDrawerGestures(options: CatalogDrawerGesturesOptions): void {
  useDrawerGestures({
    side: 'left',
    isOpen: options.isOpen,
    drawerEl: options.drawerEl,
    onOpen: options.onOpen,
    onClose: options.onClose,
  })
}
