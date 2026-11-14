import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import EntryFormMoreFieldsToggle from '../../app/components/logbook/EntryFormMoreFieldsToggle.vue'

describe('EntryFormMoreFieldsToggle', () => {
  it('is hidden in Full and is a 44px control in Quick', async () => {
    const wrapper = mount(EntryFormMoreFieldsToggle, {
      props: { mode: 'full', open: false, isDarkMode: false },
    })
    expect(wrapper.find('button').exists()).toBe(false)

    await wrapper.setProps({ mode: 'quick' })
    const button = wrapper.get('button')
    expect(button.text()).toBe('More fields')
    expect(button.attributes('aria-expanded')).toBe('false')
    expect(button.classes()).toContain('min-h-[44px]')

    await wrapper.setProps({ open: true })
    expect(wrapper.get('button').text()).toBe('Fewer fields')
    expect(wrapper.get('button').attributes('aria-expanded')).toBe('true')

    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('toggle')).toHaveLength(1)
    wrapper.unmount()
  })
})
