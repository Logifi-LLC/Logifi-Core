/**
 * Mock credit purchases (instant grant, no real payment).
 * Enabled in dev by default; set NUXT_CREDITS_MOCK_ENABLED=false to disable locally.
 */
export function isMockCreditsEnabled(): boolean {
  const explicit =
    process.env.NUXT_CREDITS_MOCK_ENABLED?.trim() || process.env.CREDITS_MOCK_ENABLED?.trim()
  if (explicit === 'true') return true
  if (explicit === 'false') return false
  return process.dev === true
}
