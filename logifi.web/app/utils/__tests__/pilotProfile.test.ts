import { describe, expect, it } from 'vitest'
import { getPilotInitialsFromName } from '../pilotProfile'

describe('getPilotInitialsFromName', () => {
  it('uses first and last name letters', () => {
    expect(getPilotInitialsFromName('Derek A Farmer')).toBe('DF')
    expect(getPilotInitialsFromName('Charles Elwood Yeager')).toBe('CY')
  })

  it('returns empty string when name is empty (for paper airplane avatar fallback)', () => {
    expect(getPilotInitialsFromName('')).toBe('')
  })
})
