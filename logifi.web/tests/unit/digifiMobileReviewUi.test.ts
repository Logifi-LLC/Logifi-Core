import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import DigifiMobileColumnCarousel from '../../app/components/digifi/DigifiMobileColumnCarousel.vue'
import DigifiMobileCameraCapture from '../../app/components/digifi/DigifiMobileCameraCapture.vue'
import DigifiMobileLayoutWizard from '../../app/components/digifi/DigifiMobileLayoutWizard.vue'
import { useLogbookBuilderGrid } from '../../app/composables/useLogbookBuilderGrid'
import { readLastTemplateId } from '~/utils/logbookBuilderDraft'

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

vi.mock('~/utils/logbookBuilderDraft', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../app/utils/logbookBuilderDraft')>()
  return {
    ...actual,
    readLastTemplateId: vi.fn(() => null),
  }
})

beforeEach(() => {
  vi.mocked(readLastTemplateId).mockReturnValue(null)
})

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
  it('sets two-page layout and emits capture, and toggles a column', async () => {
    const { wrapper, grid } = mountWithGrid(DigifiMobileLayoutWizard, {
      scanning: false,
      captureLabel: 'Photograph page',
    })

    const before = grid.columns.value.length
    const spreadButtons = wrapper.findAll('button').filter((button) => button.text() === 'Two-page spread')
    expect(spreadButtons.length).toBe(1)
    await spreadButtons[0]!.trigger('click')
    expect(grid.layout.value).toBe('two-page')

    const addField = wrapper.get('[aria-label="Add column field"]')
    await addField.setValue('remarks')
    expect(grid.columns.value.length).toBe(before + 1)

    const capture = wrapper.findAll('button').filter((button) => button.text() === 'Photograph page')
    expect(capture.length).toBe(1)
    await capture[0]!.trigger('click')
    expect(wrapper.emitted('capture')).toHaveLength(1)
  })

  it('reorders visible columns via ordered list controls', async () => {
    const { wrapper, grid } = mountWithGrid(DigifiMobileLayoutWizard, {
      scanning: false,
      captureLabel: 'Photograph page',
    })

    const initial = grid.visibleColumns.value.map((column) => column.id)
    expect(initial.length).toBeGreaterThan(1)

    const downButtons = wrapper.findAll('button[aria-label="Move column down"]')
    expect(downButtons.length).toBe(initial.length)
    await downButtons[0]!.trigger('click')

    const after = grid.visibleColumns.value.map((column) => column.id)
    expect(after[0]).toBe(initial[1])
    expect(after[1]).toBe(initial[0])
  })

  it('collapses column editor when last template id is present on mount', async () => {
    vi.mocked(readLastTemplateId).mockReturnValue('template-1')

    const { wrapper } = mountWithGrid(DigifiMobileLayoutWizard, {
      scanning: false,
      captureLabel: 'Photograph page',
    })
    await nextTick()

    expect(wrapper.text()).toMatch(/Tap to edit/)
    expect(wrapper.find('button[aria-label="Move column down"]').exists()).toBe(false)

    await wrapper.get('button[aria-label="Edit columns"]').trigger('click')
    expect(wrapper.find('button[aria-label="Move column down"]').exists()).toBe(true)
  })

  it('collapses column editor on first visit via Done', async () => {
    const { wrapper } = mountWithGrid(DigifiMobileLayoutWizard, {
      scanning: false,
      captureLabel: 'Photograph page',
    })
    await nextTick()

    expect(wrapper.find('button[aria-label="Move column down"]').exists()).toBe(true)
    await wrapper.get('button[aria-label="Done editing columns"]').trigger('click')
    expect(wrapper.text()).toMatch(/Tap to edit/)
    expect(wrapper.find('button[aria-label="Move column down"]').exists()).toBe(false)
  })
})

describe('DigifiMobileCameraCapture', () => {
  it('shows level guide copy instead of crop frame text', () => {
    const wrapper = mount(DigifiMobileCameraCapture, {
      global: {
        stubs: { video: true },
      },
    })
    expect(wrapper.text()).toContain('Keep the page level and fill the view')
    expect(wrapper.text()).not.toContain('Fit the logbook page in the frame')
    expect(wrapper.find('.border-green-400').exists()).toBe(false)
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

  it('includes trailing scroll spacer so the last column can snap to center', () => {
    const { wrapper } = mountWithGrid(DigifiMobileColumnCarousel)
    expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(true)
  })
})
