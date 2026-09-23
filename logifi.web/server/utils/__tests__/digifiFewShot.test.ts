import { describe, expect, it, vi } from 'vitest'
import { loadDigifiFewShotExamples } from '../digifiFewShot'

function mockSupabase(options: {
  optedIn?: boolean | null
  profileError?: { message: string } | null
  rows?: Array<Record<string, unknown>>
  feedbackError?: { message: string } | null
}) {
  return {
    from(table: string) {
      if (table === 'user_profiles') {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () =>
                    options.profileError
                      ? { data: null, error: options.profileError }
                      : { data: { digifi_learning_opt_in: options.optedIn }, error: null },
                }
              },
            }
          },
        }
      }
      return {
        select() {
          return {
            eq() {
              return {
                order() {
                  return {
                    order() {
                      return {
                        limit: async () =>
                          options.feedbackError
                            ? { data: null, error: options.feedbackError }
                            : { data: options.rows ?? [], error: null },
                      }
                    },
                  }
                },
              }
            },
          }
        },
      }
    },
  }
}

describe('loadDigifiFewShotExamples', () => {
  it('returns nothing when the pilot opted out of learning', async () => {
    const pairs = await loadDigifiFewShotExamples(
      mockSupabase({ optedIn: false, rows: [{ field_key: 'destination', raw_value: 'KMDW', corrected_value: 'MDW', sample_count: 3 }] }),
      'user-1'
    )
    expect(pairs).toEqual([])
  })

  it('selects anonymized top pairs from correction feedback', async () => {
    const pairs = await loadDigifiFewShotExamples(
      mockSupabase({
        optedIn: true,
        rows: [
          { field_key: 'identification', raw_value: 'N12SAB', corrected_value: 'N123AB', sample_count: 6, last_corrected_at: '2026-05-02T00:00:00Z' },
          { field_key: 'destination', raw_value: 'KMDW', corrected_value: 'MDW', sample_count: 2, last_corrected_at: '2026-05-01T00:00:00Z' },
        ],
      }),
      'user-1'
    )
    expect(pairs).toEqual([
      expect.objectContaining({ fieldKey: 'identification', rawValue: 'N12SAB', correctedValue: 'N123AB' }),
      expect.objectContaining({ fieldKey: 'destination', rawValue: 'KMDW', correctedValue: 'MDW' }),
    ])
  })

  it('fails open when feedback query errors', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const pairs = await loadDigifiFewShotExamples(
      mockSupabase({ optedIn: true, feedbackError: { message: 'timeout' } }),
      'user-1'
    )
    expect(pairs).toEqual([])
    warn.mockRestore()
  })
})
