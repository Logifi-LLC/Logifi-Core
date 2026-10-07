import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '~/lib/supabase'
import { loadLastTemplateIfAny, prefillBuilderTemplateName, saveLogbookBuilderTemplate } from '~/composables/useLogbookBuilderLastTemplate'
import { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import {
  BUILDER_LAST_TEMPLATE_STORAGE_KEY,
  readLastTemplateId,
  writeLastTemplateId,
} from '~/utils/logbookBuilderDraft'

describe('last-used template id', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('stores the id per user on this device', () => {
    writeLastTemplateId('template-a', 'user-a')
    writeLastTemplateId('template-b', 'user-b')
    expect(readLastTemplateId('user-a')).toBe('template-a')
    expect(readLastTemplateId('user-b')).toBe('template-b')
  })

  it('copies a legacy global id into the signed-in user key', () => {
    localStorage.setItem(BUILDER_LAST_TEMPLATE_STORAGE_KEY, 'legacy-id')
    expect(readLastTemplateId('user-a')).toBe('legacy-id')
    expect(readLastTemplateId('user-b')).toBe('legacy-id')
  })

  it('does not clear the saved id when the lookup fails', async () => {
    writeLastTemplateId('tmpl-1', 'user-1')
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'offline' } }),
    } as never)

    const grid = useLogbookBuilderGrid()
    const loaded = await loadLastTemplateIfAny(grid, 'user-1')

    expect(loaded).toBe(false)
    expect(readLastTemplateId('user-1')).toBe('tmpl-1')
    expect(grid.activeTemplateId.value).toBeNull()
  })

  it('clears the id only when that template is gone for this user', async () => {
    writeLastTemplateId('tmpl-1', 'user-1')
    writeLastTemplateId('tmpl-2', 'user-2')
    vi.mocked(supabase.from).mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as never)

    const loaded = await loadLastTemplateIfAny(useLogbookBuilderGrid(), 'user-1')

    expect(loaded).toBe(false)
    expect(readLastTemplateId('user-1')).toBeNull()
    expect(readLastTemplateId('user-2')).toBe('tmpl-2')
  })
})

function queryChain(result: { data: unknown; error: unknown }) {
  const api: Record<string, ReturnType<typeof vi.fn>> = {}
  const self = () => api
  for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'in', 'order', 'limit']) {
    api[method] = vi.fn(self)
  }
  api.maybeSingle = vi.fn().mockResolvedValue(result)
  return api
}

describe('saveLogbookBuilderTemplate', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(supabase.from).mockReset()
  })

  it('inserts a new template, including column kind, when nothing is loaded', async () => {
    const inserted = queryChain({ data: { id: 'new-1' }, error: null })
    vi.mocked(supabase.from).mockReturnValueOnce(inserted as never)

    const grid = useLogbookBuilderGrid()
    grid.addColumn(null, { columnKind: 'custom', label: 'Retractable Gear' })
    const result = await saveLogbookBuilderTemplate(grid, 'user-1', 'Jeppesen')

    expect(result).toEqual({ id: 'new-1', updated: false })
    expect(inserted.update).not.toHaveBeenCalled()
    const payload = inserted.insert.mock.calls[0]?.[0]
    expect(payload.user_id).toBe('user-1')
    expect(payload.name).toBe('Jeppesen')
    expect(payload.columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Retractable Gear', columnKind: 'custom' }),
      ])
    )
    expect(readLastTemplateId('user-1')).toBe('new-1')
    expect(grid.activeTemplateId.value).toBe('new-1')
  })

  it('overwrites the loaded template when the name still matches', async () => {
    const grid = useLogbookBuilderGrid()
    grid.noteTemplateApplied('tmpl-1', 'previous-layout')
    grid.addColumn(null, { columnKind: 'day', label: 'Day' })

    const lookup = queryChain({ data: { id: 'tmpl-1', name: 'Jeppesen' }, error: null })
    const updated = queryChain({ data: { id: 'tmpl-1' }, error: null })
    vi.mocked(supabase.from)
      .mockReturnValueOnce(lookup as never)
      .mockReturnValueOnce(updated as never)

    const result = await saveLogbookBuilderTemplate(grid, 'user-1', ' Jeppesen ')

    expect(result).toEqual({ id: 'tmpl-1', updated: true })
    expect(lookup.update).not.toHaveBeenCalled()
    expect(updated.insert).not.toHaveBeenCalled()
    expect(updated.update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Jeppesen',
        columns: expect.arrayContaining([
          expect.objectContaining({ label: 'Day', columnKind: 'day' }),
        ]),
      })
    )
    expect(updated.update.mock.calls[0]?.[0].user_id).toBeUndefined()
    expect(updated.eq).toHaveBeenCalledWith('id', 'tmpl-1')
    expect(updated.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(grid.activeTemplateId.value).toBe('tmpl-1')
  })

  it('inserts a new template when the loaded name is changed', async () => {
    const grid = useLogbookBuilderGrid()
    grid.noteTemplateApplied('tmpl-1', 'previous-layout')

    const lookup = queryChain({ data: { id: 'tmpl-1', name: 'Jeppesen' }, error: null })
    const inserted = queryChain({ data: { id: 'new-2' }, error: null })
    vi.mocked(supabase.from)
      .mockReturnValueOnce(lookup as never)
      .mockReturnValueOnce(inserted as never)

    const result = await saveLogbookBuilderTemplate(grid, 'user-1', 'Other book')

    expect(result).toEqual({ id: 'new-2', updated: false })
    expect(lookup.update).not.toHaveBeenCalled()
    expect(inserted.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', name: 'Other book' })
    )
    expect(grid.activeTemplateId.value).toBe('new-2')
  })

  it('does not insert when the loaded template cannot be read', async () => {
    const grid = useLogbookBuilderGrid()
    grid.noteTemplateApplied('tmpl-1', 'previous-layout')
    const lookup = queryChain({ data: null, error: { message: 'offline' } })
    vi.mocked(supabase.from).mockReturnValueOnce(lookup as never)

    const result = await saveLogbookBuilderTemplate(grid, 'user-1', 'Jeppesen')

    expect(result).toEqual({ error: 'offline' })
    expect(lookup.insert).not.toHaveBeenCalled()
    expect(lookup.update).not.toHaveBeenCalled()
    expect(grid.activeTemplateId.value).toBe('tmpl-1')
  })

  it('prefills the loaded template name and leaves a blank grid empty', async () => {
    const blank = useLogbookBuilderGrid()
    await expect(prefillBuilderTemplateName(blank, 'user-1')).resolves.toBe('')
    expect(supabase.from).not.toHaveBeenCalled()

    const grid = useLogbookBuilderGrid()
    grid.noteTemplateApplied('tmpl-1', 'previous-layout')
    const lookup = queryChain({ data: { id: 'tmpl-1', name: 'Jeppesen' }, error: null })
    vi.mocked(supabase.from).mockReturnValueOnce(lookup as never)
    await expect(prefillBuilderTemplateName(grid, 'user-1')).resolves.toBe('Jeppesen')
  })
})
