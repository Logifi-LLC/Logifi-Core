/** Mobile Digifi accent — logbook green; web Digifi orange stays on desktop builder. */
export function digifiMobileAccentSelected(isDark: boolean): string {
  return isDark
    ? 'border-green-400/70 bg-green-500/20 text-green-100'
    : 'border-green-500 bg-green-50 text-green-900'
}

export function digifiMobileAccentIdle(isDark: boolean): string {
  return isDark
    ? 'border-white/10 bg-white/5 text-gray-300'
    : 'border-gray-200 bg-gray-100 text-gray-700'
}
