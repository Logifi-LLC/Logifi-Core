/** CFI certificate number and expiration (or 61.197 recent-experience end date). */

export const CFI_CERTIFICATE_NUMBER_MAX_LENGTH = 32

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

export function normalizeCfiCertificateNumber(raw: string | null | undefined): string {
  return (raw || '').trim().replace(/\s+/g, ' ')
}

export function normalizeCfiExpiration(raw: string | null | undefined): string {
  const trimmed = (raw || '').trim()
  if (!trimmed) return ''
  const day = trimmed.slice(0, 10)
  return isIsoDate(day) ? day : ''
}

function utcTodayIsoDay(): string {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isCfiExpirationBeforeToday(value: string): boolean {
  return value < utcTodayIsoDay()
}

export function cfiCertificateNumberError(raw: string | null | undefined): string | null {
  const value = normalizeCfiCertificateNumber(raw)
  if (!value) return 'Certificate number is required'
  if (value.length < 2) return 'Certificate number is too short'
  if (value.length > CFI_CERTIFICATE_NUMBER_MAX_LENGTH) {
    return `Certificate number must be ${CFI_CERTIFICATE_NUMBER_MAX_LENGTH} characters or fewer`
  }
  return null
}

export function isIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!Number.isInteger(year) || year < 1900 || year > 2200) return false
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  )
}

export function cfiExpirationError(raw: string | null | undefined): string | null {
  const trimmed = (raw || '').trim()
  if (!trimmed) return 'Certificate expiration is required'
  const value = normalizeCfiExpiration(raw)
  if (!value || !isIsoDate(value)) return 'Enter a valid expiration date'
  if (isCfiExpirationBeforeToday(value)) return 'Certificate is expired'
  return null
}

export function cfiSignerNameError(raw: string | null | undefined): string | null {
  const value = (raw || '').trim()
  if (!value) return 'Instructor name is required'
  if (value.length > 120) return 'Instructor name is too long'
  return null
}

export type CfiIdentityFields = {
  name: string | null | undefined
  certificateNumber: string | null | undefined
  expiration: string | null | undefined
}

export function cfiIdentityErrors(fields: CfiIdentityFields): {
  name: string | null
  certificateNumber: string | null
  expiration: string | null
} {
  return {
    name: cfiSignerNameError(fields.name),
    certificateNumber: cfiCertificateNumberError(fields.certificateNumber),
    expiration: cfiExpirationError(fields.expiration),
  }
}

export function hasCfiIdentity(fields: CfiIdentityFields): boolean {
  const errors = cfiIdentityErrors(fields)
  return !errors.name && !errors.certificateNumber && !errors.expiration
}

export function formatCfiExpirationForDisplay(raw: string | null | undefined): string {
  const value = normalizeCfiExpiration(raw)
  if (!value) return '—'
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${month}/${day}/${year}`
}
