import { watch, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { inferLogbookType } from '~/utils/importSimulator'
import type { LogEntry } from '~/utils/logbookTypes'
import {
  captureDashboardInlineEditReturn,
  type DashboardInlineEditReturn,
} from '~/utils/dashboardInlineEditReturn'

/** Open `/dashboard?entry=<id>` in the existing inline editor once entries are loaded. */
export function useDashboardEntryDeepLink(opts: {
  logEntries: Ref<LogEntry[]>
  setActiveLogbook: (logbook: 'flight' | 'simulator') => void
  openEntry: (entry: LogEntry) => void | Promise<void>
  onInlineEditReturn?: (payload: DashboardInlineEditReturn) => void
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
        const returnPayload = captureDashboardInlineEditReturn(id, route.query.returnTo)
        if (returnPayload) {
          opts.onInlineEditReturn?.(returnPayload)
        }

        opts.setActiveLogbook(inferLogbookType(entry))
        await opts.openEntry(entry)
        if (route.query.entry || route.query.returnTo) {
          const query = { ...route.query }
          delete query.entry
          delete query.returnTo
          await router.replace({ path: route.path, query })
        }
      } finally {
        opening = false
      }
    },
    { immediate: true }
  )

  watch(
    opts.logEntries,
    () => {
      if (route.query.entry) return
      if (!route.query.returnTo) return
      const query = { ...route.query }
      delete query.returnTo
      void router.replace({ path: route.path, query })
    },
    { immediate: true }
  )
}