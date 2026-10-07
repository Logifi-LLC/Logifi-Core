import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { useLogbookBuilderGrid } from '../../app/composables/useLogbookBuilderGrid'
import LogbookBuilderValidateBar from '../../app/components/logbook-builder/LogbookBuilderValidateBar.vue'
import DigifiMobileValidateBar from '../../app/components/digifi/DigifiMobileValidateBar.vue'

const { showToast, validateOnly, runValidateAndImport, navigateTo } = vi.hoisted(() => ({
  showToast: vi.fn(),
  validateOnly: vi.fn(),
  runValidateAndImport: vi.fn(),
  navigateTo: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: { digifi: 'open' } }),
}))

vi.mock('~/composables/useTheme', () => ({
  useTheme: () => ({ isDark: ref(false) }),
}))

vi.mock('~/composables/useToast', () => ({
  useToast: () => ({ showToast }),
}))

vi.mock('~/composables/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: ref(true),
    user: ref({ id: 'user-1' }),
  }),
}))

vi.mock('~/composables/useLogbookBuilderImport', () => ({
  formatColumnTotal: () => '1.0',
  gridToEntries: () => [],
  validateOnly: (...args: unknown[]) => validateOnly(...args),
  runValidateAndImport: (...args: unknown[]) => runValidateAndImport(...args),
}))

vi.stubGlobal('navigateTo', navigateTo)

const validSummary = {
  valid: true,
  errors: [],
  validRowCount: 2,
  columnTotals: [],
}

async function openWebConfirm() {
  const grid = useLogbookBuilderGrid()
  const startDigifiNextPage = vi.fn()
  const wrapper = mount(LogbookBuilderValidateBar, {
    global: {
      provide: {
        logbookBuilderGrid: grid,
        digifiPreferredSink: ref<'logifi'>('logifi'),
        startDigifiNextPage,
      },
    },
  })
  validateOnly.mockResolvedValue(validSummary)
  await wrapper.get('button').trigger('click')
  await flushPromises()
  return { wrapper, startDigifiNextPage }
}

async function openMobileConfirm() {
  const grid = useLogbookBuilderGrid()
  const startDigifiNextPage = vi.fn()
  const wrapper = mount(DigifiMobileValidateBar, {
    global: {
      provide: {
        logbookBuilderGrid: grid,
        digifiPreferredSink: ref<'logifi'>('logifi'),
        startDigifiNextPage,
      },
    },
  })
  validateOnly.mockResolvedValue(validSummary)
  await wrapper.get('button').trigger('click')
  await flushPromises()
  return { wrapper, startDigifiNextPage }
}

describe('Import and Scan Next Page', () => {
  beforeEach(() => {
    showToast.mockReset()
    validateOnly.mockReset()
    runValidateAndImport.mockReset()
    navigateTo.mockReset()
  })

  it('shows the action next to Import and starts the next scan after a successful import', async () => {
    const { wrapper, startDigifiNextPage } = await openWebConfirm()
    const next = wrapper.get('[data-testid="import-and-scan-next"]')
    expect(next.text()).toBe('Import and Scan Next Page')
    expect(wrapper.text()).toContain('Import to Logifi')

    runValidateAndImport.mockResolvedValue({ imported: 2, errors: [] })
    await next.trigger('click')
    await flushPromises()

    expect(runValidateAndImport).toHaveBeenCalledTimes(1)
    expect(startDigifiNextPage).toHaveBeenCalledTimes(1)
    expect(navigateTo).not.toHaveBeenCalled()
    expect(showToast).toHaveBeenCalledWith('Imported. Scan the next page.', { type: 'success' })
    wrapper.unmount()
  })

  it('stays on the page and skips the next scan when import fails', async () => {
    const { wrapper, startDigifiNextPage } = await openWebConfirm()
    runValidateAndImport.mockResolvedValue({
      imported: 0,
      errors: [{ rowIndex: -1, message: 'No rows with data to import.' }],
    })

    await wrapper.get('[data-testid="import-and-scan-next"]').trigger('click')
    await flushPromises()

    expect(startDigifiNextPage).not.toHaveBeenCalled()
    expect(navigateTo).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('No rows with data to import.')
    wrapper.unmount()
  })

  it('keeps plain Import on the path home', async () => {
    const { wrapper, startDigifiNextPage } = await openWebConfirm()
    runValidateAndImport.mockResolvedValue({ imported: 2, errors: [] })

    const importButton = wrapper.findAll('button').find((button) => button.text() === 'Import to Logifi')
    expect(importButton).toBeTruthy()
    await importButton!.trigger('click')
    await flushPromises()

    expect(navigateTo).toHaveBeenCalledWith('/dashboard')
    expect(startDigifiNextPage).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('opens the next scan from the phone review bar and does not leave on failure', async () => {
    const { wrapper, startDigifiNextPage } = await openMobileConfirm()
    expect(wrapper.get('[data-testid="import-and-scan-next"]').text()).toBe('Import and Scan Next Page')

    runValidateAndImport.mockResolvedValue({
      imported: 1,
      errors: [{ rowIndex: 1, message: 'Save failed: disk' }],
    })
    await wrapper.get('[data-testid="import-and-scan-next"]').trigger('click')
    await flushPromises()
    expect(startDigifiNextPage).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Row 1: Save failed: disk')

    runValidateAndImport.mockResolvedValue({ imported: 3, errors: [] })
    await wrapper.get('button').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="import-and-scan-next"]').trigger('click')
    await flushPromises()

    expect(startDigifiNextPage).toHaveBeenCalledTimes(1)
    expect(navigateTo).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
