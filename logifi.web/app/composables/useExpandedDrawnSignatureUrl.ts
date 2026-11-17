import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import {
  drawnSignatureUrlCacheKey,
  resolveDrawnSignatureUrlCached,
} from '../utils/drawnSignatureUrlResolve'
import { shouldAttemptDrawnSignatureLoad } from '../utils/drawnSignatureImageLoad'

export type ExpandedDrawnSignatureMeta = {
  sign_method?: string | null
  drawn_signature_url?: string | null
} | null

export function useExpandedDrawnSignatureUrl(options: {
  expandedEntryId: Ref<string | null>
  isExpandedEntrySigned: ComputedRef<boolean>
  expandedSignatureMeta: ComputedRef<ExpandedDrawnSignatureMeta>
  resolveUrl: (entryId: string, storagePath: string) => Promise<string | null>
}) {
  const expandedGuestSignatureUrl = ref<string | null>(null)
  const expandedDrawnSignatureResolved = ref(false)

  const expandedDrawnSignaturePath = computed(
    () => options.expandedSignatureMeta.value?.drawn_signature_url?.trim() ?? ''
  )
  const expandedDrawnSignatureMethod = computed(
    () => options.expandedSignatureMeta.value?.sign_method ?? ''
  )

  const expandedDrawnSignatureAttempted = computed(
    () =>
      options.isExpandedEntrySigned.value &&
      shouldAttemptDrawnSignatureLoad(true, options.expandedSignatureMeta.value)
  )

  let lastResolveKey = ''
  let latestRefreshId = 0

  async function refreshExpandedDrawnSignatureUrl(): Promise<void> {
    const refreshId = ++latestRefreshId
    const id = options.expandedEntryId.value
    const meta = options.expandedSignatureMeta.value
    const signed = options.isExpandedEntrySigned.value
    const attempted = shouldAttemptDrawnSignatureLoad(signed, meta)
    const storagePath = expandedDrawnSignaturePath.value
    const resolveKey = id && attempted ? drawnSignatureUrlCacheKey(id, storagePath) : ''
    const sameKey = resolveKey !== '' && resolveKey === lastResolveKey

    if (!sameKey) {
      expandedDrawnSignatureResolved.value = false
    }

    if (!id || !signed || !attempted) {
      if (refreshId !== latestRefreshId) return
      if (!sameKey) {
        expandedGuestSignatureUrl.value = null
        lastResolveKey = ''
      }
      expandedDrawnSignatureResolved.value = true
      return
    }

    const url = await resolveDrawnSignatureUrlCached(id, storagePath, options.resolveUrl)
    if (refreshId !== latestRefreshId) return
    lastResolveKey = resolveKey
    expandedGuestSignatureUrl.value = url
    expandedDrawnSignatureResolved.value = true
  }

  watch(
    [
      () => options.expandedEntryId.value,
      () => options.isExpandedEntrySigned.value,
      expandedDrawnSignaturePath,
      expandedDrawnSignatureMethod,
    ],
    () => {
      void refreshExpandedDrawnSignatureUrl()
    },
    { immediate: true }
  )

  return {
    expandedGuestSignatureUrl,
    expandedDrawnSignatureResolved,
    expandedDrawnSignatureAttempted,
    refreshExpandedDrawnSignatureUrl,
  }
}