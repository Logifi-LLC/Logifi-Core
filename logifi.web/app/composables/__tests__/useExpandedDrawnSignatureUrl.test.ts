import { computed, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearDrawnSignatureUrlCache } from '../../utils/drawnSignatureUrlResolve'
import { useExpandedDrawnSignatureUrl } from '../useExpandedDrawnSignatureUrl'

afterEach(() => {
  clearDrawnSignatureUrlCache()
})

const ENTRY = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

async function flushWatchers(): Promise<void> {
  await nextTick()
  await Promise.resolve()
  await Promise.resolve()
}

describe('useExpandedDrawnSignatureUrl', () => {
  it('resolves the URL once when opening a signed entry', async () => {
    const resolveUrl = vi.fn(async () => 'https://signed.test/ink.png')
    const expandedEntryId = ref<string | null>(null)
    const signatures = ref<
      Record<string, { drawn_signature_url: string; sign_method: string }>
    >({})

    const expandedSignatureMeta = computed(() => {
      const id = expandedEntryId.value
      return id ? (signatures.value[id] ?? null) : null
    })
    const isExpandedEntrySigned = computed(() => Boolean(expandedSignatureMeta.value))

    useExpandedDrawnSignatureUrl({
      expandedEntryId,
      isExpandedEntrySigned,
      expandedSignatureMeta,
      resolveUrl,
    })

    signatures.value[ENTRY] = {
      drawn_signature_url: 'user/id.png',
      sign_method: 'guest_drawn',
    }
    expandedEntryId.value = ENTRY
    await flushWatchers()

    expect(resolveUrl).toHaveBeenCalledTimes(1)
    expect(resolveUrl).toHaveBeenCalledWith(ENTRY, 'user/id.png')
  })

  it('does not re-resolve when an unrelated entry is added to the signature map', async () => {
    const resolveUrl = vi.fn(async () => 'https://signed.test/ink.png')
    const expandedEntryId = ref(ENTRY)
    const signatures = ref({
      [ENTRY]: { drawn_signature_url: 'user/id.png', sign_method: 'guest_drawn' },
    })

    const expandedSignatureMeta = computed(() => signatures.value[ENTRY] ?? null)
    const isExpandedEntrySigned = computed(() => Boolean(expandedSignatureMeta.value))

    useExpandedDrawnSignatureUrl({
      expandedEntryId,
      isExpandedEntrySigned,
      expandedSignatureMeta,
      resolveUrl,
    })

    await flushWatchers()
    expect(resolveUrl).toHaveBeenCalledTimes(1)

    const other = 'ffffffff-gggg-hhhh-iiii-jjjjjjjjjjjj'
    signatures.value = {
      ...signatures.value,
      [other]: { drawn_signature_url: 'other/path.png', sign_method: 'guest_drawn' },
    }
    await flushWatchers()
    expect(resolveUrl).toHaveBeenCalledTimes(1)
  })
})