import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  estimateGeminiCostUsd,
  insertDigifiScanEvent,
  logDigifiGeminiCallEventSafe,
  recordDigifiGeminiCallEvent,
  recordDigifiImportCorrectionsEvent,
} from '../digifiScanEvents'
import * as supabaseService from '../supabaseService'

const insertMock = vi.fn()

beforeEach(() => {
  insertMock.mockReset()
  insertMock.mockResolvedValue({ error: null })
  vi.spyOn(supabaseService, 'getSupabaseServiceClient').mockReturnValue({
    from: () => ({ insert: insertMock }),
  } as any)
})

describe('estimateGeminiCostUsd', () => {
  it('returns a fixed-scale decimal string for flash models', () => {
    const cost = estimateGeminiCostUsd('gemini-3.8-flash', 1_000_000, 500_000)
    expect(cost).toBe('0.45000000')
  })
})

describe('recordDigifiGeminiCallEvent', () => {
  it('inserts token metrics and estimated cost on success', async () => {
    await recordDigifiGeminiCallEvent({
      context: {
        userId: 'user-1',
        scanSessionId: 'scan-1',
        spreadId: '550e8400-e29b-41d4-a716-446655440000',
        pageSide: 'left',
      },
      model: 'gemini-3.8-flash',
      promptTokens: 1000,
      outputTokens: 200,
      totalTokens: 1200,
      latencyMs: 42,
      status: 'ok',
    })

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        scan_session_id: 'scan-1',
        status: 'ok',
        prompt_tokens: 1000,
        output_tokens: 200,
        estimated_cost_usd: expect.any(String),
      })
    )
  })
})

describe('recordDigifiImportCorrectionsEvent', () => {
  it('skips insert when there are no corrections', async () => {
    await recordDigifiImportCorrectionsEvent({
      userId: 'user-1',
      spreadId: '550e8400-e29b-41d4-a716-446655440000',
      columnCorrections: {},
    })
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('stores sanitized field-key counts only', async () => {
    await recordDigifiImportCorrectionsEvent({
      userId: 'user-1',
      spreadId: '550e8400-e29b-41d4-a716-446655440000',
      columnCorrections: { date: 2, registration: 1, 'bad key': 9 },
    })

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'import',
        column_corrections: { date: 2, registration: 1 },
      })
    )
  })
})

describe('insertDigifiScanEvent failures', () => {
  it('does not throw when the service client insert fails', async () => {
    insertMock.mockResolvedValue({ error: { message: 'db down' } })
    await expect(
      insertDigifiScanEvent({
        user_id: 'user-1',
        status: 'error',
        error_code: 'UNKNOWN',
      })
    ).resolves.toBeUndefined()
  })
})

describe('logDigifiGeminiCallEventSafe', () => {
  it('does not throw when logging fails', () => {
    vi.spyOn(supabaseService, 'getSupabaseServiceClient').mockReturnValue(null)
    expect(() =>
      logDigifiGeminiCallEventSafe({
        context: {
          userId: 'user-1',
          scanSessionId: 'scan-1',
          spreadId: '550e8400-e29b-41d4-a716-446655440000',
          pageSide: 'right',
        },
        model: 'gemini-3.8-flash',
        promptTokens: null,
        outputTokens: null,
        totalTokens: null,
        latencyMs: 1,
        status: 'error',
        errorCode: 'CAPACITY',
      })
    ).not.toThrow()
  })
})
