import {
  FULL_BACKUP_JSON_ENTRY,
  ZIP_IMPORT_MAX_ARCHIVE_BYTES,
  ZIP_IMPORT_MAX_COMPRESSION_RATIO,
  ZIP_IMPORT_MAX_FILE_ENTRIES,
  ZIP_IMPORT_MAX_UNCOMPRESSED_BYTES,
} from './fullBackupConstants'

export class FullBackupZipImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FullBackupZipImportError'
  }
}

function isSafeZipEntryName(name: string): boolean {
  if (!name || name.startsWith('/') || name.includes('\\')) return false
  const parts = name.split('/')
  return !parts.some((part) => part === '..' || part === '')
}

function pickLogbookJsonKey(keys: string[]): string | null {
  if (keys.includes(FULL_BACKUP_JSON_ENTRY)) return FULL_BACKUP_JSON_ENTRY
  const match = keys.find((k) => k.endsWith(`/${FULL_BACKUP_JSON_ENTRY}`) || k.endsWith(FULL_BACKUP_JSON_ENTRY))
  return match ?? null
}

export function assertZipImportLimits(args: {
  archiveBytes: number
  entryCount: number
  uncompressedBytes: number
}): void {
  if (args.archiveBytes > ZIP_IMPORT_MAX_ARCHIVE_BYTES) {
    throw new FullBackupZipImportError('Backup ZIP is too large to import.')
  }
  if (args.entryCount > ZIP_IMPORT_MAX_FILE_ENTRIES) {
    throw new FullBackupZipImportError('Backup ZIP contains too many files.')
  }
  if (args.uncompressedBytes > ZIP_IMPORT_MAX_UNCOMPRESSED_BYTES) {
    throw new FullBackupZipImportError('Uncompressed backup data exceeds the safe limit.')
  }
  if (args.archiveBytes > 0) {
    const ratio = args.uncompressedBytes / args.archiveBytes
    if (ratio > ZIP_IMPORT_MAX_COMPRESSION_RATIO) {
      throw new FullBackupZipImportError('Backup ZIP failed compression-ratio safety checks.')
    }
  }
}

export async function extractLogbookJsonFromZipBytes(
  archiveBytes: Uint8Array
): Promise<{ fileName: string; text: string }> {
  if (archiveBytes.byteLength > ZIP_IMPORT_MAX_ARCHIVE_BYTES) {
    throw new FullBackupZipImportError('Backup ZIP is too large to import.')
  }

  const { unzip } = await import('fflate')

  return new Promise((resolve, reject) => {
    unzip(archiveBytes, (err, data) => {
      if (err) {
        reject(new FullBackupZipImportError('Could not read backup ZIP.'))
        return
      }

      const keys = Object.keys(data)
      const safeKeys = keys.filter(isSafeZipEntryName)
      if (safeKeys.length !== keys.length) {
        reject(new FullBackupZipImportError('Backup ZIP contains unsafe paths.'))
        return
      }

      let uncompressedBytes = 0
      for (const key of safeKeys) {
        uncompressedBytes += data[key]!.byteLength
      }

      try {
        assertZipImportLimits({
          archiveBytes: archiveBytes.byteLength,
          entryCount: safeKeys.length,
          uncompressedBytes,
        })
      } catch (e) {
        reject(e)
        return
      }

      const logbookKey = pickLogbookJsonKey(safeKeys)
      if (!logbookKey) {
        reject(new FullBackupZipImportError(`Backup ZIP is missing ${FULL_BACKUP_JSON_ENTRY}.`))
        return
      }

      const decoded = new TextDecoder('utf-8', { fatal: false }).decode(data[logbookKey]!)
      resolve({ fileName: FULL_BACKUP_JSON_ENTRY, text: decoded })
    })
  })
}

export async function extractLogbookJsonFromZipFile(file: File): Promise<{ fileName: string; text: string }> {
  const buf = new Uint8Array(await file.arrayBuffer())
  const result = await extractLogbookJsonFromZipBytes(buf)
  return { fileName: file.name.replace(/\.zip$/i, '.json'), text: result.text }
}