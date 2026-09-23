import {
  DIGIFI_FEW_SHOT_FETCH_LIMIT,
  DIGIFI_FEW_SHOT_LIMIT,
  selectTopFewShotPairs,
  type DigifiFewShotPair,
} from '../../app/utils/digifiFewShot'

export type { DigifiFewShotPair } from '../../app/utils/digifiFewShot'
export {
  DIGIFI_FEW_SHOT_LIMIT,
  formatFewShotPromptBlock,
  selectTopFewShotPairs,
} from '../../app/utils/digifiFewShot'

interface LearningProfileRow {
  digifi_learning_opt_in?: boolean | null
}

interface CorrectionFeedbackQueryRow {
  field_key: string | null
  raw_value: string | null
  corrected_value: string | null
  sample_count: number | null
  last_corrected_at: string | null
}

async function isDigifiLearningOptedIn(supabase: any, userId: string): Promise<boolean> {
  const { data, error } = await (supabase.from('user_profiles') as any)
    .select('digifi_learning_opt_in')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.warn('[digifi] few-shot opt-in lookup failed:', error.message)
    return true
  }

  const profile = data as LearningProfileRow | null
  return profile?.digifi_learning_opt_in ?? true
}

/**
 * Load this pilot's top raw→fixed correction pairs for the scan prompt.
 * Empty when opted out, on query failure, or when no corrections exist.
 */
export async function loadDigifiFewShotExamples(
  supabase: any,
  userId: string
): Promise<DigifiFewShotPair[]> {
  const optedIn = await isDigifiLearningOptedIn(supabase, userId)
  if (!optedIn) return []

  const { data, error } = await (supabase.from('digifi_correction_feedback') as any)
    .select('field_key, raw_value, corrected_value, sample_count, last_corrected_at')
    .eq('user_id', userId)
    .order('sample_count', { ascending: false })
    .order('last_corrected_at', { ascending: false })
    .limit(DIGIFI_FEW_SHOT_FETCH_LIMIT)

  if (error) {
    console.warn('[digifi] few-shot corrections load failed:', error.message)
    return []
  }

  return selectTopFewShotPairs((data ?? []) as CorrectionFeedbackQueryRow[], DIGIFI_FEW_SHOT_LIMIT)
}
