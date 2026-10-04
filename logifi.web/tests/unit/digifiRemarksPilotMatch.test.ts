import { describe, expect, it } from 'vitest'
import { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import {
  applyCatalogPilotsFromRemarks,
  foldExtractedPilotIntoRemarks,
  matchCatalogPilotInRemarks,
} from '~/utils/digifiRemarksPilotMatch'

const CATALOG = [
  'Matt Willems',
  'Quentin Harrold',
  'Zack Hannan',
  'Mike Brewer',
  'Paul Faurote',
]

describe('matchCatalogPilotInRemarks', () => {
  it('returns the catalog spelling on a whole-name hit', () => {
    expect(matchCatalogPilotInRemarks('matt willems', CATALOG)).toBe('Matt Willems')
  })

  it('returns null when the remarks name is not in the catalog', () => {
    expect(matchCatalogPilotInRemarks('Travis Berlin High Performance', CATALOG)).toBeNull()
  })

  it('matches a catalog name when lesson words follow it', () => {
    expect(matchCatalogPilotInRemarks('Zack Hannan Xwind', CATALOG)).toBe('Zack Hannan')
    expect(matchCatalogPilotInRemarks('Mike Brewer IRA Refresher', CATALOG)).toBe('Mike Brewer')
  })

  it('treats Last, First and extra spaces as the same whole name', () => {
    expect(matchCatalogPilotInRemarks('Harrold, Quentin', CATALOG)).toBe('Quentin Harrold')
    expect(matchCatalogPilotInRemarks('Harrold, Quentin checkride', CATALOG)).toBe(
      'Quentin Harrold'
    )
    expect(matchCatalogPilotInRemarks('Quentin   Harrold', ['Harrold, Quentin'])).toBe(
      'Harrold, Quentin'
    )
    expect(matchCatalogPilotInRemarks('Zack   Hannan  Xwind', CATALOG)).toBe('Zack Hannan')
  })

  it('returns null when more than one catalog name matches', () => {
    expect(
      matchCatalogPilotInRemarks('Zack Hannan and Mike Brewer IRA', CATALOG)
    ).toBeNull()
    expect(
      matchCatalogPilotInRemarks('Zack Hannan Jr', ['Zack Hannan', 'Zack Hannan Jr'])
    ).toBeNull()
  })

  it('does not fuzzy-match a different person', () => {
    expect(matchCatalogPilotInRemarks('Nick Farhoumand', ['Nicholas Farhoumand'])).toBeNull()
  })

  it('counts Last, First and First Last catalog entries as one person', () => {
    expect(
      matchCatalogPilotInRemarks('Zack Hannan Xwind', ['Hannan, Zack', 'Zack Hannan'])
    ).toBe('Zack Hannan')
  })
})

describe('foldExtractedPilotIntoRemarks', () => {
  const columns = [
    { id: 'remarks', fieldKey: 'remarks' },
    { id: 'pilots', fieldKey: 'pilots' },
    { id: 'pilot-role', fieldKey: 'pilotRole' },
  ]

  it('puts the extracted pilots text back into empty remarks and clears pilots', () => {
    const [row] = foldExtractedPilotIntoRemarks(
      [{ rowIndex: 0, cells: { pilots: 'Zack Hannan Xwind', remarks: '', 'pilot-role': 'Instructor' } }],
      columns
    )
    expect(row?.cells.remarks).toBe('Zack Hannan Xwind')
    expect(row?.cells.pilots).toBeUndefined()
    expect(row?.cells['pilot-role']).toBe('Instructor')
  })

  it('does not strip a name that is already in remarks', () => {
    const [row] = foldExtractedPilotIntoRemarks(
      [{ cells: { pilots: 'Zack Hannan', remarks: 'Zack Hannan Xwind' } }],
      columns
    )
    expect(row?.cells.remarks).toBe('Zack Hannan Xwind')
    expect(row?.cells.pilots).toBeUndefined()
  })

  it('appends extracted text that remarks does not already contain', () => {
    const [row] = foldExtractedPilotIntoRemarks(
      [{ cells: { pilots: 'Zack Hannan', remarks: 'Xwind' } }],
      columns
    )
    expect(row?.cells.remarks).toBe('Xwind | Zack Hannan')
  })
})

describe('applyCatalogPilotsFromRemarks', () => {
  function gridWithPilotColumns() {
    const grid = useLogbookBuilderGrid()
    grid.addColumn('remarks')
    grid.addColumn('pilots')
    grid.addColumn('pilotRole')
    grid.addColumn('role')
    return grid
  }

  it('fills pilots from a catalog hit and leaves remarks and pilot role alone', () => {
    const grid = gridWithPilotColumns()
    const remarks = grid.visibleColumns.value.find((column) => column.fieldKey === 'remarks')!
    const pilots = grid.visibleColumns.value.find((column) => column.fieldKey === 'pilots')!
    const pilotRole = grid.visibleColumns.value.find((column) => column.fieldKey === 'pilotRole')!
    const role = grid.visibleColumns.value.find((column) => column.fieldKey === 'role')!
    grid.setCell(0, remarks.id, 'Zack Hannan Xwind')
    grid.setCell(0, pilotRole.id, 'Instructor')
    grid.setCell(0, role.id, 'Instructor')

    applyCatalogPilotsFromRemarks(grid, CATALOG, { rowIndexes: [0] })

    expect(grid.rows.value[0]?.cells?.[pilots.id]).toBe('Zack Hannan')
    expect(grid.rows.value[0]?.cells?.[remarks.id]).toBe('Zack Hannan Xwind')
    expect(grid.rows.value[0]?.cells?.[pilotRole.id]).toBe('Instructor')
    expect(grid.rows.value[0]?.cells?.[role.id]).toBe('Instructor')
  })

  it('leaves pilots blank when nothing in the catalog matches', () => {
    const grid = gridWithPilotColumns()
    const remarks = grid.visibleColumns.value.find((column) => column.fieldKey === 'remarks')!
    const pilots = grid.visibleColumns.value.find((column) => column.fieldKey === 'pilots')!
    grid.setCell(1, remarks.id, 'Travis Berlin High Performance')
    grid.setCell(1, pilots.id, 'Travis Berlin High Performance')

    applyCatalogPilotsFromRemarks(grid, CATALOG, { rowIndexes: [1] })

    expect(grid.rows.value[1]?.cells?.[pilots.id]).toBe('')
    expect(grid.rows.value[1]?.cells?.[remarks.id]).toBe('Travis Berlin High Performance')
  })

  it('does not overwrite a confirmed pilots cell when the catalog arrives late', () => {
    const grid = gridWithPilotColumns()
    const remarks = grid.visibleColumns.value.find((column) => column.fieldKey === 'remarks')!
    const pilots = grid.visibleColumns.value.find((column) => column.fieldKey === 'pilots')!
    grid.setCell(0, remarks.id, 'Zack Hannan Xwind')
    grid.setCell(0, pilots.id, 'Kept Name')
    grid.setDigifiCellMeta(0, pilots.id, {
      fieldKey: 'pilots',
      rawValue: 'Kept Name',
      resolvedValue: 'Kept Name',
      strategy: 'raw',
      confidence: 'high',
      autoApplied: false,
      needsReview: false,
      userConfirmed: true,
    })

    applyCatalogPilotsFromRemarks(grid, CATALOG, { fillEmptyOnly: true })

    expect(grid.rows.value[0]?.cells?.[pilots.id]).toBe('Kept Name')
  })
})
