import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import LogbookBuilderToolbar from '../../app/components/logbook-builder/LogbookBuilderToolbar.vue'
import DigifiMobileValidateBar from '../../app/components/digifi/DigifiMobileValidateBar.vue'
import { useLogbookBuilderGrid } from '../../app/composables/useLogbookBuilderGrid'
import { supabase } from '~/lib/supabase'

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

function queryChain(result: { data: unknown; error: unknown }) {
  const api: Record<string, ReturnType<typeof vi.fn>> = {}
  const self = () => api
  for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'in', 'order', 'limit']) {
    api[method] = vi.fn(self)
  }
  api.maybeSingle = vi.fn().mockResolvedValue(result)
  return api
}

describe('bottom Save Template', () => {
  it('keeps Load template in the toolbar and saves from the bottom button', async () => {
    const grid = useLogbookBuilderGrid()
    const toolbar = mount(LogbookBuilderToolbar, {
      attachTo: document.body,
      global: {
        provide: { logbookBuilderGrid: grid },
        stubs: { Icon: true },
      },
    })

    expect(toolbar.findAll('button').some((button) => button.text() === 'Load template')).toBe(true)
    expect(toolbar.findAll('button').some((button) => button.text() === 'Save template')).toBe(false)
    expect(grid.openSaveTemplate.value).toEqual(expect.any(Function))

    const lookup = queryChain({ data: { id: 'tmpl-1', name: 'Jeppesen' }, error: null })
    vi.mocked(supabase.from).mockReturnValue(lookup as never)
    grid.noteTemplateApplied('tmpl-1', 'previous-layout')
    await grid.openSaveTemplate.value?.()
    await flushPromises()

    const name = document.body.querySelector(
      'input[placeholder="e.g. Jeppesen 10-row"]'
    ) as HTMLInputElement | null
    expect(name?.value).toBe('Jeppesen')
    toolbar.unmount()
  })

  it('opens the phone name field from the review Save Template button', async () => {
    const grid = useLogbookBuilderGrid()
    const bar = mount(DigifiMobileValidateBar, {
      global: { provide: { logbookBuilderGrid: grid } },
    })
    await flushPromises()

    const validate = bar.findAll('button').find((button) => button.text() === 'Validate')
    const save = bar.findAll('button').find((button) => button.text() === 'Save Template')
    expect(validate).toBeTruthy()
    expect(save).toBeTruthy()
    expect(bar.findAll('button')[0]!.text()).toBe('Validate')

    const lookup = queryChain({ data: { id: 'tmpl-1', name: 'Jeppesen' }, error: null })
    vi.mocked(supabase.from).mockReturnValue(lookup as never)
    grid.noteTemplateApplied('tmpl-1', 'previous-layout')
    await save!.trigger('click')
    await flushPromises()

    const name = bar.get('input[placeholder="Template name"]')
    expect((name.element as HTMLInputElement).value).toBe('Jeppesen')
    bar.unmount()
  })
})
