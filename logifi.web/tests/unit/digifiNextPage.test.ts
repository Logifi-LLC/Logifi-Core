import { describe, expect, it } from 'vitest'
import { useLogbookBuilderGrid } from '../../app/composables/useLogbookBuilderGrid'
import {
  digifiImportSucceeded,
  nextDigifiPageSettings,
  planDigifiNextCapture,
} from '../../app/utils/digifiNextPage'

describe('next Digifi page settings', () => {
  it('keeps the column template, locked year, and layout', () => {
    const current = {
      columns: [
        { id: 'date-col', label: 'Date', fieldKey: 'date' as const, order: 0 },
        { id: 'from-col', label: 'From', fieldKey: 'departure' as const, order: 1 },
      ],
      layout: 'two-page' as const,
      defaultYear: 2023,
      twoPageSplitIndex: 1,
      rowCount: 12,
    }

    const next = nextDigifiPageSettings(current)

    expect(next).toEqual(current)
    expect(next.columns).not.toBe(current.columns)
    expect(next.defaultYear).toBe(2023)
    next.columns[0].label = 'Changed'
    expect(current.columns[0].label).toBe('Date')
  })

  it('does not advance a 2023 lock when the imported page resolved a 2024 date', () => {
    const next = nextDigifiPageSettings({
      columns: [{ id: 'date-col', label: 'Date', fieldKey: 'date', order: 0 }],
      layout: 'single',
      defaultYear: 2023,
      twoPageSplitIndex: 1,
      rowCount: 8,
    })

    expect(next.defaultYear).toBe(2023)
    expect(next.layout).toBe('single')
  })
})

describe('planDigifiNextCapture', () => {
  it('reuses an active QR session and does not open the camera', () => {
    expect(planDigifiNextCapture({ method: 'qr', qrSessionActive: true })).toEqual({
      reuseQrSession: true,
      openCamera: false,
      qrExpired: false,
    })
  })

  it('does not reuse an expired QR session', () => {
    expect(planDigifiNextCapture({ method: 'qr', qrSessionActive: false })).toEqual({
      reuseQrSession: false,
      openCamera: false,
      qrExpired: true,
    })
  })

  it('opens the in-app camera for Eye capture', () => {
    expect(planDigifiNextCapture({ method: 'camera', qrSessionActive: false })).toEqual({
      reuseQrSession: false,
      openCamera: true,
      qrExpired: false,
    })
  })

  it('keeps file capture on the page without a new phone session', () => {
    expect(planDigifiNextCapture({ method: 'file', qrSessionActive: false })).toEqual({
      reuseQrSession: false,
      openCamera: false,
      qrExpired: false,
    })
  })
})

describe('digifiImportSucceeded', () => {
  it('advances only when rows imported and nothing failed', () => {
    expect(digifiImportSucceeded({ imported: 4, errors: [] })).toBe(true)
    expect(digifiImportSucceeded({ imported: 0, errors: [{ message: 'No rows' }] })).toBe(false)
    expect(digifiImportSucceeded({ imported: 2, errors: [{ message: 'Save failed' }] })).toBe(false)
  })
})

describe('useLogbookBuilderGrid beginNextDigifiPage', () => {
  it('keeps template, year, and layout, and clears the previous page rows', () => {
    const grid = useLogbookBuilderGrid()
    grid.loadTemplate({
      layout: 'two-page',
      default_row_count: 4,
      two_page_split_index: 1,
      default_import_role: 'SIC',
      columns: [
        { id: 'date-col', label: 'Date', fieldKey: 'date', order: 0 },
        { id: 'from-col', label: 'From', fieldKey: 'departure', order: 1 },
        { id: 'to-col', label: 'To', fieldKey: 'destination', order: 2 },
      ],
    })
    grid.defaultYear.value = 2023
    grid.setCell(0, 'date-col', '2024-01-06')
    grid.setCell(0, 'from-col', 'KORD')
    grid.setCell(1, 'to-col', 'KDEN')
    grid.setRowTags(0, ['training'])
    grid.leftPageScanned.value = true
    const spreadBefore = grid.spreadId.value

    grid.beginNextDigifiPage()

    expect(grid.columns.value.map((column) => ({
      id: column.id,
      label: column.label,
      fieldKey: column.fieldKey,
      order: column.order,
    }))).toEqual([
      { id: 'date-col', label: 'Date', fieldKey: 'date', order: 0 },
      { id: 'from-col', label: 'From', fieldKey: 'departure', order: 1 },
      { id: 'to-col', label: 'To', fieldKey: 'destination', order: 2 },
    ])
    expect(grid.layout.value).toBe('two-page')
    expect(grid.twoPageSplitIndex.value).toBe(1)
    expect(grid.defaultYear.value).toBe(2023)
    expect(grid.defaultImportRole.value).toBe('SIC')
    expect(grid.rowCount.value).toBe(4)
    expect(grid.rows.value).toHaveLength(4)
    expect(grid.rows.value.every((row) => Object.values(row.cells).every((value) => value === ''))).toBe(true)
    expect(grid.rows.value.every((row) => (row.tags ?? []).length === 0)).toBe(true)
    expect(grid.leftPageScanned.value).toBe(false)
    expect(grid.spreadId.value).not.toBe(spreadBefore)
  })

  it('keeps Day and custom columns on the template', () => {
    const grid = useLogbookBuilderGrid()
    grid.loadTemplate({
      layout: 'single',
      default_row_count: 2,
      columns: [
        { id: 'date-col', label: 'Date', fieldKey: 'date', order: 0, width: 90 },
        { id: 'asel-col', label: 'ASEL', fieldKey: 'categoryClass', order: 1, categoryClassValue: 'ASEL', width: 70 },
        { id: 'day-col', label: 'Day', fieldKey: null, order: 2, columnKind: 'day', width: 70 },
        { id: 'gear-col', label: 'Retractable Gear', fieldKey: null, order: 3, columnKind: 'custom', width: 120 },
      ],
    })
    grid.setCell(0, 'day-col', '1.2')
    grid.setCell(0, 'gear-col', '✓')

    const next = grid.beginNextDigifiPage()

    expect(next.columns.map((column) => ({
      id: column.id,
      label: column.label,
      fieldKey: column.fieldKey,
      columnKind: column.columnKind,
      categoryClassValue: column.categoryClassValue,
    }))).toEqual([
      { id: 'date-col', label: 'Date', fieldKey: 'date', columnKind: undefined, categoryClassValue: undefined },
      { id: 'asel-col', label: 'ASEL', fieldKey: 'categoryClass', columnKind: undefined, categoryClassValue: 'ASEL' },
      { id: 'day-col', label: 'Day', fieldKey: null, columnKind: 'day', categoryClassValue: undefined },
      { id: 'gear-col', label: 'Retractable Gear', fieldKey: null, columnKind: 'custom', categoryClassValue: undefined },
    ])
    expect(grid.columns.value.map((column) => ({
      id: column.id,
      label: column.label,
      columnKind: column.columnKind,
      categoryClassValue: column.categoryClassValue,
      width: column.width,
    }))).toEqual([
      { id: 'date-col', label: 'Date', columnKind: undefined, categoryClassValue: undefined, width: 90 },
      { id: 'asel-col', label: 'ASEL', columnKind: undefined, categoryClassValue: 'ASEL', width: 70 },
      { id: 'day-col', label: 'Day', columnKind: 'day', categoryClassValue: undefined, width: 70 },
      { id: 'gear-col', label: 'Retractable Gear', columnKind: 'custom', categoryClassValue: undefined, width: 120 },
    ])
    expect(grid.rows.value.every((row) => row.cells['day-col'] === '' && row.cells['gear-col'] === '')).toBe(true)
  })

  it('keeps a single-page layout', () => {
    const grid = useLogbookBuilderGrid()
    grid.loadTemplate({
      layout: 'single',
      default_row_count: 3,
      columns: [
        { id: 'date-col', label: 'Date', fieldKey: 'date', order: 0 },
        { id: 'ident-col', label: 'Ident', fieldKey: 'identification', order: 1 },
      ],
    })
    grid.defaultYear.value = 2023
    grid.setCell(0, 'ident-col', 'N12345')

    grid.beginNextDigifiPage()

    expect(grid.layout.value).toBe('single')
    expect(grid.defaultYear.value).toBe(2023)
    expect(grid.columns.value.map((column) => column.id)).toEqual(['date-col', 'ident-col'])
    expect(grid.rows.value.every((row) => row.cells['ident-col'] === '')).toBe(true)
  })
})
