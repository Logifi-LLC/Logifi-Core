import type { EndorsementRow } from '~/utils/endorsementIndexedDB'
import type { EndorsementSyncQueueEntry } from '~/utils/endorsementIndexedDB'

function parseTime(iso: string | null | undefined): number {
  if (!iso) return 0
  const t = Date.parse(iso)
  return Number.isNaN(t) ? 0 : t
}

/** Prefer remote signed/imported rows; keep unsynced locals when remote is older or missing. */
export function mergeRemoteEndorsements(input: {
  localRows: EndorsementRow[]
  remoteRows: EndorsementRow[]
  userId: string
  syncQueue: EndorsementSyncQueueEntry[]
}): { merged: EndorsementRow[]; removedIds: string[] } {
  const pendingLocalIds = new Set(
    input.syncQueue
      .filter((q) => ['request', 'issue', 'import', 'sign'].includes(q.operation))
      .map((q) => q.endorsementId)
  )
  const localById = new Map(input.localRows.map((r) => [r.id, r]))
  const remoteById = new Map(input.remoteRows.map((r) => [r.id, r]))
  const merged = new Map<string, EndorsementRow>()
  const removedIds: string[] = []

  for (const remote of input.remoteRows) {
    merged.set(remote.id, remote)
  }

  for (const local of input.localRows) {
    const remote = remoteById.get(local.id)
    if (!remote) {
      if (pendingLocalIds.has(local.id) || local.status !== 'cancelled') {
        merged.set(local.id, local)
      } else {
        removedIds.push(local.id)
      }
      continue
    }

    const remoteUpdated = parseTime(remote.updated_at)
    const localUpdated = parseTime(local.updated_at)

    const remoteFinal = remote.status === 'signed' || remote.status === 'imported'
    const localPendingSign = pendingLocalIds.has(local.id) && local.status === 'signed'

    if (localPendingSign && !remoteFinal) {
      merged.set(local.id, local)
      continue
    }

    if (remoteFinal || remoteUpdated >= localUpdated) {
      merged.set(local.id, remote)
    } else {
      merged.set(local.id, local)
    }
  }

  for (const id of localById.keys()) {
    if (!remoteById.has(id) && !merged.has(id)) {
      removedIds.push(id)
    }
  }

  const visible = [...merged.values()].filter((row) => {
    if (row.status === 'cancelled') return false
    return row.student_id === input.userId || row.instructor_id === input.userId
  })

  return { merged: visible, removedIds }
}