import { describe, expect, it } from 'vitest'
import { buildDigifiScanSessionPayload, isValidSpreadId } from '../digifiScanPayload'
import {
  mapSessionsToSpreadRecovery,
  parseDigifiScanSessionPayload,
  validateSpreadIdParam,
} from '../digifiSpreadRecovery'

const SPREAD_ID = '550e8400-e29b-41d4-a716-446655440000'

describe('buildDigifiScanSessionPayload', () => {
  it('stores rows and diagnostics for recovery', () => {
    const payload = buildDigifiScanSessionPayload({
      pageSide: 'left',
      rows: [{ rowIndex: 0, cells: { date: '01/02' } }],
      filledCellCount: 1,
      reviewMessages: ['Review aircraft'],
      reviewRequiredCount: 1,
      rowsReturned: 1,
      distinctRowIndices: [0],
      missingRowIndices: [],
      duplicateRowIndices: [],
      emptyRowIndices: [],
      hasGaps: false,
      strategyUsed: 'page-overview',
      chunkCount: 0,
      rescueAttempted: false,
      rescueRecoveredCount: 0,
    })

    expect(payload.pageSide).toBe('left')
    expect(payload.rows).toHaveLength(1)
    expect(payload.reviewRequiredCount).toBe(1)
  })
})

describe('isValidSpreadId', () => {
  it('accepts UUIDs and rejects invalid ids', () => {
    expect(isValidSpreadId(SPREAD_ID)).toBe(true)
    expect(isValidSpreadId('not-a-uuid')).toBe(false)
  })
})

describe('mapSessionsToSpreadRecovery', () => {
  it('maps persisted sessions into recovery pages', () => {
    const payload = buildDigifiScanSessionPayload({
      pageSide: 'right',
      rows: [{ rowIndex: 0, cells: { remarks: 'note' } }],
      filledCellCount: 1,
      reviewMessages: [],
      reviewRequiredCount: 0,
      rowsReturned: 1,
      distinctRowIndices: [0],
      missingRowIndices: [],
      duplicateRowIndices: [],
      emptyRowIndices: [],
      hasGaps: false,
      strategyUsed: 'page-overview+row-bands',
      chunkCount: 2,
      rescueAttempted: true,
      rescueRecoveredCount: 1,
    })

    const result = mapSessionsToSpreadRecovery(SPREAD_ID, [
      {
        id: 'scan-1',
        spread_id: SPREAD_ID,
        scan_payload: payload,
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ])

    expect(result.spreadId).toBe(SPREAD_ID)
    expect(result.pages).toHaveLength(1)
    expect(result.pages[0]?.pageSide).toBe('right')
    expect(result.pages[0]?.rows[0]?.cells.remarks).toBe('note')
  })

  it('skips sessions with invalid payload', () => {
    const result = mapSessionsToSpreadRecovery(SPREAD_ID, [
      {
        id: 'scan-1',
        spread_id: SPREAD_ID,
        scan_payload: { bad: true } as never,
        created_at: '2026-01-01T00:00:00.000Z',
      },
    ])

    expect(result.pages).toHaveLength(0)
  })
})

describe('parseDigifiScanSessionPayload', () => {
  it('returns null for malformed payloads', () => {
    expect(parseDigifiScanSessionPayload(null)).toBeNull()
    expect(parseDigifiScanSessionPayload({ pageSide: 'left' })).toBeNull()
  })
})

describe('validateSpreadIdParam', () => {
  it('throws for invalid spread ids', () => {
    expect(() => validateSpreadIdParam(undefined)).toThrow('Invalid spread id')
    expect(() => validateSpreadIdParam('bad-id')).toThrow('Invalid spread id')
    expect(validateSpreadIdParam(SPREAD_ID)).toBe(SPREAD_ID)
  })
})
