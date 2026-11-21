/**
 * Shown in Settings on web and stored in full-backup manifest.appVersion.
 * Equals the current App Store marketing version (e.g. 1.0.10).
 * Web-only releases between iOS builds append a 4th segment (.1, .2, …).
 * Reset to the new app version when an iOS update ships; bump the 4th segment on each web-only release to main.
 */
export const LOGIFI_WEB_VERSION = '1.0.10'

export const FULL_BACKUP_FORMAT_VERSION = 1 as const

export const FULL_BACKUP_JSON_ENTRY = 'logbook.json'
export const FULL_BACKUP_MANIFEST_ENTRY = 'manifest.json'
export const FULL_BACKUP_STORAGE_ROOT = 'storage'

export const FULL_BACKUP_STORAGE_BUCKETS = [
  'digifi-capture',
  'digifi-scans',
  'flight-signatures',
] as const

export type FullBackupStorageBucket = (typeof FULL_BACKUP_STORAGE_BUCKETS)[number]

/** Zip path inside archive for a storage object. */
export function fullBackupZipPathForObject(bucket: string, objectPath: string): string {
  return `${FULL_BACKUP_STORAGE_ROOT}/${bucket}/${objectPath}`
}

export const ZIP_IMPORT_MAX_ARCHIVE_BYTES = 512 * 1024 * 1024
export const ZIP_IMPORT_MAX_UNCOMPRESSED_BYTES = 1024 * 1024 * 1024
export const ZIP_IMPORT_MAX_FILE_ENTRIES = 10_000
export const ZIP_IMPORT_MAX_COMPRESSION_RATIO = 100

export const FULL_BACKUP_FETCH_YIELD_EVERY = 5
export const FULL_BACKUP_LIST_PAGE_SIZE = 100