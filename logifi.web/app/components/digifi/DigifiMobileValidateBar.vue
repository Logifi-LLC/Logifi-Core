<script setup lang="ts">
import { inject, ref, unref } from 'vue'
import type { Ref } from 'vue'
import type { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import type { ValidateOnlyResult } from '~/composables/useLogbookBuilderImport'
import { useAuth } from '~/composables/useAuth'
import { useTheme } from '~/composables/useTheme'
import { useToast } from '~/composables/useToast'
import { supabase } from '~/lib/supabase'
import { gridToEntries } from '~/composables/useLogbookBuilderImport'
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
const validRowCount = ref<number | null>(null)

async function handleValidate() {
  validating.value = true
  errorMessage.value = null
  validRowCount.value = null
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
    validRowCount.value = result.validRowCount ?? 0
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : 'Validation failed'
  } finally {
    validating.value = false
  }
}

async function handleImport() {
  if (validRowCount.value == null) return
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
      validRowCount.value = null
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
  if (validRowCount.value == null) return
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
    <p v-if="errorMessage" :class="['text-xs', isDarkMode ? 'text-rose-300' : 'text-rose-600']">{{ errorMessage }}</p>
    <p v-else-if="validRowCount != null" :class="['text-xs', isDarkMode ? 'text-gray-300' : 'text-gray-600']">
      {{ validRowCount }} row(s) ready.
    </p>
    <div class="flex gap-2">
      <button
        type="button"
        class="flex-1 rounded-xl border px-3 py-3 text-sm font-semibold disabled:opacity-50"
        :class="
          isDarkMode
            ? 'border-white/15 text-gray-100'
            : 'border-gray-300 bg-white text-gray-900 hover:bg-gray-50'
        "
        :disabled="validating"
        @click="handleValidate"
      >
        {{ validating ? 'Checking…' : 'Validate' }}
      </button>
      <button
        type="button"
        class="flex-1 rounded-xl bg-green-600 px-3 py-3 text-sm font-semibold text-white disabled:opacity-40"
        :disabled="importing || validRowCount == null"
        @click="handleImport"
      >
        {{ importing ? 'Importing…' : 'Import' }}
      </button>
    </div>
    <button
      v-if="preferredSink === 'logten' && validRowCount != null"
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
