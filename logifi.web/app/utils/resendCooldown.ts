export const AUTH_RESEND_COOLDOWN_SECONDS = 60

export function remainingCooldownSeconds(endsAtMs: number | null, nowMs: number): number {
  if (endsAtMs == null || endsAtMs <= nowMs) return 0
  return Math.ceil((endsAtMs - nowMs) / 1000)
}

export function cooldownEndsAt(nowMs: number, seconds: number = AUTH_RESEND_COOLDOWN_SECONDS): number {
  return nowMs + seconds * 1000
}
