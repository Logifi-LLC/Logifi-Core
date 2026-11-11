import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import EntryFieldError from '../../app/components/logbook/EntryFieldError.vue'

describe('EntryFieldError', () => {
  it('links as an alert for aria-describedby and hides when empty', async () => {
    const wrapper = mount(EntryFieldError, {
      props: {
        id: 'entry-date-error',
        message: 'Enter a date',
        isDarkMode: false,
      },
    })
    const alert = wrapper.get('#entry-date-error')
    expect(alert.attributes('role')).toBe('alert')
    expect(alert.text()).toBe('Enter a date')

    await wrapper.setProps({ message: null })
    await nextTick()
    expect(wrapper.find('#entry-date-error').exists()).toBe(false)
    wrapper.unmount()
  })
})
