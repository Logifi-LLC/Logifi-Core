import { LOGIFI_APP_VERSION } from '~/utils/fullBackupConstants'

export function formatNativeAppVersionLabel(version: string, build: string): string {
  return `Logifi ${version} (${build})`
}

export function formatWebAppVersionLabel(
  packageVersion: string,
  gitCommitSha?: string,
): string {
  const trimmed = gitCommitSha?.trim()
  const shortSha = trimmed && trimmed.length > 0 ? trimmed.slice(0, 7) : ''
  if (shortSha) return `Logifi ${packageVersion} (${shortSha})`
  return `Logifi ${packageVersion}`
}

export function formatFallbackAppVersionLabel(
  packageVersion: string = LOGIFI_APP_VERSION,
): string {
  return `Logifi ${packageVersion}`
}