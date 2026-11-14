import { ref, type Ref } from 'vue'
import type { LogEntry } from '~/utils/logbookTypes'

/** Last flight logbook snapshot from dashboard — no fetch; other surfaces read this. */
const cachedFlightEntries: Ref<LogEntry[] | null> = ref(null)

export function setFar117LookbackFlightEntries(entries: readonly LogEntry[]): void {
  cachedFlightEntries.value = entries as LogEntry[]
}

export function getFar117LookbackFlightEntries(): Ref<LogEntry[] | null> {
  return cachedFlightEntries
}

export function clearFar117LookbackFlightEntries(): void {
  cachedFlightEntries.value = null
}