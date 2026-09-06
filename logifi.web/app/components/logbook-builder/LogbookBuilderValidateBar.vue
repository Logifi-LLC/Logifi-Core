<script setup lang="ts">
import { inject, ref, computed } from 'vue'
import type { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import type { ValidateOnlyResult, ColumnTotalRow } from '~/composables/useLogbookBuilderImport'
import { useTheme } from '~/composables/useTheme'
import { useToast } from '~/composables/useToast'
import { useAuth } from '~/composables/useAuth'
import { supabase } from '~/lib/supabase'
import { gridToEntries } from '~/composables/useLogbookBuilderImport'
import { triggerLogTenHandoff, copyToClipboard, buildLogTenPackage } from '~/utils/logtenHandoff'
import { unref } from 'vue'

const grid = inject<ReturnType<typeof useLogbookBuilderGrid>>('logbookBuilderGrid')
if (!grid) throw new Error('LogbookBuilderValidateBar must be used inside a page that provides logbookBuilderGrid')

const route = useRoute()
const isDigifiMode = computed(() => route.query.digifi === 'open')

const { isDark } = useTheme()
const { showToast } = useToast()
const { isAuthenticated, user } = useAuth()

const validating = ref(false)
const errorMessage = ref<string | null>(null)
const showConfirm = ref(false)
const confirmResult = ref<{ validRowCount: number; columnTotals: ColumnTotalRow[] } | null>(null)
const importing = ref(false)
const sendingToLogTen = ref(false)
const showLogTenFallback = ref(false)
const logTenFallbackUrl = ref<string>('')

async function handleValidate() {
  validating.value = true
  errorMessage.value = null
  showConfirm.value = false
  confirmResult.value = null
  try {
    const { validateOnly } = await import('~/composables/useLogbookBuilderImport')
    const result: ValidateOnlyResult = await validateOnly(grid!)
    if (!result.valid && result.errors.length > 0) {
      errorMessage.value = result.errors.slice(0, 5).map((e) => (e.rowIndex >= 0 ? `Row ${e.rowIndex}: ` : '') + e.message).join('; ')
    } else if (result.valid && result.validRowCount != null && result.columnTotals != null) {
      confirmResult.value = { validRowCount: result.validRowCount, columnTotals: result.columnTotals }
      showConfirm.value = true
    }
  } catch (e: any) {
    errorMessage.value = e?.message ?? 'Validation failed'
  } finally {
    validating.value = false
  }
}

function handleBack() {
  showConfirm.value = false
  confirmResult.value = null
}

async function handleImport() {
  if (!confirmResult.value) return
  importing.value = true
  errorMessage.value = null
  try {
    const { runValidateAndImport } = await import('~/composables/useLogbookBuilderImport')
    const result = await runValidateAndImport(grid!)
    if (result.errors.length > 0) {
      errorMessage.value = result.errors.slice(0, 5).map((e) => (e.rowIndex >= 0 ? `Row ${e.rowIndex}: ` : '') + e.message).join('; ')
      showConfirm.value = false
      confirmResult.value = null
    } else if (result.imported > 0) {
      showToast('Imported. Your catalog is growing — future Digifi scans will recognize more of your aircraft.', {
        type: 'success',
      })
      await navigateTo('/dashboard')
    }
  } catch (e: any) {
    errorMessage.value = e?.message ?? 'Import failed'
  } finally {
    importing.value = false
  }
}

function formatTotal(row: ColumnTotalRow): string {
  return row.isInteger ? String(row.total) : row.total.toFixed(1)
}

async function handleSendToLogTen() {
  if (!confirmResult.value) return
  sendingToLogTen.value = true
  errorMessage.value = null

  try {
    const entries = gridToEntries({
      columns: grid!.columns.value,
      rows: grid!.rows.value,
      defaultRole: grid!.defaultImportRole?.value ?? 'PIC',
      defaultYear: unref((grid as any).defaultYear) ?? null,
      tailIndex: undefined,
    })

    if (entries.length === 0) {
      throw new Error('No entries to send')
    }

    if (isAuthenticated.value && user.value) {
      const { data: profile } = await (supabase as any)
        .from('user_profiles')
        .select('digifi_learning_opt_in')
        .eq('id', user.value.id)
        .single()

      if (profile?.digifi_learning_opt_in) {
        const { persistDigifiCorrectionFeedback } = await import('~/composables/useLogbookBuilderImport')
        const { persistDigifiVocabulary } = await import('~/composables/useDigifiVocabulary')
        try {
          await persistDigifiCorrectionFeedback(grid!, user.value.id)
          await persistDigifiVocabulary(grid!, user.value.id)
        } catch (error) {
          console.warn('[digifi] failed to persist learning data before LogTen handoff', error)
        }
      }
    }

    const result = triggerLogTenHandoff(entries)
    if (!result.success) {
      if (result.tooLarge && result.url) {
        logTenFallbackUrl.value = result.url
        showLogTenFallback.value = true
        return
      }
      throw new Error(result.error || 'Failed to send to LogTen')
    }

    showToast('Opened LogTen Pro with your entries', { type: 'success' })
  } catch (e: any) {
    errorMessage.value = e?.message ?? 'Failed to send to LogTen'
  } finally {
    sendingToLogTen.value = false
  }
}

async function copyLogTenUrl() {
  const copied = await copyToClipboard(logTenFallbackUrl.value)
  if (copied) {
    showToast('LogTen URL copied to clipboard', { type: 'success' })
    showLogTenFallback.value = false
  } else {
    showToast('Failed to copy URL', { type: 'error' })
  }
}

function downloadLogTenPackage() {
  try {
    const entries = gridToEntries({
      columns: grid!.columns.value,
      rows: grid!.rows.value,
      defaultRole: grid!.defaultImportRole?.value ?? 'PIC',
      defaultYear: unref((grid as any).defaultYear) ?? null,
      tailIndex: undefined,
    })
    
    const pkg = buildLogTenPackage(entries)
    const jsonString = JSON.stringify(pkg, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'logten-package.json'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    showToast('LogTen package downloaded', { type: 'success' })
    showLogTenFallback.value = false
  } catch (error) {
    showToast('Failed to download package', { type: 'error' })
  }
}
</script>

<template>
  <div
    class="rounded-lg border p-3"
    :class="isDark ? 'border-white/10 bg-gray-900 shadow-md shadow-black/40' : 'border-gray-200 bg-white shadow-sm'"
  >
    <template v-if="!showConfirm">
      <div class="flex flex-wrap items-center gap-4">
        <button
          type="button"
          class="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          :disabled="validating"
          @click="handleValidate"
        >
          {{ validating ? 'Validating…' : 'Validate' }}
        </button>
        <p v-if="errorMessage" class="text-sm text-red-600 dark:text-red-400">
          {{ errorMessage }}
        </p>
      </div>
    </template>
    <template v-else>
      <div class="space-y-4">
        <p class="text-sm font-medium text-gray-900 dark:text-white">
          {{ confirmResult?.validRowCount ?? 0 }} row(s) will be imported.
        </p>
        <div v-if="confirmResult?.columnTotals?.length" class="rounded border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5 dark:shadow-sm dark:shadow-black/20">
          <p class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Column totals</p>
          <ul class="space-y-1 text-sm text-gray-800 dark:text-gray-200">
            <li v-for="row in confirmResult.columnTotals" :key="row.fieldKey" class="flex justify-between gap-4">
              <span>{{ row.label }}</span>
              <span class="font-mono tabular-nums">{{ formatTotal(row) }}</span>
            </li>
          </ul>
        </div>
        <!-- Digifi mode: equal sink choices -->
        <div v-if="isDigifiMode" class="space-y-3">
          <p class="text-sm font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
            Where do you want to send these entries?
          </p>
          <div class="flex flex-wrap items-center gap-3">
            <button
              type="button"
              class="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10 dark:shadow-sm dark:shadow-black/20"
              @click="handleBack"
            >
              Back
            </button>
            <button
              type="button"
              class="rounded border px-4 py-2 text-sm font-medium disabled:opacity-50 shadow-sm"
              :class="[
                isDark
                  ? 'border-blue-500/40 bg-blue-600/20 text-blue-300 hover:bg-blue-600/30'
                  : 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
              ]"
              :disabled="importing"
              @click="handleImport"
            >
              {{ importing ? 'Importing…' : 'Import to Logifi' }}
            </button>
            <button
              type="button"
              class="rounded border px-4 py-2 text-sm font-medium disabled:opacity-50 shadow-sm"
              :class="[
                isDark
                  ? 'border-orange-500/40 bg-orange-600/20 text-orange-300 hover:bg-orange-600/30'
                  : 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100'
              ]"
              :disabled="sendingToLogTen"
              @click="handleSendToLogTen"
            >
              {{ sendingToLogTen ? 'Sending…' : 'Send to LogTen Pro' }}
            </button>
          </div>
        </div>

        <!-- Non-Digifi mode: original layout -->
        <div v-else class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10 dark:shadow-sm dark:shadow-black/20"
            @click="handleBack"
          >
            Back
          </button>
          <button
            type="button"
            class="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            :disabled="importing"
            @click="handleImport"
          >
            {{ importing ? 'Importing…' : 'Import' }}
          </button>
          <button
            type="button"
            class="rounded border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
            :disabled="sendingToLogTen"
            @click="handleSendToLogTen"
          >
            {{ sendingToLogTen ? 'Sending…' : 'Send to LogTen Pro' }}
          </button>
        </div>
        <p v-if="errorMessage" class="text-sm text-red-600 dark:text-red-400">
          {{ errorMessage }}
        </p>
      </div>
    </template>

    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showLogTenFallback"
          class="fixed inset-0 z-[9999] flex items-center justify-center p-4 font-quicksand"
          :class="isDark ? 'bg-black/70' : 'bg-black/50'"
          @click.self="showLogTenFallback = false"
        >
          <div
            class="relative w-full max-w-md rounded-2xl border shadow-2xl p-6"
            :class="isDark ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200'"
          >
            <h2 class="text-lg font-bold mb-2" :class="isDark ? 'text-white' : 'text-gray-900'">
              Payload Too Large
            </h2>
            <p class="text-sm mb-4" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
              The LogTen URL is too long to open directly. Copy the URL or download the JSON package and use LogTen's import feature.
            </p>
            <div class="flex gap-3">
              <button
                type="button"
                class="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                :class="
                  isDark
                    ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300'
                    : 'bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700'
                "
                @click="showLogTenFallback = false"
              >
                Cancel
              </button>
              <button
                type="button"
                class="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors text-white"
                :class="
                  isDark
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                "
                @click="copyLogTenUrl"
              >
                Copy URL
              </button>
              <button
                type="button"
                class="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors text-white"
                :class="
                  isDark
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-green-600 hover:bg-green-700'
                "
                @click="downloadLogTenPackage"
              >
                Download JSON
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
