import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import DigifiMobileColumnCarousel from '../../app/components/digifi/DigifiMobileColumnCarousel.vue'
import LogbookBuilderGrid from '../../app/components/logbook-builder/LogbookBuilderGrid.vue'
import DigifiMobileCameraCapture from '../../app/components/digifi/DigifiMobileCameraCapture.vue'
import DigifiMobileLayoutWizard from '../../app/components/digifi/DigifiMobileLayoutWizard.vue'
import { useLogbookBuilderGrid } from '../../app/composables/useLogbookBuilderGrid'
import { CATEGORY_CLASS_OPTIONS, createBuilderColumn } from '../../app/utils/logbookBuilderTypes'
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

    expect(wrapper.text()).toContain('Load template')
    expect(wrapper.text()).not.toContain('Save Template')
    expect(wrapper.find('input[placeholder="Save as"]').exists()).toBe(false)

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
      leftChipLabel: 'Ready',
      rightChipLabel: 'Ready',
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
      rightChipLabel: 'Ready',
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
    const cta = wrapper.get('button.w-full.min-h-\\[52px\\]')
    expect(cta.text()).toBe('Photograph left page')
    expect(wrapper.text()).not.toMatch(/false\]|API calls|Scan completed/)
  })

  it('waits for a class before adding a Category/Class column', async () => {
    const { wrapper, grid } = mountWithGrid(DigifiMobileLayoutWizard, {
      scanning: false,
      captureLabel: 'Photograph page',
    })
    const before = grid.columns.value.length
    const addField = wrapper.get('[aria-label="Add column field"]')

    await addField.setValue('categoryClass')
    await nextTick()

    expect(grid.columns.value.length).toBe(before)
    expect((addField.element as HTMLSelectElement).value).toBe('categoryClass')
    const classSelect = wrapper.get('select[aria-label="Pick a class"]')
    expect(classSelect.findAll('option').map((option) => option.text())).toEqual([
      'Pick a class…',
      ...CATEGORY_CLASS_OPTIONS,
    ])

    await classSelect.setValue('')
    expect(grid.columns.value.length).toBe(before)

    await classSelect.setValue('ASEL')
    await nextTick()

    expect(grid.columns.value.length).toBe(before + 1)
    const added = grid.columns.value.at(-1)
    expect(added).toMatchObject({
      fieldKey: 'categoryClass',
      categoryClassValue: 'ASEL',
      label: 'ASEL',
    })
    expect(wrapper.text()).toContain('ASEL')
    expect(wrapper.find('select[aria-label="Pick a class"]').exists()).toBe(false)
    expect((wrapper.get('[aria-label="Add column field"]').element as HTMLSelectElement).value).toBe('')
  })

  it('hides the class picker when another field is chosen', async () => {
    const { wrapper, grid } = mountWithGrid(DigifiMobileLayoutWizard, {
      scanning: false,
      captureLabel: 'Photograph page',
    })
    const addField = wrapper.get('[aria-label="Add column field"]')
    await addField.setValue('categoryClass')
    await nextTick()
    expect(wrapper.find('select[aria-label="Pick a class"]').exists()).toBe(true)

    const before = grid.columns.value.length
    await addField.setValue('remarks')
    await nextTick()

    expect(wrapper.find('select[aria-label="Pick a class"]').exists()).toBe(false)
    expect(grid.columns.value.length).toBe(before + 1)
    expect(grid.columns.value.at(-1)?.fieldKey).toBe('remarks')
    expect(grid.columns.value.at(-1)?.categoryClassValue).toBeUndefined()
  })

  it('adds a second category class and labels each column with its class', async () => {
    const { wrapper, grid } = mountWithGrid(DigifiMobileLayoutWizard, {
      scanning: false,
      captureLabel: 'Photograph page',
    })
    const addField = wrapper.get('[aria-label="Add column field"]')

    await addField.setValue('categoryClass')
    await nextTick()
    await wrapper.get('select[aria-label="Pick a class"]').setValue('ASEL')
    await nextTick()

    await addField.setValue('categoryClass')
    await nextTick()
    const classSelect = wrapper.get('select[aria-label="Pick a class"]')
    expect(classSelect.findAll('option').map((option) => option.text())).not.toContain('ASEL')
    await classSelect.setValue('AMEL')
    await nextTick()

    const categoryColumns = grid.columns.value.filter((column) => column.fieldKey === 'categoryClass')
    expect(categoryColumns.map((column) => column.label)).toEqual(['ASEL', 'AMEL'])
    expect(categoryColumns.map((column) => column.categoryClassValue)).toEqual(['ASEL', 'AMEL'])
    expect(wrapper.text()).toContain('ASEL')
    expect(wrapper.text()).toContain('AMEL')
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

describe('LogbookBuilderGrid time mismatch', () => {
  it('highlights Total and PIC on the review grid without an AI badge', async () => {
    const grid = useLogbookBuilderGrid()
    grid.columns.value = [
      createBuilderColumn({ id: 'total', fieldKey: 'total', label: 'Total', order: 0, width: 70 }),
      createBuilderColumn({ id: 'pic', fieldKey: 'pic', label: 'PIC', order: 1, width: 70 }),
      createBuilderColumn({ id: 'dualg', fieldKey: 'dualG', label: 'Dual G', order: 2, width: 70 }),
    ]
    grid.setRowCount(1)
    grid.setCell(0, 'total', '1.6')
    grid.setCell(0, 'pic', '1.8')
    grid.setCell(0, 'dualg', '1.8')

    const wrapper = mount(LogbookBuilderGrid, {
      global: { provide: { logbookBuilderGrid: grid } },
    })
    await nextTick()

    const totalCell = wrapper.get('td[data-builder-col="0"]')
    const picCell = wrapper.get('td[data-builder-col="1"]')
    const dualCell = wrapper.get('td[data-builder-col="2"]')
    expect(totalCell.classes()).toContain('bg-amber-500/10')
    expect(picCell.classes()).toContain('bg-amber-500/10')
    expect(dualCell.classes()).toContain('bg-amber-500/10')
    expect(totalCell.attributes('title')).toBe('PIC 1.8 and Dual G 1.8 are greater than Total 1.6')
    expect(totalCell.text()).not.toContain('?')
    expect(wrapper.text()).not.toContain('may merge two flights')

    await totalCell.get('input').setValue('1.8')
    await nextTick()
    expect(grid.rows.value[0]?.cells.total).toBe('1.8')
    const totalAfter = wrapper.get('td[data-builder-col="0"]')
    const picAfter = wrapper.get('td[data-builder-col="1"]')
    expect(totalAfter.classes()).not.toContain('bg-amber-500/10')
    expect(picAfter.classes()).not.toContain('bg-amber-500/10')
    expect(totalAfter.attributes('title')).toBeUndefined()
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

  it('shows saved pilot names when the pilot cell is focused', async () => {
    const grid = useLogbookBuilderGrid()
    grid.setRowCount(2)
    grid.addColumn('pilots')
    const pilots = ref(['Ada Lovelace', 'Grace Hopper'])
    const wrapper = mount(DigifiMobileColumnCarousel, {
      global: {
        provide: { logbookBuilderGrid: grid, builderPilots: pilots },
      },
    })
    await nextTick()
    const pilotInput = wrapper
      .findAll('input')
      .find((input) => (input.element as HTMLInputElement).placeholder === 'Pilot name')
    expect(pilotInput).toBeTruthy()
    await pilotInput!.trigger('focus')
    await nextTick()
    const menu = wrapper.get('[data-builder-typeahead-dropdown]')
    expect(menu.classes()).toContain('absolute')
    expect(menu.classes()).toContain('top-full')
    expect(menu.classes()).toContain('w-full')
    expect(menu.element.parentElement).toBe(pilotInput!.element.parentElement)
    expect(wrapper.text()).toContain('Ada Lovelace')
    expect(wrapper.text()).toContain('Grace Hopper')
  })

  it('does not offer a paid remarks re-scan', async () => {
    const { wrapper, grid } = mountWithGrid(DigifiMobileColumnCarousel)
    grid.addColumn('remarks')
    await nextTick()
    const remarks = grid.visibleColumns.value.find((column) => column.fieldKey === 'remarks')
    expect(remarks).toBeTruthy()
    grid.setDigifiCellMeta(0, remarks!.id, {
      fieldKey: 'remarks',
      rawValue: 'a | b',
      resolvedValue: 'a | b',
      strategy: 'raw',
      confidence: 'low',
      autoApplied: false,
      needsReview: true,
      message:
        'Line 1 may merge two flights (consecutive rows with the same duration (possible skipped or merged line)). Re-scan remarks for this band if needed.',
    })
    await nextTick()
    expect(wrapper.text()).not.toContain('Re-scan remarks')
    expect(wrapper.text()).not.toContain('uses 1 credit')
    expect(wrapper.text()).not.toContain('may merge two flights')
  })

  it('highlights Total and the role cell when role time is above Total, then clears on edit', async () => {
    const grid = useLogbookBuilderGrid()
    grid.columns.value = [
      createBuilderColumn({ id: 'total', fieldKey: 'total', label: 'Total', order: 0 }),
      createBuilderColumn({ id: 'pic', fieldKey: 'pic', label: 'PIC', order: 1 }),
      createBuilderColumn({ id: 'dualg', fieldKey: 'dualG', label: 'Dual G', order: 2 }),
    ]
    grid.setRowCount(2)
    grid.setCell(0, 'total', '1.2')
    grid.setCell(0, 'pic', '1.2')
    grid.setCell(1, 'total', '1.6')
    grid.setCell(1, 'pic', '1.8')
    grid.setCell(1, 'dualg', '1.8')

    const wrapper = mount(DigifiMobileColumnCarousel, {
      global: { provide: { logbookBuilderGrid: grid } },
    })
    await nextTick()

    const sections = wrapper.findAll('[data-digifi-column]')
    const totalRow = (index: number) => sections[0]!.findAll('[data-digifi-row-content]')[index]!
    const picRow = (index: number) => sections[1]!.findAll('[data-digifi-row-content]')[index]!
    const dualRow = (index: number) => sections[2]!.findAll('[data-digifi-row-content]')[index]!

    expect(totalRow(0).classes()).not.toContain('bg-amber-500/10')
    expect(totalRow(1).classes()).toContain('bg-amber-500/10')
    expect(picRow(1).classes()).toContain('bg-amber-500/10')
    expect(dualRow(1).classes()).toContain('bg-amber-500/10')
    expect(totalRow(1).attributes('title')).toBe('PIC 1.8 and Dual G 1.8 are greater than Total 1.6')
    expect(wrapper.text()).not.toContain('may merge two flights')

    await sections[0]!.findAll('input')[1]!.setValue('1.8')
    await nextTick()

    expect(grid.rows.value[1]?.cells.total).toBe('1.8')
    expect(totalRow(1).classes()).not.toContain('bg-amber-500/10')
    expect(picRow(1).classes()).not.toContain('bg-amber-500/10')
    expect(dualRow(1).classes()).not.toContain('bg-amber-500/10')
    expect(totalRow(1).attributes('title')).toBeUndefined()
  })

  it('tags each row for cross-column height measurement', async () => {
    const { wrapper, grid } = mountWithGrid(DigifiMobileColumnCarousel)
    grid.setRowCount(2)
    await nextTick()
    const rowItems = wrapper.findAll('li[data-digifi-row]')
    expect(rowItems.length).toBeGreaterThan(1)
    const indices = new Set(
      rowItems.map((li) => (li.element as HTMLElement).dataset.digifiRow)
    )
    expect(indices.has('0')).toBe(true)
    expect(indices.has('1')).toBe(true)
  })
})
