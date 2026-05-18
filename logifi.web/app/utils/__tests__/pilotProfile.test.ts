import { describe, expect, it } from 'vitest'
import { getPilotInitialsFromName } from '../pilotProfile'

describe('getPilotInitialsFromName', () => {
  it('uses first and last name letters', () => {
    expect(getPilotInitialsFromName('Derek A Farmer')).toBe('DF')
    expect(getPilotInitialsFromName('Charles Elwood Yeager')).toBe('CY')
  })

  it('returns PP when name is empty', () => {
    expect(getPilotInitialsFromName('')).toBe('PP')
  })
})
