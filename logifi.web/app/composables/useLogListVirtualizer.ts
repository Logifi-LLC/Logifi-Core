import { computed, type ComputedRef, type Ref } from 'vue'
import { useVirtualizer, useWindowVirtualizer } from '@tanstack/vue-virtual'
import { getVirtualPadding, LOG_LIST_OVERSCAN } from '../utils/logListVirtual'

type CountSource = Ref<number> | ComputedRef<number>
type FlagSource = Ref<boolean> | ComputedRef<boolean>
type ElementSource = Ref<HTMLElement | null> | ComputedRef<HTMLElement | null>

export function useLogListVirtualizer(options: {
  count: CountSource
  isIos: FlagSource
  scrollParent: ElementSource
  estimateSize: number
  scrollMarginElement?: ElementSource
}) {
  const elementVirtualizer = useVirtualizer(
    computed(() => ({
      count: options.count.value,
      getScrollElement: () => options.scrollParent.value,
      estimateSize: () => options.estimateSize,
      overscan: LOG_LIST_OVERSCAN,
    }))
  )

  const windowVirtualizer = useWindowVirtualizer(
    computed(() => {
      const el = options.scrollMarginElement?.value ?? null
      const scrollMargin =
        el && typeof window !== 'undefined'
          ? el.getBoundingClientRect().top + window.scrollY
          : 0
      return {
        count: options.count.value,
        estimateSize: () => options.estimateSize,
        overscan: LOG_LIST_OVERSCAN,
        scrollMargin,
      }
    })
  )

  const active = computed(() =>
    options.isIos.value ? elementVirtualizer.value : windowVirtualizer.value
  )

  const virtualItems = computed(() => active.value.getVirtualItems())
  const totalSize = computed(() => active.value.getTotalSize())
  const scrollMargin = computed(() =>
    options.isIos.value ? 0 : (windowVirtualizer.value.options.scrollMargin ?? 0)
  )
  const padding = computed(() =>
    getVirtualPadding(virtualItems.value, totalSize.value, scrollMargin.value)
  )

  function scrollToIndex(index: number): void {
    active.value.scrollToIndex(index)
  }

  return {
    virtualItems,
    totalSize,
    padding,
    scrollToIndex,
  }
}
