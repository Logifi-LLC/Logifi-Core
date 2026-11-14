import type { AsyncZippable } from 'fflate'
import {
  FULL_BACKUP_FETCH_YIELD_EVERY,
  FULL_BACKUP_JSON_ENTRY,
  FULL_BACKUP_MANIFEST_ENTRY,
  fullBackupZipPathForObject,
} from './fullBackupConstants'
import {
  createFullBackupManifest,
  serializeFullBackupManifest,
  type FullBackupManifestFile,
} from './fullBackupManifest'
import {
  downloadStorageObject,
  listUserFullBackupStorageObjects,
  sha256Hex,
  yieldToMainThread,
} from './fullBackupStorage'
import type { FullBackupProgress } from './fullBackupTypes'

export type FullBackupZipProgressCallback = (progress: FullBackupProgress) => void

export interface BuildFullBackupZipArgs {
  userId: string
  logbookJson: string
  entryCount: number
  exportedAt: string
  onProgress?: FullBackupZipProgressCallback
}

async function buildZipAsync(files: AsyncZippable): Promise<Uint8Array> {
  const { zip } = await import('fflate')
  return new Promise((resolve, reject) => {
    zip(files, (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  })
}

export async function buildFullBackupZip(args: BuildFullBackupZipArgs): Promise<{
  zipBytes: Uint8Array
  manifestJson: string
}> {
  const report = (partial: FullBackupProgress) => args.onProgress?.(partial)

  report({ phase: 'preparing', message: 'Preparing backup…' })

  report({ phase: 'listing', message: 'Listing your files…' })
  const objects = await listUserFullBackupStorageObjects(args.userId)

  const manifestFiles: FullBackupManifestFile[] = []
  const zipFiles: AsyncZippable = {
    [FULL_BACKUP_JSON_ENTRY]: [new TextEncoder().encode(args.logbookJson), { level: 6 }],
  }

  const total = objects.length
  report({
    phase: 'fetching',
    message: total ? `Downloading files (0 / ${total})…` : 'No cloud files to include',
    current: 0,
    total,
  })

  for (let i = 0; i < objects.length; i++) {
    const { bucket, path: objectPath } = objects[i]!
    const zipPath = fullBackupZipPathForObject(bucket, objectPath)

    const bytes = await downloadStorageObject(bucket, objectPath)
    if (!bytes) {
      manifestFiles.push({
        path: zipPath,
        bucket,
        objectPath,
        status: 'missing',
        error: 'Download failed or file not found',
      })
    } else {
      const sha256 = await sha256Hex(bytes)
      zipFiles[zipPath] = [bytes, { level: 6 }]
      manifestFiles.push({
        path: zipPath,
        bucket,
        objectPath,
        status: 'included',
        sha256,
        sizeBytes: bytes.byteLength,
      })
    }

    if ((i + 1) % FULL_BACKUP_FETCH_YIELD_EVERY === 0 || i === objects.length - 1) {
      report({
        phase: 'fetching',
        message: `Downloading files (${i + 1} / ${total})…`,
        current: i + 1,
        total,
      })
      await yieldToMainThread()
    }
  }

  const manifest = createFullBackupManifest({
    exportedAt: args.exportedAt,
    entryCount: args.entryCount,
    files: manifestFiles,
  })
  const manifestJson = serializeFullBackupManifest(manifest)
  zipFiles[FULL_BACKUP_MANIFEST_ENTRY] = [new TextEncoder().encode(manifestJson), { level: 6 }]

  report({ phase: 'zipping', message: 'Building ZIP…' })
  const zipBytes = await buildZipAsync(zipFiles)

  return { zipBytes, manifestJson }
}