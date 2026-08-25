export function airportLookupCacheControl(): string {
  return 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800'
}

export function aircraftLookupCacheControl(refreshOwner: boolean): string {
  if (refreshOwner) return 'private, no-store'
  return 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400'
}

export function shouldSetLookupCacheHeader(result: {
  success: boolean
  error?: string
}): boolean {
  if (result.success) return true
  return (result.error || '').toLowerCase().includes('not found')
}
