import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '~/lib/supabase'
import { loadLastTemplateIfAny } from '~/composables/useLogbookBuilderLastTemplate'
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
