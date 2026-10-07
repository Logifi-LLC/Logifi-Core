import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import LogbookBuilderGrid from '../../app/components/logbook-builder/LogbookBuilderGrid.vue'
import { useLogbookBuilderGrid } from '../../app/composables/useLogbookBuilderGrid'

vi.mock('~/composables/useTheme', () => ({
  useTheme: () => ({ isDark: { value: false } }),
}))

describe('LogbookBuilder row tags', () => {
  it('focuses + Tag, keeps keystrokes there, and adds the tag on Enter', async () => {
    const grid = useLogbookBuilderGrid()
    const wrapper = mount(LogbookBuilderGrid, {
      global: { provide: { logbookBuilderGrid: grid } },
      attachTo: document.body,
    })

    const dateId = grid.visibleColumns.value[0]!.id
    const addTag = wrapper.findAll('[aria-label="Add tag"]')[0]
    expect(addTag).toBeTruthy()
    await addTag!.trigger('click')
    await nextTick()

    const input = wrapper.get('[data-builder-tag-input]')
    expect(document.activeElement).toBe(input.element)

    input.element.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'N', bubbles: true, cancelable: true })
    )
    await input.setValue('Night')
    await input.trigger('keydown', { key: 'Enter' })

    expect(grid.rows.value[0]?.tags).toEqual(['Night'])
    expect(grid.rows.value[0]?.cells[dateId] ?? '').toBe('')
    expect(wrapper.text()).toContain('Night')
    wrapper.unmount()
  })

  it('cancels a custom tag on Escape', async () => {
    const grid = useLogbookBuilderGrid()
    const wrapper = mount(LogbookBuilderGrid, {
      global: { provide: { logbookBuilderGrid: grid } },
      attachTo: document.body,
    })

    const addTag = wrapper.findAll('[aria-label="Add tag"]')[0]
    expect(addTag).toBeTruthy()
    await addTag!.trigger('click')
    await nextTick()
    const input = wrapper.get('[data-builder-tag-input]')
    await input.setValue('Nope')
    await input.trigger('keydown', { key: 'Escape' })
    await nextTick()

    expect(wrapper.find('[data-builder-tag-input]').exists()).toBe(false)
    expect(grid.rows.value[0]?.tags ?? []).not.toContain('Nope')
    wrapper.unmount()
  })

  it('shows a custom column mark as an auto-tag chip', async () => {
    const grid = useLogbookBuilderGrid()
    grid.addColumn(null, { columnKind: 'custom', label: 'Retractable Gear' })
    const column = grid.visibleColumns.value.find((entry) => entry.label === 'Retractable Gear')
    expect(column).toBeTruthy()
    grid.setCell(0, column!.id, 'x')

    const wrapper = mount(LogbookBuilderGrid, {
      global: { provide: { logbookBuilderGrid: grid } },
      attachTo: document.body,
    })

    const chips = wrapper.findAll('[data-testid="auto-tag"]')
    expect(chips).toHaveLength(1)
    expect(chips[0]!.text()).toBe('Retractable Gear')
    await chips[0]!.trigger('click')
    expect(grid.rows.value[0]?.tags ?? []).not.toContain('Retractable Gear')
    expect(wrapper.get('[data-testid="auto-tag"]').text()).toBe('Retractable Gear')
    wrapper.unmount()
  })
})
