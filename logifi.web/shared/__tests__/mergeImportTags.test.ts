import { describe, expect, it } from 'vitest'
import { incomingTagsAddToExisting, mergeIncomingTags } from '../import/mergeImportTags'

describe('mergeIncomingTags', () => {
  it('adds 135 XC onto an existing untagged duplicate', () => {
    expect(mergeIncomingTags([], ['135 XC'])).toEqual(['135 XC'])
    expect(incomingTagsAddToExisting([], ['135 XC'])).toBe(true)
  })

  it('keeps existing tags and appends only new ones', () => {
    expect(mergeIncomingTags(['IPC'], ['135 XC', 'IPC'])).toEqual(['IPC', '135 XC'])
  })

  it('does not treat a re-import of the same tags as a change', () => {
    expect(incomingTagsAddToExisting(['135 XC', 'Flight Review'], ['135 XC'])).toBe(false)
    expect(mergeIncomingTags(['135 XC', 'Flight Review'], ['135 XC'])).toEqual([
      '135 XC',
      'Flight Review',
    ])
  })

  it('trims blanks and ignores empty incoming', () => {
    expect(mergeIncomingTags(['PIC'], ['', ' 135 XC ', null as unknown as string])).toEqual([
      'PIC',
      '135 XC',
    ])
    expect(incomingTagsAddToExisting(['PIC'], [])).toBe(false)
  })
})
