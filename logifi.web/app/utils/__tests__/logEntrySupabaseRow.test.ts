import { describe, expect, it } from 'vitest'
import { logEntryTagsFromSupabaseRow } from '../logEntrySupabaseRow'

describe('logEntryTagsFromSupabaseRow', () => {
  it('copies tags from an inline-save update .select() row', () => {
    const updateResult = {
      id: 'fictional-entry-uuid',
      date: '2024-06-01',
      tags: ['Checkride', 'Part 135', 'Turbine'],
    }

    const tags = logEntryTagsFromSupabaseRow(updateResult)

    expect(tags).toEqual(['Checkride', 'Part 135', 'Turbine'])
    expect(tags).not.toBe(updateResult.tags)
  })

  it('returns [] when tags are missing or not an array', () => {
    expect(logEntryTagsFromSupabaseRow({})).toEqual([])
    expect(logEntryTagsFromSupabaseRow({ tags: null })).toEqual([])
    expect(logEntryTagsFromSupabaseRow({ tags: 'Checkride' })).toEqual([])
  })
})