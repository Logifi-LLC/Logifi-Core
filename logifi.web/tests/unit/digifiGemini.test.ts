import { describe, it, expect } from 'vitest'
import { parseGeminiJsonText } from '../../server/utils/digifiGemini'

describe('parseGeminiJsonText', () => {
  it('parses plain JSON', () => {
    expect(parseGeminiJsonText('{"rows":[]}')).toEqual({ rows: [] })
  })

  it('strips markdown json fences', () => {
    expect(parseGeminiJsonText('```json\n{"rows":[]}\n```')).toEqual({ rows: [] })
  })
})
