import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed, defineComponent, nextTick, ref } from 'vue'
import {
  durationFieldDisplay,
  onEntryDurationBlur,
  onEntryDurationKeystroke,
} from '../../app/utils/entryFormFieldValidation'

const EntryDurationDraftHarness = defineComponent({
  name: 'EntryDurationDraftHarness',
  setup() {
    const model = ref<number | null>(null)
    const draft = ref<string | undefined>(undefined)
    const formatError = ref<string | null>(null)
    const display = computed(() => durationFieldDisplay(draft.value, model.value))

    function onInput(e: Event): void {
      const raw = (e.target as HTMLInputElement).value
      const result = onEntryDurationKeystroke(raw, (value) => {
        model.value = value
      })
      draft.value = result.draft
      formatError.value = result.formatError
    }

    function onBlur(e: Event): void {
      const raw = (e.target as HTMLInputElement).value
      const result = onEntryDurationBlur(
        raw,
        () => model.value,
        (value) => {
          model.value = value
        }
      )
      draft.value = undefined
      formatError.value = result.formatError
    }

    return { model, formatError, display, onInput, onBlur }
  },
  template: '<input :value="display" @input="onInput" @blur="onBlur" />',
})

async function typeChar(wrapper: ReturnType<typeof mount>, ch: string): Promise<void> {
  const input = wrapper.get('input')
  const el = input.element as HTMLInputElement
  el.value = `${el.value}${ch}`
  await input.trigger('input')
  await nextTick()
}

describe('EntryDurationDraftHarness', () => {
  it('keeps typed 1.3 visible and stores 1.3 instead of rewriting 1 → 1.0', async () => {
    const wrapper = mount(EntryDurationDraftHarness)
    const input = () => wrapper.get('input').element as HTMLInputElement

    await typeChar(wrapper, '1')
    expect(input().value).toBe('1')
    expect(wrapper.vm.model).toBe(1)

    await typeChar(wrapper, '.')
    expect(input().value).toBe('1.')
    expect(wrapper.vm.model).toBe(1)

    await typeChar(wrapper, '3')
    expect(input().value).toBe('1.3')
    expect(wrapper.vm.model).toBe(1.3)
    expect(wrapper.vm.formatError).toBeNull()

    await wrapper.get('input').trigger('blur')
    await nextTick()
    expect(input().value).toBe('1.3')
    expect(wrapper.vm.model).toBe(1.3)

    wrapper.unmount()
  })
})
