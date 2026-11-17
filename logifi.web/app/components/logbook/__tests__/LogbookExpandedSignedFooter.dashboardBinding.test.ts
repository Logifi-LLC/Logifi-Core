import { mount, flushPromises } from '@vue/test-utils'
import { computed, defineComponent, reactive, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearDrawnSignatureUrlCache } from '../../../utils/drawnSignatureUrlResolve'
import { useExpandedDrawnSignatureUrl } from '../../../composables/useExpandedDrawnSignatureUrl'
import LogbookExpandedSignedFooter from '../LogbookExpandedSignedFooter.vue'

afterEach(() => {
  clearDrawnSignatureUrlCache()
})

const ENTRY = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const INK =
  'https://example.test/storage/v1/object/sign/flight-signatures/demo/ink.png?token=fictional'

describe('LogbookExpandedSignedFooter dashboard binding', () => {
  it('renders <img> when ink URL is wired like dashboard.vue (reactive composable object)', async () => {
    const resolveUrl = vi.fn(async () => INK)

    const Harness = defineComponent({
      name: 'DashboardSignedFooterHarness',
      components: { LogbookExpandedSignedFooter },
      setup() {
        const expandedEntryId = ref<string | null>(null)
        const signatures = ref<
          Record<string, { drawn_signature_url: string; sign_method: string }>
        >({})

        const expandedSignatureMeta = computed(() => {
          const id = expandedEntryId.value
          return id ? (signatures.value[id] ?? null) : null
        })
        const isExpandedEntrySigned = computed(() => Boolean(expandedSignatureMeta.value))

        const expandedDrawnSignatureUi = reactive(
          useExpandedDrawnSignatureUrl({
            expandedEntryId,
            isExpandedEntrySigned,
            expandedSignatureMeta,
            resolveUrl,
          })
        )

        const blockText = '11/16/2026  /s/ Alex Instructor  1234567CFI  Exp. 12/31/2027'

        signatures.value[ENTRY] = {
          drawn_signature_url: 'user/id.png',
          sign_method: 'guest_drawn',
        }
        expandedEntryId.value = ENTRY

        return {
          expandedDrawnSignatureUi,
          blockText,
        }
      },
      template: `
        <LogbookExpandedSignedFooter
          :is-signed="true"
          :block-text="blockText"
          :ink-url="expandedDrawnSignatureUi.expandedGuestSignatureUrl"
          :show-ink-unavailable="
            expandedDrawnSignatureUi.expandedDrawnSignatureAttempted &&
            expandedDrawnSignatureUi.expandedDrawnSignatureResolved &&
            !expandedDrawnSignatureUi.expandedGuestSignatureUrl
          "
          :is-dark-mode="false"
        />
      `,
    })

    const wrapper = mount(Harness, {
      global: {
        stubs: {
          FlightDrawnSignatureImage: {
            template: '<img class="stub-ink" :src="src" alt="Instructor signature" />',
            props: ['src', 'isDarkMode', 'alt'],
          },
        },
      },
    })

    await flushPromises()
    await flushPromises()

    const img = wrapper.find('img.stub-ink')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe(INK)
    expect(resolveUrl).toHaveBeenCalled()
  })
})