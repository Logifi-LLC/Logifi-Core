import { watch, type Ref } from 'vue'
import { inferLogbookType } from '~/utils/importSimulator'
import type { LogEntry } from '~/utils/logbookTypes'

/** Open `/dashboard?entry=<id>` in the existing inline editor once entries are loaded. */
export function useDashboardEntryDeepLink(opts: {
  logEntries: Ref<LogEntry[]>
  setActiveLogbook: (logbook: 'flight' | 'simulator') => void
  openEntry: (entry: LogEntry) => void | Promise<void>
}): void {
  const route = useRoute()
  const router = useRouter()
  let opening = false

  watch(
    [() => route.query.entry, opts.logEntries],
    async ([raw]) => {
      const id = Array.isArray(raw) ? raw[0] : raw
      if (!id || typeof id !== 'string' || opening) return
      const entry = opts.logEntries.value.find((item) => item.id === id)
      if (!entry) return

      opening = true
      try {
        opts.setActiveLogbook(inferLogbookType(entry))
        await opts.openEntry(entry)
        if (route.query.entry) {
          const query = { ...route.query }
          delete query.entry
          // Leave allowlisted `returnTo` (e.g. logbook-check) until inline edit closes.
          await router.replace({ path: route.path, query })
        }
      } finally {
        opening = false
      }
    },
    { immediate: true }
  )
}
