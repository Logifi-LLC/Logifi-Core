export const WELCOME_CREDITS = 10

export const WELCOME_CREDITS_DESCRIPTION = 'Welcome bonus — 10 free Digifi spreads'

export function welcomeCreditsReferenceId(userId: string): string {
  return `welcome:${userId}`
}
