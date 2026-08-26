import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import LogEntryList from '../../app/components/logbook/LogEntryList.vue'
import type { LogEntry } from '../../app/utils/logbookTypes'

vi.mock('../../app/components/logbook/LogEntryCard.vue', () => ({
  default: {
    name: 'LogEntryCard',
    props: ['entry'],
    template: '<article class="stub-card">{{ entry.id }}</article>',
  },
}))

function stubEntry(id: string): LogEntry {
  return { id } as LogEntry
}

describe('LogEntryList', () => {
  it('renders every entry in document order without a virtualizer spacer', () => {
    const entries = ['a', 'b', 'c', 'd', 'e'].map(stubEntry)
    const wrapper = mount(LogEntryList, {
      props: {
        entries,
        isDarkMode: false,
        visibleDetailFields: [],
        showRemarksFooter: false,
      },
    })

    expect(wrapper.findAll('.stub-card').map((node) => node.text())).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
    ])
    expect(wrapper.html()).not.toMatch(/translateY/)
    expect(wrapper.html()).not.toMatch(/height:\s*\d+px/)
  })
})
