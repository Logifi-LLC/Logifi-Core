import { describe, expect, it } from 'vitest'
import { formatColumnTotal } from '../../app/composables/useLogbookBuilderImport'

describe('formatColumnTotal', () => {
  it('formats integers without decimals', () => {
    expect(
      formatColumnTotal({
        fieldKey: 'dayLandings',
        label: 'Day',
        total: 12,
        isInteger: true,
      })
    ).toBe('12')
  })

  it('formats fractional totals to one decimal', () => {
    expect(
      formatColumnTotal({
        fieldKey: 'total',
        label: 'Total',
        total: 3.25,
        isInteger: false,
      })
    ).toBe('3.3')
  })
})
