<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import TotalsReportPanel from '~/components/totals/TotalsReportPanel.vue'
import { useAuth } from '~/composables/useAuth'
import { useTheme } from '~/composables/useTheme'
import { useToast } from '~/composables/useToast'
import { getAllEntriesFromIndexedDB } from '~/utils/indexedDB'
import { copyToClipboard } from '~/utils/logtenHandoff'
import type { LogEntry } from '~/utils/logbookTypes'
import {
  TOTALS_REPORT_WINDOWS,
  buildTotalsReportCsv,
  calculateTotalsReport,
  type TotalsReportWindow,
} from '~/utils/totalsReport'

const router = useRouter()
const { initAuth, user, isAuthenticated } = useAuth()
const { isDark } = useTheme()
const { showToast } = useToast()

const loading = ref(true)
const loadError = ref<string | null>(null)
const entries = ref<LogEntry[]>([])
const windowId = ref<TotalsReportWindow>('all')
const copyState = ref<'idle' | 'copied' | 'failed'>('idle')

const report = computed(() => calculateTotalsReport(entries.value, windowId.value))

const windowHint = computed(() => {
  if (report.value.window === 'all') return 'All logbook dates'
  return `${report.value.windowStart} – ${report.value.windowEnd}`
})

function goBack() {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()
    return
  }
  void router.push('/dashboard')
}

async function loadEntries() {
  loading.value = true
  loadError.value = null
  try {
    await initAuth()
    const userId = user.value?.id
    if (!userId) {
      entries.value = []
      return
    }
    entries.value = await getAllEntriesFromIndexedDB(userId)
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Could not load logbook'
    entries.value = []
  } finally {
    loading.value = false
  }
}

async function copyCsv() {
  const ok = await copyToClipboard(buildTotalsReportCsv(report.value))
  copyState.value = ok ? 'copied' : 'failed'
  showToast(ok ? 'Copied table' : 'Copy failed', { type: ok ? 'success' : 'error' })
  window.setTimeout(() => {
    copyState.value = 'idle'
  }, 2000)
}

function downloadCsv() {
  const csv = buildTotalsReportCsv(report.value)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `logifi-totals-${report.value.window}-${report.value.asOf}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  void loadEntries()
})

const pageBg = computed(() =>
  isDark.value ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'
)
const headerBorder = computed(() => (isDark.value ? 'border-gray-800' : 'border-gray-200'))
const muted = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))
const btnIdle = computed(() =>
  isDark.value
    ? 'border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700'
    : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-100'
)
const btnActive = computed(() =>
  isDark.value ? 'border-blue-500 bg-blue-600 text-white' : 'border-blue-600 bg-blue-600 text-white'
)
</script>

<template>
  <div class="min-h-[100dvh] font-quicksand" :class="pageBg">
    <header
      class="sticky top-0 z-50 border-b pt-[env(safe-area-inset-top)] backdrop-blur-sm"
      :class="[headerBorder, isDark ? 'bg-gray-950/95' : 'bg-gray-50/95']"
    >
      <div class="mx-auto flex max-w-6xl items-center gap-1 px-3 py-1 sm:px-4">
        <button
          type="button"
          class="inline-flex min-h-11 min-w-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold"
          :class="isDark ? 'text-gray-200 hover:bg-gray-800' : 'text-gray-800 hover:bg-gray-200'"
          @click="goBack"
        >
          <Icon name="ri:arrow-left-line" size="18" />
          Back
        </button>
        <h1 class="min-w-0 flex-1 truncate text-center text-base font-semibold">Totals report</h1>
        <div class="flex shrink-0 items-center gap-1">
          <button
            type="button"
            class="inline-flex min-h-11 items-center rounded-lg border px-2 text-xs font-medium"
            :class="btnIdle"
            :disabled="loading || !isAuthenticated"
            @click="copyCsv"
          >
            {{ copyState === 'copied' ? 'Copied' : 'Copy' }}
          </button>
          <button
            type="button"
            class="inline-flex min-h-11 items-center rounded-lg border px-2 text-xs font-medium"
            :class="btnIdle"
            :disabled="loading || !isAuthenticated"
            @click="downloadCsv"
          >
            CSV
          </button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-3 py-3 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-4">
      <div
        class="mb-3 flex flex-wrap gap-1"
        role="tablist"
        aria-label="Time window"
      >
        <button
          v-for="option in TOTALS_REPORT_WINDOWS"
          :key="option.id"
          type="button"
          role="tab"
          class="inline-flex min-h-11 items-center rounded-lg border px-3 text-xs font-medium"
          :class="windowId === option.id ? btnActive : btnIdle"
          :aria-selected="windowId === option.id"
          @click="windowId = option.id"
        >
          {{ option.label }}
        </button>
      </div>

      <p class="mb-3 text-xs" :class="muted">
        {{ windowHint }}
        <span v-if="!loading"> · {{ report.includedCount }} entries</span>
      </p>

      <p v-if="loading" class="text-sm" :class="muted">Loading…</p>
      <p v-else-if="loadError" class="text-sm text-red-600 dark:text-red-400">{{ loadError }}</p>
      <p v-else-if="!isAuthenticated" class="text-sm" :class="muted">
        Sign in from the logbook to see totals.
      </p>
      <p v-else-if="entries.length === 0" class="text-sm" :class="muted">No logbook entries on this device.</p>
      <TotalsReportPanel v-else :report="report" :is-dark-mode="isDark" />
    </main>
  </div>
</template>
