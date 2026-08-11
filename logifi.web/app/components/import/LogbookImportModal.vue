<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ImportProviderKey } from '../../../shared/import'
import { PROVIDER_GUIDE_LIST } from '../../../shared/import'
import ProviderInstructionCard from './ProviderInstructionCard.vue'

const props = defineProps<{
  isOpen: boolean
  isDarkMode: boolean
  /** Optional file from Settings drag-drop, applied after provider is chosen. */
  pendingFile?: File | null
}>()

const emit = defineEmits<{
  close: []
  'import-provider-file': [payload: { file: File; provider: ImportProviderKey }]
}>()

type Step = 1 | 2

const step = ref<Step>(1)
const selectedProvider = ref<ImportProviderKey | null>(null)
const isDragOver = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const errorMessage = ref<string | null>(null)

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      step.value = 1
      selectedProvider.value = null
      isDragOver.value = false
      errorMessage.value = null
    }
  }
)

const selectedGuide = computed(() =>
  selectedProvider.value
    ? PROVIDER_GUIDE_LIST.find((g) => g.key === selectedProvider.value) ?? null
    : null
)

function selectProvider(key: ImportProviderKey) {
  selectedProvider.value = key
  errorMessage.value = null
  step.value = 2

  // If Settings already dropped a file, process it once provider is known.
  if (props.pendingFile) {
    submitFile(props.pendingFile)
  }
}

function goBack() {
  step.value = 1
  errorMessage.value = null
}

function close() {
  emit('close')
}

function acceptFile(file: File | undefined | null) {
  if (!file) return
  const name = file.name.toLowerCase()
  const ok =
    name.endsWith('.csv') ||
    name.endsWith('.tsv') ||
    name.endsWith('.txt') ||
    file.type === 'text/csv' ||
    file.type === 'text/plain' ||
    file.type === 'text/tab-separated-values'

  if (!ok) {
    errorMessage.value = 'Please choose a .csv, .tsv, or .txt file.'
    return
  }
  submitFile(file)
}

function submitFile(file: File) {
  if (!selectedProvider.value) {
    errorMessage.value = 'Select a logbook provider first.'
    return
  }
  errorMessage.value = null
  emit('import-provider-file', { file, provider: selectedProvider.value })
  emit('close')
}

function onFileInput(e: Event) {
  const input = e.target as HTMLInputElement
  acceptFile(input.files?.[0])
  input.value = ''
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false
  acceptFile(e.dataTransfer?.files?.[0])
}

function onDragOver(e: DragEvent) {
  if (!e.dataTransfer?.types.includes('Files')) return
  e.preventDefault()
  isDragOver.value = true
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
}

function onDragLeave() {
  isDragOver.value = false
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm"
      @click.self="close"
    >
      <div
        class="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)]"
        :class="
          isDarkMode
            ? 'bg-gray-900 border border-gray-800'
            : 'bg-white border border-gray-100'
        "
        role="dialog"
        aria-labelledby="logbook-import-modal-title"
        aria-modal="true"
        @click.stop
      >
        <div
          class="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10"
          :class="isDarkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-100 bg-white'"
        >
          <div>
            <h2
              id="logbook-import-modal-title"
              class="text-lg font-bold font-quicksand"
              :class="isDarkMode ? 'text-white' : 'text-gray-900'"
            >
              Import logbook
            </h2>
            <p
              class="mt-0.5 text-xs font-quicksand"
              :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
            >
              {{ step === 1 ? 'Step 1 — Choose your current logbook software' : 'Step 2 — Export & drop your file' }}
            </p>
          </div>
          <button
            type="button"
            class="p-2 rounded-full transition-colors"
            :class="
              isDarkMode
                ? 'text-gray-500 hover:text-white hover:bg-gray-800'
                : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'
            "
            aria-label="Close"
            @click="close"
          >
            <Icon name="ri:close-line" size="20" />
          </button>
        </div>

        <div class="p-6 space-y-5 font-quicksand">
          <!-- Step 1: provider grid -->
          <div v-if="step === 1" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              v-for="guide in PROVIDER_GUIDE_LIST"
              :key="guide.key"
              type="button"
              class="text-left rounded-2xl border px-4 py-4 transition-colors"
              :class="
                isDarkMode
                  ? 'border-gray-700 bg-gray-800/60 hover:border-blue-500 hover:bg-gray-800'
                  : 'border-gray-200 bg-white hover:border-blue-500 hover:bg-blue-50/40'
              "
              @click="selectProvider(guide.key)"
            >
              <div class="flex items-center gap-3">
                <span class="text-2xl" aria-hidden="true">{{ guide.emoji }}</span>
                <div>
                  <p
                    class="text-sm font-semibold"
                    :class="isDarkMode ? 'text-gray-100' : 'text-gray-900'"
                  >
                    {{ guide.label }}
                  </p>
                  <p
                    class="mt-0.5 text-xs leading-snug"
                    :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
                  >
                    {{ guide.description }}
                  </p>
                </div>
              </div>
            </button>
          </div>

          <!-- Step 2: instructions + dropzone -->
          <div v-else class="space-y-4">
            <button
              type="button"
              class="inline-flex items-center gap-1 text-sm font-medium"
              :class="isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'"
              @click="goBack"
            >
              <Icon name="ri:arrow-left-line" size="16" />
              Change provider
            </button>

            <div
              v-if="selectedProvider"
              class="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-4"
            >
              <ProviderInstructionCard
                :provider="selectedProvider"
                :is-dark-mode="isDarkMode"
              />

              <div
                class="rounded-2xl border-2 border-dashed p-6 flex flex-col items-center justify-center text-center min-h-[220px] transition-colors"
                :class="[
                  isDragOver
                    ? isDarkMode
                      ? 'border-blue-400 bg-blue-950/40'
                      : 'border-blue-500 bg-blue-50'
                    : isDarkMode
                      ? 'border-gray-600 bg-gray-800/40'
                      : 'border-gray-300 bg-gray-50',
                ]"
                @dragover="onDragOver"
                @dragenter.prevent="onDragOver"
                @dragleave="onDragLeave"
                @drop.prevent="onDrop"
              >
                <Icon
                  name="ri:upload-cloud-2-line"
                  size="36"
                  :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
                />
                <p
                  class="mt-3 text-sm font-semibold"
                  :class="isDarkMode ? 'text-gray-100' : 'text-gray-900'"
                >
                  Drop {{ selectedGuide?.label }} export here
                </p>
                <p
                  class="mt-1 text-xs"
                  :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
                >
                  Accepts .csv, .tsv, or .txt — parsed on-device for privacy.
                </p>
                <button
                  type="button"
                  class="mt-4 rounded-lg px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  @click="fileInputRef?.click()"
                >
                  Choose file
                </button>
                <input
                  ref="fileInputRef"
                  type="file"
                  accept=".csv,.tsv,.txt,text/csv,text/plain,text/tab-separated-values"
                  class="hidden"
                  @change="onFileInput"
                />
              </div>
            </div>

            <p
              v-if="errorMessage"
              class="text-sm"
              :class="isDarkMode ? 'text-red-400' : 'text-red-600'"
            >
              {{ errorMessage }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
