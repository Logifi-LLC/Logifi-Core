<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <SettingsSection title="Sync status" :is-dark-mode="isDarkMode">
      <div class="flex flex-wrap items-center gap-2">
        <span
          class="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium font-quicksand"
          :class="syncBadgeClass"
        >
          <Icon :name="syncStatusIcon" :class="{ 'animate-spin': isSyncing }" size="14" />
          {{ syncStatusText }}
        </span>
        <span
          v-if="queueLength > 0"
          class="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium font-quicksand"
          :class="isDarkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-800'"
        >
          <Icon name="ri:time-line" size="14" />
          {{ queueLength }} pending
        </span>
        <span
          v-if="syncError"
          class="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium font-quicksand"
          :class="isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-800'"
        >
          <Icon name="ri:error-warning-line" size="14" />
          Sync error
        </span>
      </div>
      <button
        v-if="queueLength > 0 && isOnline"
        type="button"
        :disabled="isSyncing"
        class="mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium font-quicksand disabled:opacity-50"
        :class="
          isDarkMode
            ? 'border-gray-600 text-blue-400 hover:bg-gray-800'
            : 'border-gray-200 text-blue-700 hover:bg-gray-50'
        "
        @click="$emit('retry-sync')"
      >
        <Icon name="ri:refresh-line" size="16" :class="{ 'animate-spin': isSyncing }" />
        Retry sync
      </button>
    </SettingsSection>

    <SettingsSection
      title="Import"
      description="CSV or JSON. Duplicate entries (same date and registration) are skipped."
      :is-dark-mode="isDarkMode"
    >
      <div
        class="rounded-lg border-2 border-dashed p-6 text-center transition-colors"
        :class="
          isDragOver
            ? isDarkMode
              ? 'border-green-600 bg-green-900/20'
              : 'border-green-500 bg-green-50'
            : isDarkMode
              ? 'border-gray-700 bg-gray-800/40'
              : 'border-gray-300 bg-gray-50'
        "
        @dragover.prevent="$emit('import-dragover')"
        @dragenter.prevent="$emit('import-dragenter')"
        @dragleave="$emit('import-dragleave')"
        @drop.prevent="$emit('import-drop', $event)"
      >
        <Icon name="ri:upload-cloud-2-line" size="28" :class="isDarkMode ? 'text-gray-500' : 'text-gray-400'" class="mx-auto mb-2" />
        <p class="mb-4 text-sm font-medium" :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
          {{ isDragOver ? 'Drop file here' : 'Drag and drop a file, or browse' }}
        </p>
        <div class="flex flex-col items-center justify-center gap-2 sm:flex-row">
          <button type="button" :class="btnSecondary" @click="$emit('browse-csv')">
            <Icon name="ri:file-excel-2-line" size="16" class="mr-1.5 inline" />
            CSV
          </button>
          <button type="button" :class="btnSecondary" @click="$emit('browse-json')">
            <Icon name="ri:file-code-line" size="16" class="mr-1.5 inline" />
            JSON
          </button>
        </div>
      </div>

      <button
        type="button"
        class="mt-4 flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm font-semibold font-quicksand transition-colors"
        :class="isDarkMode ? 'border-gray-700 bg-gray-800/50 hover:bg-gray-800' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'"
        @click="showImportGuide = !showImportGuide"
      >
        <span>Supported columns</span>
        <Icon :name="showImportGuide ? 'ri:arrow-up-s-line' : 'ri:arrow-down-s-line'" size="18" />
      </button>
      <div
        v-show="showImportGuide"
        class="mt-2 rounded-lg border p-4 text-sm font-quicksand space-y-3"
        :class="isDarkMode ? 'border-gray-700 bg-gray-900/40 text-gray-300' : 'border-gray-200 bg-white text-gray-700'"
      >
        <p>
          Logifi accepts flexible column headers. Export from Logifi for the canonical round-trip format.
        </p>
        <div>
          <p class="font-semibold mb-1">Required for Part 61 validation</p>
          <ul class="list-disc pl-5 space-y-0.5">
            <li>Date</li>
            <li>Role (or PIC/SIC/Dual Received time to infer role)</li>
            <li>Category/Class (e.g. HELI, ASEL)</li>
            <li>Registration / Ident</li>
            <li>Aircraft Make/Model or Aircraft Type</li>
            <li>Total Flight Time or Total (Turbine accepted as alias)</li>
          </ul>
        </div>
        <div>
          <p class="font-semibold mb-1">Common time column aliases</p>
          <ul class="list-disc pl-5 space-y-0.5">
            <li>Night → Night</li>
            <li>Actual → Actual Instrument</li>
            <li>Hood → Simulated Instrument</li>
            <li>NVG → NVG time (enable military fields in Profile)</li>
            <li>Dual Received → Dual Received</li>
          </ul>
        </div>
        <p :class="helper" class="text-xs">
          Enable <strong>Military logbook fields</strong> under Profile to log NVG hours and use the NVG flight condition.
        </p>
      </div>
    </SettingsSection>

    <SettingsSection
      title="Integrations"
      description="Connect external logbook services."
      :is-dark-mode="isDarkMode"
    >
      <p class="mb-4 text-sm">
        <NuxtLink
          to="/data-sources?from=dashboard"
          :class="isDarkMode ? 'text-blue-400 hover:underline' : 'text-blue-600 hover:underline'"
        >
          Data sources &amp; third-party APIs
        </NuxtLink>
      </p>
      <FcvSync mode="connect" :is-dark-mode="isDarkMode" show-rollout-label />
    </SettingsSection>

    <SettingsSection title="Export" :is-dark-mode="isDarkMode">
      <p :class="helper" class="mb-4">
        Download a logbook backup or generate FAA Form 8710.
        <span class="mt-1 block font-medium">{{ entryCount }} {{ entryCount === 1 ? 'entry' : 'entries' }}</span>
      </p>
      <div class="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          :disabled="entryCount === 0"
          :class="btnPrimary"
          class="disabled:cursor-not-allowed"
          @click="$emit('export-logbook')"
        >
          <Icon name="ri:download-cloud-2-line" size="16" class="mr-1.5 inline" />
          Export logbook
        </button>
        <button
          type="button"
          :disabled="entryCount === 0"
          :class="btnSecondary"
          class="disabled:cursor-not-allowed disabled:opacity-50"
          @click="$emit('generate-8710')"
        >
          <Icon name="ri:file-pdf-line" size="16" class="mr-1.5 inline" />
          Generate 8710
        </button>
      </div>
    </SettingsSection>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import SettingsSection from '../SettingsSection.vue'
import { useSettingsClasses } from '../useSettingsClasses'
import FcvSync from '~/components/fcv/FcvSync.vue'

const props = defineProps<{
  isDarkMode: boolean
  isOnline: boolean
  isSyncing: boolean
  syncError: boolean
  syncStatusIcon: string
  syncStatusText: string
  queueLength: number
  isDragOver: boolean
  entryCount: number
}>()

defineEmits<{
  'retry-sync': []
  'import-dragover': []
  'import-dragenter': []
  'import-dragleave': []
  'import-drop': [event: DragEvent]
  'browse-csv': []
  'browse-json': []
  'export-logbook': []
  'generate-8710': []
}>()

const showImportGuide = ref(false)

const { helper, btnPrimary, btnSecondary } = useSettingsClasses(computed(() => props.isDarkMode))

const syncBadgeClass = computed(() => {
  if (!props.isOnline) {
    return props.isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-800'
  }
  if (props.isSyncing) {
    return props.isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-800'
  }
  return props.isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800'
})
</script>
