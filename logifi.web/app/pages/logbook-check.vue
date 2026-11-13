<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import LogbookCheckView from '~/components/logbook/LogbookCheckView.vue'
import { useAuth } from '~/composables/useAuth'
import { useTheme } from '~/composables/useTheme'
import { getAllEntriesFromIndexedDB } from '~/utils/indexedDB'
import { auditLogbook, type AuditReport } from '~/utils/logbookAudit'

definePageMeta({ layout: 'default' })

const emptyReport: AuditReport = {
  findings: [],
  groups: [],
  entryCount: 0,
  errorCount: 0,
  checkCount: 0,
}

const router = useRouter()
const { initAuth, user, isAuthenticated } = useAuth()
const { isDark } = useTheme()

const loading = ref(true)
const report = ref<AuditReport>(emptyReport)
const hasEntries = ref(false)

const pageBg = computed(() =>
  isDark.value ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'
)
const headerBorder = computed(() => (isDark.value ? 'border-gray-800' : 'border-gray-200'))
const muted = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))

function goBack() {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()
    return
  }
  void router.push('/dashboard')
}

async function loadAndAudit(): Promise<void> {
  loading.value = true
  try {
    await initAuth()
    const userId = user.value?.id
    if (!userId) {
      report.value = emptyReport
      hasEntries.value = false
      return
    }
    const entries = await getAllEntriesFromIndexedDB(userId)
    hasEntries.value = entries.length > 0
    report.value = auditLogbook(entries)
  } catch (error) {
    console.error('[logbook-check] failed to audit logbook', error)
    report.value = emptyReport
    hasEntries.value = false
  } finally {
    loading.value = false
  }
}

function openEntry(entryId: string): void {
  void router.push({ path: '/dashboard', query: { entry: entryId } })
}

onMounted(() => {
  void loadAndAudit()
})
</script>

<template>
  <div class="min-h-[100dvh] font-quicksand" :class="pageBg">
    <header
      class="sticky top-0 z-50 border-b pt-[env(safe-area-inset-top)] backdrop-blur-sm"
      :class="[headerBorder, isDark ? 'bg-gray-950/95' : 'bg-gray-50/95']"
    >
      <div class="mx-auto flex max-w-3xl items-center gap-1 px-3 py-1 sm:px-4">
        <button
          type="button"
          class="inline-flex min-h-11 min-w-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold"
          :class="isDark ? 'text-gray-200 hover:bg-gray-800' : 'text-gray-800 hover:bg-gray-200'"
          @click="goBack"
        >
          <Icon name="ri:arrow-left-line" size="18" />
          Back
        </button>
        <h1 class="min-w-0 flex-1 truncate text-center text-base font-semibold">Logbook check</h1>
        <div class="w-11 shrink-0" aria-hidden="true" />
      </div>
    </header>

    <main class="mx-auto max-w-3xl px-3 py-3 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-4">
      <p v-if="loading" class="text-sm" :class="muted">Checking…</p>
      <p v-else-if="!isAuthenticated" class="text-sm" :class="muted">
        Sign in from the logbook to run a check.
      </p>
      <LogbookCheckView
        v-else
        :is-dark-mode="isDark"
        :groups="report.groups"
        :error-count="report.errorCount"
        :check-count="report.checkCount"
        :loading="false"
        :has-entries="hasEntries"
        @open-entry="openEntry"
      />
    </main>
  </div>
</template>
