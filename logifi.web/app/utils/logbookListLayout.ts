/** Tailwind `md` is min-width 768px. Stacked cards below that; table at 768+. */
export const STACKED_LOGBOOK_CARDS_MQ = '(max-width: 767px)'

/** iOS/Capacitor already uses cards at every width. Web matches that under 768px. */
export function shouldUseStackedLogbookCards(isIos: boolean, isNarrowViewport: boolean): boolean {
  return isIos || isNarrowViewport
}
