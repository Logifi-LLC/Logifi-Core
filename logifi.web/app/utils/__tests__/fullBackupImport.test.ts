import { describe, expect, it } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import {
  FullBackupZipImportError,
  assertZipImportLimits,
  extractLogbookJsonFromZipBytes,
} from '../fullBackupImport'
import { FULL_BACKUP_JSON_ENTRY } from '../fullBackupConstants'
import { buildLogbookJsonBackupPayload, serializeLogbookJsonBackup } from '../logbookJsonBackup'

describe('fullBackupImport', () => {
  it('rejects unsafe zip paths', async () => {
    const archive = zipSync({
      '../evil.json': strToU8('{}'),
      [FULL_BACKUP_JSON_ENTRY]: strToU8('{}'),
    })
    await expect(extractLogbookJsonFromZipBytes(archive)).rejects.toBeInstanceOf(
      FullBackupZipImportError
    )
  })

  it('extracts logbook.json from a valid archive', async () => {
    const payload = buildLogbookJsonBackupPayload({
      entries: [{ id: 'f1', date: '2025-06-01', role: 'PIC' }],
      pilotProfile: null,
    })
  const json = serializeLogbookJsonBackup(payload)
    const archive = zipSync({
      [FULL_BACKUP_JSON_ENTRY]: strToU8(json),
      'manifest.json': strToU8('{}'),
    })
    const { text } = await extractLogbookJsonFromZipBytes(archive)
    const parsed = JSON.parse(text)
    expect(parsed.entries[0].id).toBe('f1')
  })

  it('enforces compression ratio limits', () => {
    expect(() =>
      assertZipImportLimits({
        archiveBytes: 1000,
        entryCount: 2,
        uncompressedBytes: 200_000,
      })
    ).toThrow(FullBackupZipImportError)
  })
})