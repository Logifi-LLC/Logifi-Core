import type { FULL_BACKUP_FORMAT_VERSION } from './fullBackupConstants'

export type FullBackupFormatVersion = typeof FULL_BACKUP_FORMAT_VERSION

export type FullBackupProgressPhase =
  | 'preparing'
  | 'listing'
  | 'fetching'
  | 'zipping'
  | 'saving'

export interface FullBackupProgress {
  phase: FullBackupProgressPhase
  message: string
  current?: number
  total?: number
}

export interface ListedStorageObject {
  bucket: string
  path: string
}