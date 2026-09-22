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

  it('lets the pilot edit default year without per-keystroke clamping', async () => {
    const { wrapper, grid } = mountWithGrid(DigifiMobileLayoutWizard, {
      scanning: false,
      captureLabel: 'Photograph page',
    })
    await nextTick()

    const yearInput = wrapper.get('input[inputmode="numeric"]')
    await yearInput.trigger('focus')
    await yearInput.setValue('')
    await yearInput.setValue('2024')
    expect(grid.defaultYear.value).not.toBe(1900)

    await yearInput.trigger('blur')
    await nextTick()
    expect(grid.defaultYear.value).toBe(2024)
    expect((yearInput.element as HTMLInputElement).value).toBe('2024')
  })

  it('enables review CTA when both two-page sides are ready for review', async () => {
    const { wrapper, grid } = mountWithGrid(DigifiMobileLayoutWizard, {
      scanning: false,
      captureLabel: 'Review flights',
      twoPageStep: null,
      leftChipLabel: 'Done · Retake',
      rightChipLabel: 'Done · Retake',
      readyForReview: true,
    })
    grid.layout.value = 'two-page'
    await nextTick()

    const cta = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Review flights'))
    expect(cta).toBeTruthy()
    expect((cta!.element as HTMLButtonElement).disabled).toBe(false)
  })

  it('disables CTA while scans are still in flight', async () => {
    const { wrapper, grid } = mountWithGrid(DigifiMobileLayoutWizard, {
      scanning: true,
      captureLabel: 'Scanning…',
      twoPageStep: null,
      leftChipLabel: 'Scanning…',
      rightChipLabel: 'Done · Retake',
      readyForReview: false,
    })
    grid.layout.value = 'two-page'
    await nextTick()

    const cta = wrapper.get('button.w-full.min-h-\\[52px\\]')
    expect(cta.text()).toContain('Scanning')
    expect((cta.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows two-page capture progress when layout is two-page', async () => {
    const { wrapper, grid } = mountWithGrid(DigifiMobileLayoutWizard, {
      scanning: false,
      captureLabel: 'Photograph left page',
      twoPageStep: 1,
      leftPageScanned: false,
    })
    grid.layout.value = 'two-page'
    await nextTick()

    expect(wrapper.text()).toContain('Two-page photos')
    expect(wrapper.text()).toContain('1 · Left')
    expect(wrapper.text()).toContain('2 · Right')
    expect(wrapper.text()).toContain('Photograph left page')
  })
})

describe('DigifiMobileCameraCapture', () => {
  it('shows a handoff banner when the right page is the active step', () => {
    const wrapper = mount(DigifiMobileCameraCapture, {
      props: {
        shutterLabel: 'Photograph right page',
        twoPageStep: 2,
        leftPageReadyForRight: true,
      },
      global: {
        stubs: { video: true },
      },
    })
    expect(wrapper.text()).toContain('Left page captured')
    expect(wrapper.text()).toContain('Photograph right page')
    expect(wrapper.text()).toContain('Page 2 of 2')
  })

  it('uses a bottom shutter control without level guide overlays', () => {
    const wrapper = mount(DigifiMobileCameraCapture, {
      props: { shutterLabel: 'Photograph left page', twoPageStep: 1 },
      global: {
        stubs: { video: true },
      },
    })
    expect(wrapper.find('[aria-label="Take picture"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Photograph left page')
    expect(wrapper.text()).toContain('Page 1 of 2')
    expect(wrapper.text()).toContain('Tap the white button to take a photo')
    expect(wrapper.html()).not.toContain('inset-y-0 left-[32%]')
    expect(wrapper.text()).not.toContain('Fit the logbook page in the frame')
    expect(wrapper.find('.border-green-400').exists()).toBe(false)
  })
})

describe('DigifiMobileColumnCarousel', () => {
  it('renders flight lines and writes an edit into the grid', async () => {
    const { wrapper, grid } = mountWithGrid(DigifiMobileColumnCarousel)
    const firstCol = grid.visibleColumns.value[0]
    expect(firstCol).toBeTruthy()

    const fields = wrapper.findAll('input, select, textarea')
    expect(fields.length).toBeGreaterThan(0)
    expect(wrapper.findAll('button[aria-label]').length).toBe(0)

    const firstInput = wrapper.find('input')
    await firstInput.setValue('01/02')
    await nextTick()
    expect(grid.rows.value[0]?.cells[firstCol!.id]).toBe('01/02')
  })

  it('includes trailing scroll spacer so the last column can snap to center', () => {
    const { wrapper } = mountWithGrid(DigifiMobileColumnCarousel)
    expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(true)
  })

  it('renders a column jump dropdown', () => {
    const { wrapper, grid } = mountWithGrid(DigifiMobileColumnCarousel)
    const select = wrapper.get('[aria-label="Column"]')
    expect(select.findAll('option').length).toBe(grid.visibleColumns.value.length)
  })

  it('applies shared row min-heights on each column strip', () => {
    const { wrapper, grid } = mountWithGrid(DigifiMobileColumnCarousel)
    grid.setRowCount(2)
    const remarks = grid.visibleColumns.value.find((c) => c.fieldKey === 'remarks')
    if (remarks) {
      grid.setCell(1, remarks.id, 'Long | remarks | block')
    }
    wrapper.vm.$forceUpdate?.()
    const rowItems = wrapper.findAll('ol li')
    expect(rowItems.length).toBeGreaterThan(1)
    const heights = rowItems.map((li) => (li.element as HTMLElement).style.minHeight)
    const unique = new Set(heights.filter(Boolean))
    expect(unique.size).toBeGreaterThan(0)
  })
})
