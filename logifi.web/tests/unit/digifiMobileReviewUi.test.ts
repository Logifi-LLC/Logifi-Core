import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import DigifiMobileColumnCarousel from '../../app/components/digifi/DigifiMobileColumnCarousel.vue'
import DigifiMobileLayoutWizard from '../../app/components/digifi/DigifiMobileLayoutWizard.vue'
import { useLogbookBuilderGrid } from '../../app/composables/useLogbookBuilderGrid'

vi.mock('~/composables/useAuth', () => ({
  useAuth: () => ({
    user: { value: { id: 'user-1' } },
    isAuthenticated: { value: true },
  }),
}))

vi.mock('~/composables/useTheme', () => ({
  useTheme: () => ({ isDark: { value: true }, theme: { value: 'dark' } }),
}))

vi.mock('~/composables/useLogbookBuilderLastTemplate', () => ({
  persistLastTemplateId: vi.fn(),
}))

function mountWithGrid(component: object, props?: Record<string, unknown>) {
  const grid = useLogbookBuilderGrid()
  grid.setRowCount(3)
  const wrapper = mount(component, {
    props,
    global: {
      provide: { logbookBuilderGrid: grid },
    },
  })
  return { wrapper, grid }
}

describe('DigifiMobileLayoutWizard', () => {
  it('emits page shape and capture, and toggles a column', async () => {
    const { wrapper, grid } = mountWithGrid(DigifiMobileLayoutWizard, {
      scanning: false,
      pageShape: 'left',
      captureLabel: 'Photograph page',
    })

    const before = grid.columns.value.length
    await wrapper.get('button:nth-of-type(1)').trigger('click')
    const shapeButtons = wrapper.findAll('button').filter((button) => button.text() === 'Two-page')
    expect(shapeButtons.length).toBe(1)
    await shapeButtons[0]!.trigger('click')
    expect(wrapper.emitted('update:pageShape')?.at(-1)).toEqual(['two-page'])

    const remarks = wrapper.findAll('button').filter((button) => button.text() === 'Remarks')
    expect(remarks.length).toBe(1)
    await remarks[0]!.trigger('click')
    expect(grid.columns.value.length).toBe(before + 1)

    const capture = wrapper.findAll('button').filter((button) => button.text() === 'Photograph page')
    expect(capture.length).toBe(1)
    await capture[0]!.trigger('click')
    expect(wrapper.emitted('capture')).toHaveLength(1)
  })
})

describe('DigifiMobileColumnCarousel', () => {
  it('renders flight lines and writes an edit into the grid', async () => {
    const { wrapper, grid } = mountWithGrid(DigifiMobileColumnCarousel)
    const firstCol = grid.visibleColumns.value[0]
    expect(firstCol).toBeTruthy()

    const inputs = wrapper.findAll('input')
    expect(inputs.length).toBe(grid.rows.value.length * grid.visibleColumns.value.length)
    expect(wrapper.findAll('button[aria-label]').length).toBe(0)

    await inputs[0]!.setValue('01/02')
    await nextTick()
    expect(grid.rows.value[0]?.cells[firstCol!.id]).toBe('01/02')
  })
})
