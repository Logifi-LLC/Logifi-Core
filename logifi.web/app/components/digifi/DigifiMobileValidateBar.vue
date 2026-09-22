<script setup lang="ts">
import { inject, ref, unref } from 'vue'
import type { Ref } from 'vue'
import type { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import type { ColumnTotalRow, ValidateOnlyResult } from '~/composables/useLogbookBuilderImport'
import { formatColumnTotal, gridToEntries } from '~/composables/useLogbookBuilderImport'
import { useAuth } from '~/composables/useAuth'
import { useTheme } from '~/composables/useTheme'
import { useToast } from '~/composables/useToast'
import { supabase } from '~/lib/supabase'
import { triggerLogTenHandoff } from '~/utils/logtenHandoff'

const grid = inject<ReturnType<typeof useLogbookBuilderGrid>>('logbookBuilderGrid')
if (!grid) throw new Error('DigifiMobileValidateBar requires logbookBuilderGrid')

const { isDark: isDarkMode } = useTheme()

const preferredSink = inject<Ref<'logten' | 'logifi' | null>>('digifiPreferredSink', ref(null))
const { showToast } = useToast()
const { isAuthenticated, user } = useAuth()

const validating = ref(false)
const importing = ref(false)
const sendingToLogTen = ref(false)
const errorMessage = ref<string | null>(null)
const showSummary = ref(false)
const summaryResult = ref<{ validRowCount: number; columnTotals: ColumnTotalRow[] } | null>(null)

function clearSummary() {
  showSummary.value = false
  summaryResult.value = null
}

async function handleValidate() {
  validating.value = true
  errorMessage.value = null
  clearSummary()
  try {
    const { validateOnly } = await import('~/composables/useLogbookBuilderImport')
    const result: ValidateOnlyResult = await validateOnly(grid!)
    if (!result.valid && result.errors.length > 0) {
      errorMessage.value = result.errors
        .slice(0, 4)
        .map((item) => (item.rowIndex >= 0 ? `Row ${item.rowIndex}: ` : '') + item.message)
        .join('; ')
      return
    }
    if (result.valid && result.validRowCount != null && result.columnTotals != null) {
      summaryResult.value = {
        validRowCount: result.validRowCount,
        columnTotals: result.columnTotals,
      }
      showSummary.value = true
    }
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : 'Validation failed'
  } finally {
    validating.value = false
  }
}

async function handleImport() {
  if (!summaryResult.value) return
  importing.value = true
  errorMessage.value = null
  try {
    const { runValidateAndImport } = await import('~/composables/useLogbookBuilderImport')
    const result = await runValidateAndImport(grid!)
    if (result.errors.length > 0) {
      errorMessage.value = result.errors
        .slice(0, 4)
        .map((item) => (item.rowIndex >= 0 ? `Row ${item.rowIndex}: ` : '') + item.message)
        .join('; ')
      clearSummary()
      return
    }
    if (result.imported > 0) {
      showToast('Imported.', { type: 'success' })
      await navigateTo('/dashboard')
    }
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : 'Import failed'
  } finally {
    importing.value = false
  }
}

async function handleSendToLogTen() {
  if (!summaryResult.value) return
  sendingToLogTen.value = true
  errorMessage.value = null
  try {
    const entries = gridToEntries({
      columns: grid!.columns.value,
      rows: grid!.rows.value,
      defaultRole: grid!.defaultImportRole?.value ?? 'PIC',
      defaultYear: unref(grid.defaultYear) ?? null,
      tailIndex: undefined,
    })
    if (entries.length === 0) throw new Error('No entries to send')

    if (isAuthenticated.value && user.value) {
      const { data: profile } = await (supabase as any)
        .from('user_profiles')
        .select('digifi_learning_opt_in')
        .eq('id', user.value.id)
        .single()
      if (profile?.digifi_learning_opt_in ?? true) {
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
    if (!result.success) throw new Error(result.error || 'Failed to send to LogTen')
    showToast('Opened LogTen Pro', { type: 'success' })
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to send to LogTen'
  } finally {
    sendingToLogTen.value = false
  }
}
</script>

<template>
  <div class="space-y-2">
    <div
      v-if="showSummary && summaryResult"
      class="rounded-2xl border px-4 py-3 space-y-3"
      :class="isDarkMode ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white shadow-sm'"
      role="region"
      aria-label="Validation summary"
    >
      <p :class="['text-sm font-semibold', isDarkMode ? 'text-gray-100' : 'text-gray-900']">
        {{ summaryResult.validRowCount }} row(s) will be imported.
      </p>
      <div v-if="summaryResult.columnTotals.length">
        <p :class="['text-[11px] font-semibold uppercase tracking-wide', isDarkMode ? 'text-gray-500' : 'text-gray-400']">
          Column totals
        </p>
        <ul class="mt-1 space-y-1">
          <li
            v-for="row in summaryResult.columnTotals"
            :key="`${row.fieldKey}-${row.label}`"
            class="flex justify-between gap-3 text-sm"
            :class="isDarkMode ? 'text-gray-200' : 'text-gray-800'"
          >
            <span class="min-w-0 truncate">{{ row.label }}</span>
            <span class="shrink-0 font-mono tabular-nums">{{ formatColumnTotal(row) }}</span>
          </li>
        </ul>
      </div>
      <button
        type="button"
        class="text-xs font-semibold"
        :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
        @click="clearSummary"
      >
        Back to edit
      </button>
    </div>

    <p v-if="errorMessage" :class="['text-xs', isDarkMode ? 'text-rose-300' : 'text-rose-600']">{{ errorMessage }}</p>

    <div class="flex gap-2">
      <button
        v-if="!showSummary"
        type="button"
        class="flex-1 min-h-[52px] rounded-2xl border-2 px-3 py-3 text-sm font-semibold disabled:opacity-50"
        :class="
          isDarkMode
            ? 'border-green-400/50 bg-green-500/15 text-green-100'
            : 'border-green-600 bg-green-50 text-green-900'
        "
        :disabled="validating"
        @click="handleValidate"
      >
        {{ validating ? 'Checking…' : 'Validate' }}
      </button>
      <button
        type="button"
        class="flex-1 min-h-[52px] rounded-2xl bg-green-600 px-3 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-40"
        :disabled="importing || !showSummary"
        @click="handleImport"
      >
        {{ importing ? 'Importing…' : 'Import' }}
      </button>
    </div>
    <button
      v-if="preferredSink === 'logten' && showSummary"
      type="button"
      class="w-full rounded-xl border px-3 py-2 text-xs font-semibold disabled:opacity-50"
      :class="
        isDarkMode
          ? 'border-orange-400/40 text-orange-200'
          : 'border-orange-400/60 text-orange-700 hover:bg-orange-50'
      "
      :disabled="sendingToLogTen"
      @click="handleSendToLogTen"
    >
      {{ sendingToLogTen ? 'Sending…' : 'Send to LogTen Pro' }}
    </button>
  </div>
</template>
