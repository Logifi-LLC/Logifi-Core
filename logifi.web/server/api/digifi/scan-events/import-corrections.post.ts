import { createError, defineEventHandler, readBody } from 'h3'
import { getUserIdFromEvent } from '../../../utils/supabase'
import { isValidSpreadId } from '../../../utils/digifiSpreadRecovery'
import { logDigifiImportCorrectionsEventSafe } from '../../../utils/digifiScanEvents'
import { sanitizeDigifiColumnCorrectionCounts } from '../../../../shared/digifiColumnCorrectionCounts'

interface ImportCorrectionsBody {
  spreadId?: string
  columnCorrections?: Record<string, unknown>
}

/**
 * Record Digifi Review→Import column correction counts (field keys and counts only).
 * Fire-and-forget from the client; always returns ok when authenticated.
 */
export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromEvent(event)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = (await readBody(event)) as ImportCorrectionsBody
  const spreadId = typeof body.spreadId === 'string' ? body.spreadId.trim() : ''
  if (!isValidSpreadId(spreadId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid spreadId' })
  }

  const columnCorrections = sanitizeDigifiColumnCorrectionCounts(body.columnCorrections)
  if (!columnCorrections) {
    return { ok: true as const, recorded: false }
  }

  logDigifiImportCorrectionsEventSafe({
    userId,
    spreadId,
    columnCorrections,
  })

  return { ok: true as const, recorded: true }
})
