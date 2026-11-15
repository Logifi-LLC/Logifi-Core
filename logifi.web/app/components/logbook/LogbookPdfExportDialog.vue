<template>
  <Teleport to="body">
    <div
      v-if="open"
      id="logbook-pdf-export-dialog"
      :class="[
        'app-modal-overlay flex items-center justify-center',
        isIos ? 'p-0' : 'p-4',
      ]"
      @click.self="onClose"
    >
      <div
        :class="[
          'relative flex w-full flex-col border shadow-2xl transition-colors duration-300',
          isIos
            ? 'h-[100dvh] max-h-[100dvh] max-w-none rounded-none pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]'
            : 'max-h-[90vh] max-w-lg rounded-2xl',
          isDarkMode
            ? 'border-white/10 bg-gray-900 text-gray-100 shadow-md shadow-black/40'
            : 'border-gray-200 bg-white text-gray-900 shadow-sm',
        ]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logbook-pdf-title"
        @click.stop
      >
        <div
          :class="[
            'flex flex-shrink-0 border-b',
            isIos ? 'flex-col gap-2 p-4' : 'items-center justify-between p-6',
            isDarkMode ? 'border-gray-700' : 'border-gray-300',
          ]"
        >
          <div class="flex min-w-0 items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <h2
                id="logbook-pdf-title"
                :class="[isIos ? 'text-lg' : 'text-xl', 'font-semibold font-quicksand']"
              >
                Download paper logbook
              </h2>
            </div>
            <button
              type="button"
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors"
              :class="isDarkMode ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-200' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'"
              aria-label="Close"
              @click="onClose"
            >
              <Icon name="ri:close-line" size="22" />
            </button>
          </div>
        </div>

        <div :class="['min-h-0 flex-1 space-y-4 overflow-y-auto', isIos ? 'p-4' : 'p-6']">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="space-y-1">
              <label for="logbook-pdf-start" class="block text-sm font-medium font-quicksand" :class="labelClass">
                From
              </label>
              <input
                id="logbook-pdf-start"
                v-model="dateStart"
                type="date"
                class="min-h-[44px] w-full rounded-lg border px-3 text-base font-quicksand sm:text-sm"
                :class="inputClass"
              />
            </div>
            <div class="space-y-1">
              <label for="logbook-pdf-end" class="block text-sm font-medium font-quicksand" :class="labelClass">
                To
              </label>
              <input
                id="logbook-pdf-end"
                v-model="dateEnd"
                type="date"
                class="min-h-[44px] w-full rounded-lg border px-3 text-base font-quicksand sm:text-sm"
                :class="inputClass"
              />
            </div>
          </div>
          <p class="text-xs font-quicksand" :class="helperClass">
            Blank dates include every entry. Totals before From are amount forwarded.
          </p>

          <div class="space-y-1">
            <label for="logbook-pdf-rows" class="block text-sm font-medium font-quicksand" :class="labelClass">
              Rows per page
            </label>
            <select
              id="logbook-pdf-rows"
              v-model.number="rowsPerPage"
              class="min-h-[44px] w-full rounded-lg border px-3 text-base font-quicksand sm:text-sm"
              :class="inputClass"
            >
              <option v-for="n in rowChoices" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>

          <p class="text-sm font-quicksand" :class="helperClass">
            {{ includedCount }} {{ includedCount === 1 ? 'entry' : 'entries' }}
            <span v-if="forwardedFromPrior > 0"> · {{ forwardedFromPrior }} before range</span>
          </p>
          <p v-if="errorMessage" class="text-sm font-quicksand text-red-600 dark:text-red-400">
            {{ errorMessage }}
          </p>
          <p v-if="progressLabel" class="text-sm font-quicksand" :class="helperClass">
            {{ progressLabel }}
          </p>
        </div>

        <div
          :class="[
            'flex flex-shrink-0 gap-2 border-t',
            isIos ? 'flex-col-reverse p-4' : 'items-center justify-end p-6',
            isDarkMode ? 'border-gray-700' : 'border-gray-300',
          ]"
        >
          <button
            type="button"
            class="inline-flex min-h-[44px] items-center justify-center rounded-lg px-4 text-sm font-medium font-quicksand transition-colors"
            :class="[
              isIos ? 'w-full' : '',
              isDarkMode
                ? 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
                : 'bg-gray-200 text-gray-900 hover:bg-gray-300',
            ]"
            :disabled="busy"
            @click="onClose"
          >
            Cancel
          </button>
          <button
            type="button"
            class="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold font-quicksand text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            :class="isIos ? 'w-full' : ''"
            :disabled="busy || includedCount === 0"
            @click="downloadPdf"
          >
            <Icon name="ri:file-pdf-line" size="18" />
            {{ busy ? 'Building…' : 'Download PDF' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { LogEntry } from '~/utils/logbookTypes'
import {
  DEFAULT_ROWS_PER_PAGE,
  clampRowsPerPage,
  paginatePaperLogbook,
} from '~/utils/logbookPrintLayout'

const props = defineProps<{
  open: boolean
  isDarkMode: boolean
  isIos: boolean
  entries: LogEntry[]
  pilotName: string
  certificateNumber?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const dateStart = ref('')
const dateEnd = ref('')
const rowsPerPage = ref(DEFAULT_ROWS_PER_PAGE)
const busy = ref(false)
const errorMessage = ref('')
const progressLabel = ref('')
const rowChoices = [8, 10, 13, 15, 20]

const labelClass = computed(() => (props.isDarkMode ? 'text-gray-300' : 'text-gray-700'))
const helperClass = computed(() => (props.isDarkMode ? 'text-gray-400' : 'text-gray-500'))
const inputClass = computed(() =>
  props.isDarkMode
    ? 'border-gray-600 bg-gray-900 text-gray-100'
    : 'border-gray-300 bg-white text-gray-900'
)

const preview = computed(() =>
  paginatePaperLogbook(props.entries, {
    dateStart: dateStart.value,
    dateEnd: dateEnd.value,
    rowsPerPage: clampRowsPerPage(rowsPerPage.value),
  })
)

const includedCount = computed(() => preview.value.includedCount)
const forwardedFromPrior = computed(() => preview.value.forwardedFromPrior)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    dateStart.value = ''
    dateEnd.value = ''
    rowsPerPage.value = DEFAULT_ROWS_PER_PAGE
    errorMessage.value = ''
    progressLabel.value = ''
    busy.value = false
  }
)

function onClose() {
  if (busy.value) return
  emit('close')
}

async function downloadPdf() {
  if (busy.value || includedCount.value === 0) return
  busy.value = true
  errorMessage.value = ''
  progressLabel.value = 'Building PDF…'
  try {
    const [{ generatePaperLogbookPdf, paperLogbookFilename }, { saveClientFile }] = await Promise.all([
      import('~/utils/logbookPdf'),
      import('~/utils/clientFileSave'),
    ])
    const bytes = await generatePaperLogbookPdf(props.entries, {
      pilotName: props.pilotName,
      certificateNumber: props.certificateNumber,
      dateStart: dateStart.value,
      dateEnd: dateEnd.value,
      rowsPerPage: clampRowsPerPage(rowsPerPage.value),
      onProgress: (done, total) => {
        progressLabel.value = `Page ${done} of ${total}`
      },
    })
    await saveClientFile({
      filename: paperLogbookFilename({
        dateStart: dateStart.value,
        dateEnd: dateEnd.value,
      }),
      mimeType: 'application/pdf',
      data: bytes,
    })
    emit('close')
  } catch (error) {
    console.error('Paper logbook PDF failed', error)
    errorMessage.value = 'Could not build PDF.'
  } finally {
    busy.value = false
    progressLabel.value = ''
  }
}
</script>
