import { supabase } from '~/lib/supabase'
import {
  FULL_BACKUP_LIST_PAGE_SIZE,
  FULL_BACKUP_STORAGE_BUCKETS,
  type FullBackupStorageBucket,
} from './fullBackupConstants'
import type { ListedStorageObject } from './fullBackupTypes'

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function listFolderObjects(
  bucket: FullBackupStorageBucket,
  folder: string
): Promise<ListedStorageObject[]> {
  const results: ListedStorageObject[] = []
  let offset = 0

  for (;;) {
    const { data, error } = await supabase.storage.from(bucket).list(folder, {
      limit: FULL_BACKUP_LIST_PAGE_SIZE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error) {
      throw new Error(`Could not list ${bucket}/${folder}: ${error.message}`)
    }
    const items = data ?? []
    if (items.length === 0) break

    for (const item of items) {
      const childPath = folder ? `${folder}/${item.name}` : item.name
      if (item.id == null) {
        const nested = await listFolderObjects(bucket, childPath)
        results.push(...nested)
      } else {
        results.push({ bucket, path: childPath })
      }
    }

    if (items.length < FULL_BACKUP_LIST_PAGE_SIZE) break
    offset += items.length
  }

  return results
}

/** List all storage objects the signed-in user can read under their uid prefix (RLS). */
export async function listUserFullBackupStorageObjects(userId: string): Promise<ListedStorageObject[]> {
  const prefix = userId
  const all: ListedStorageObject[] = []

  for (const bucket of FULL_BACKUP_STORAGE_BUCKETS) {
    try {
      const objects = await listFolderObjects(bucket, prefix)
      all.push(...objects)
    } catch (err) {
      console.warn(`[full-backup] skip bucket ${bucket}:`, err)
    }
  }

  return all
}

export async function downloadStorageObject(
  bucket: string,
  objectPath: string
): Promise<Uint8Array | null> {
  const { data, error } = await supabase.storage.from(bucket).download(objectPath)
  if (error || !data) {
    return null
  }
  const buf = new Uint8Array(await data.arrayBuffer())
  return buf
}

export function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}