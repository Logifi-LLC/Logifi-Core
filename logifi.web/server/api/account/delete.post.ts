import { defineEventHandler, createError } from 'h3'
import { getUserIdFromEvent } from '../../utils/supabase'
import { getSupabaseServiceClient } from '../../utils/supabaseService'

const STORAGE_BUCKETS = ['digifi-capture', 'digifi-scans', 'flight-signatures'] as const

type ServiceClient = NonNullable<ReturnType<typeof getSupabaseServiceClient>>

async function listAndRemoveUnderPrefix(
  service: ServiceClient,
  bucket: string,
  prefix: string
): Promise<void> {
  const filePaths: string[] = []

  async function walk(folder: string) {
    const { data, error } = await service.storage.from(bucket).list(folder, {
      limit: 1000,
      offset: 0,
    })
    if (error) {
      console.warn(`[account/delete] list ${bucket}/${folder}:`, error.message)
      return
    }

    for (const item of data ?? []) {
      const path = folder ? `${folder}/${item.name}` : item.name
      // Folders typically have null id in Supabase Storage list responses.
      if (item.id === null) {
        await walk(path)
      } else {
        filePaths.push(path)
      }
    }
  }

  await walk(prefix)

  for (let i = 0; i < filePaths.length; i += 100) {
    const chunk = filePaths.slice(i, i + 100)
    if (chunk.length === 0) continue
    const { error } = await service.storage.from(bucket).remove(chunk)
    if (error) {
      console.warn(`[account/delete] remove ${bucket}:`, error.message)
    }
  }
}

/**
 * Permanently deletes the authenticated user's account and associated data.
 * Requires Authorization: Bearer <supabase_access_token>.
 */
export default defineEventHandler(async (event) => {
  const userId = await getUserIdFromEvent(event)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const service = getSupabaseServiceClient()
  if (!service) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Account deletion service is not configured on this server',
    })
  }

  const { error: purgeError } = await service.rpc('purge_user_data_for_account_deletion', {
    p_user_id: userId,
  })
  if (purgeError) {
    console.error('[account/delete] purge RPC failed:', purgeError.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to prepare account data for deletion',
    })
  }

  for (const bucket of STORAGE_BUCKETS) {
    try {
      await listAndRemoveUnderPrefix(service, bucket, userId)
    } catch (err) {
      console.warn(`[account/delete] storage cleanup ${bucket}:`, err)
    }
  }

  const { error: deleteError } = await service.auth.admin.deleteUser(userId)
  if (deleteError) {
    console.error('[account/delete] admin.deleteUser failed:', deleteError.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete account',
    })
  }

  return { success: true as const }
})
