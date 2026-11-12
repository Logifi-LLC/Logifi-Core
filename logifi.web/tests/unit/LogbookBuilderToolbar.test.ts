import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import LogbookBuilderToolbar from '../../app/components/logbook-builder/LogbookBuilderToolbar.vue'
import { useLogbookBuilderGrid } from '../../app/composables/useLogbookBuilderGrid'

vi.mock('~/composables/useAuth', () => ({
  useAuth: () => ({
    user: { value: { id: 'user-1' } },
    isAuthenticated: { value: true },
  }),
}))

vi.mock('~/composables/useTheme', () => ({
  useTheme: () => ({ isDark: { value: false } }),
}))

vi.mock('~/composables/useToast', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

describe('LogbookBuilderToolbar layout and targets', () => {
  function mountToolbar() {
    const grid = useLogbookBuilderGrid()
    const wrapper = mount(LogbookBuilderToolbar, {
      attachTo: document.body,
      global: {
        provide: { logbookBuilderGrid: grid },
        stubs: { Icon: true },
      },
    })
    return { wrapper, grid }
  }

  it('wraps instead of forcing a horizontal strip, and labels the row count', () => {
    const { wrapper } = mountToolbar()
    const bar = wrapper.get('[data-testid="logbook-builder-toolbar"]')
    expect(bar.classes()).toContain('flex-wrap')
    expect(bar.classes()).not.toContain('flex-nowrap')
    expect(bar.classes()).not.toContain('overflow-x-auto')
    const rows = wrapper.get('#builder-row-count')
    expect(rows.classes().some((cls) => cls.includes('min-h-[44px]'))).toBe(true)
    expect(wrapper.get('label[for="builder-row-count"]').text()).toContain('Rows')
    wrapper.unmount()
  })

  it('keeps primary actions visible and reveals overflow controls from More', async () => {
    const { wrapper, grid } = mountToolbar()
    const add = wrapper.findAll('button').find((button) => button.text() === '+ Add column')
    const load = wrapper.findAll('button').find((button) => button.text() === 'Load template')
    const more = wrapper.findAll('button').find((button) => button.text() === 'More')
    expect(add).toBeTruthy()
    expect(load).toBeTruthy()
    expect(more).toBeTruthy()
    expect(more!.attributes('aria-expanded')).toBe('false')

    const layout = wrapper.get('#builder-layout')
    expect(layout.element.closest('div')?.className).toContain('hidden')

    const before = grid.columns.value.length
    await add!.trigger('click')
    expect(grid.columns.value.length).toBe(before + 1)

    await more!.trigger('click')
    expect(wrapper.findAll('button').find((button) => button.text() === 'Less')).toBeTruthy()
    expect(wrapper.get('label[for="builder-layout"]').isVisible()).toBe(true)
    wrapper.unmount()
  })
})
