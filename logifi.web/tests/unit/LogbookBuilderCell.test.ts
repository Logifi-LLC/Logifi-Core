import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import LogbookBuilderCell from '../../app/components/logbook-builder/LogbookBuilderCell.vue'

vi.mock('~/composables/useTheme', () => ({
  useTheme: () => ({ isDark: { value: false } }),
}))

function mountCell(modelValue = '', isEditing = true) {
  return mount(LogbookBuilderCell, {
    props: {
      modelValue,
      isEditing,
      fieldKey: 'remarks',
    },
  })
}

describe('LogbookBuilderCell overwrite mode', () => {
  it('does not replace the cell on the second key when overwrite is false', async () => {
    const wrapper = mountCell('S')
    const input = wrapper.find('input')
    const vm = wrapper.vm as { beginEdit: (o: { overwrite: boolean }) => void }

    vm.beginEdit({ overwrite: false })
    await nextTick()

    await input.trigger('keydown', { key: 'h' })
    const updates = wrapper.emitted('update:modelValue') ?? []
    const lastUpdate = updates[updates.length - 1]?.[0]
    expect(lastUpdate).not.toBe('h')
    expect(wrapper.props('modelValue')).toBe('S')
  })

  it('places the caret at the end when overwrite is false', async () => {
    const wrapper = mountCell('Hanryul Park AT 145 FLG')
    const input = wrapper.find('input').element as HTMLInputElement
    const vm = wrapper.vm as { beginEdit: (o: { overwrite: boolean }) => void }

    vm.beginEdit({ overwrite: false })
    await nextTick()

    expect(input.selectionStart).toBe(input.value.length)
    expect(input.selectionEnd).toBe(input.value.length)
  })

  it('replaces the cell with a single character when overwrite is true', async () => {
    const wrapper = mountCell('S')
    const input = wrapper.find('input')
    const vm = wrapper.vm as { beginEdit: (o: { overwrite: boolean }) => void }

    vm.beginEdit({ overwrite: true })
    await nextTick()

    await input.trigger('keydown', { key: 'h' })
    expect(wrapper.emitted('update:modelValue')?.slice(-1)?.[0]?.[0]).toBe('h')
  })
})
