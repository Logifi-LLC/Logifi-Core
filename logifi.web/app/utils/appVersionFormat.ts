import { LOGIFI_WEB_VERSION } from '~/utils/fullBackupConstants'

export function formatLogifiVersionLabel(version: string): string {
  return `Logifi ${version}`
}

export function formatFallbackAppVersionLabel(
  version: string = LOGIFI_WEB_VERSION,
): string {
  return formatLogifiVersionLabel(version)
}