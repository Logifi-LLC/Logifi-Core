import { describe, expect, it } from 'vitest'
import {
  formatBuilderValidationErrors,
  formatRowNumberList,
} from '../../app/utils/builderValidationMessages'
import { columnLayoutSignature } from '../../app/utils/logbookBuilderTemplates'
import { digifiPageReadError } from '../../app/utils/digifiPageScanError'

const PIC =
  'PIC, Solo, SIC, or Dual Received time is required per 14 CFR Part 61.51(b) when logging flight time'

describe('formatRowNumberList', () => {
  it('uses ranges and commas', () => {
    expect(formatRowNumberList([1, 2, 3, 4, 5, 8, 10, 11])).toBe('1\u20135, 8, 10\u201311')
  })
})

describe('formatBuilderValidationErrors', () => {
  it('groups the PIC time error into Derek’s line and still lists every row', () => {
    const errors = [1, 2, 3, 4, 5].map((rowIndex) => ({ rowIndex, message: PIC }))
    expect(formatBuilderValidationErrors(errors)).toEqual([
      'Rows 1\u20135 need PIC, SIC, or Dual Received time. Make sure you have all the columns you need.',
    ])
  })

  it('uses the singular line for one row', () => {
    expect(formatBuilderValidationErrors([{ rowIndex: 3, message: PIC }])).toEqual([
      'Row 3 needs PIC, SIC, or Dual Received time. Make sure you have all the columns you need.',
    ])
  })

  it('groups other repeated row errors into one short line', () => {
    const message = 'Date is required per 14 CFR Part 61.51(b)'
    expect(
      formatBuilderValidationErrors([
        { rowIndex: 1, message },
        { rowIndex: 2, message },
        { rowIndex: 4, message: 'Destination airport is required per 14 CFR Part 61.51(b)' },
      ])
    ).toEqual([
      'Rows 1\u20132: Date is required',
      'Row 4: Destination airport is required',
    ])
  })

  it('keeps global errors as their own lines', () => {
    expect(
      formatBuilderValidationErrors([
        { rowIndex: -1, message: 'Please sign in to import entries.' },
        { rowIndex: 2, message: PIC },
      ])
    ).toEqual([
      'Please sign in to import entries.',
      'Row 2 needs PIC, SIC, or Dual Received time. Make sure you have all the columns you need.',
    ])
  })
})

describe('columnLayoutSignature', () => {
  it('matches the same columns regardless of width', () => {
    const left = columnLayoutSignature({
      layout: 'two-page',
      splitIndex: 3,
      columns: [
        { fieldKey: 'date', label: 'Date', order: 0 },
        { fieldKey: 'pic', label: 'PIC', order: 1 },
      ],
    })
    const right = columnLayoutSignature({
      layout: 'two-page',
      splitIndex: 3,
      columns: [
        { fieldKey: 'pic', label: 'PIC', order: 1 },
        { fieldKey: 'date', label: 'Date', order: 0 },
      ],
    })
    expect(left).toBe(right)
    expect(
      columnLayoutSignature({
        layout: 'single',
        splitIndex: 3,
        columns: [
          { fieldKey: 'date', label: 'Date', order: 0 },
          { fieldKey: 'pic', label: 'PIC', order: 1 },
        ],
      })
    ).not.toBe(left)
  })

  it('treats column kind as part of the layout', () => {
    const day = columnLayoutSignature({
      layout: 'single',
      splitIndex: null,
      columns: [{ fieldKey: null, label: 'Day', order: 0, columnKind: 'day' }],
    })
    const custom = columnLayoutSignature({
      layout: 'single',
      splitIndex: null,
      columns: [{ fieldKey: null, label: 'Day', order: 0, columnKind: 'custom' }],
    })
    expect(day).not.toBe(custom)
  })
})

describe('digifiPageReadError', () => {
  it('names the side that could not be read', () => {
    expect(digifiPageReadError('left')).toBe("Left page couldn't be read. Retake the left page.")
    expect(digifiPageReadError('right')).toBe("Right page couldn't be read. Retake the right page.")
  })
})
