import type { FullBackupFormatVersion } from './fullBackupTypes'
import {
  FULL_BACKUP_JSON_ENTRY,
  FULL_BACKUP_MANIFEST_ENTRY,
  LOGIFI_APP_VERSION,
  FULL_BACKUP_FORMAT_VERSION,
} from './fullBackupConstants'

export type FullBackupFileStatus = 'included' | 'missing' | 'failed'

export interface FullBackupManifestFile {
  path: string
  bucket?: string
  objectPath?: string
  sha256?: string
  sizeBytes?: number
  status: FullBackupFileStatus
  error?: string
}

export interface FullBackupManifest {
  appVersion: string
  exportedAt: string
  formatVersion: FullBackupFormatVersion
  logbookJsonPath: string
  counts: {
    entries: number
    filesIncluded: number
    filesMissing: number
    filesFailed: number
  }
  files: FullBackupManifestFile[]
}

export function createFullBackupManifest(args: {
  exportedAt: string
  entryCount: number
  files: FullBackupManifestFile[]
}): FullBackupManifest {
  const included = args.files.filter((f) => f.status === 'included').length
  const missing = args.files.filter((f) => f.status === 'missing').length
  const failed = args.files.filter((f) => f.status === 'failed').length

  return {
    appVersion: LOGIFI_APP_VERSION,
    exportedAt: args.exportedAt,
    formatVersion: FULL_BACKUP_FORMAT_VERSION,
    logbookJsonPath: FULL_BACKUP_JSON_ENTRY,
    counts: {
      entries: args.entryCount,
      filesIncluded: included,
      filesMissing: missing,
      filesFailed: failed,
    },
    files: args.files,
  }
}

export function serializeFullBackupManifest(manifest: FullBackupManifest): string {
  return JSON.stringify(manifest, null, 2)
}