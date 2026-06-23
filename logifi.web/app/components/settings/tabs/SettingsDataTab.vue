<template>
  <div class="space-y-6">
    <SettingsListGroup title="Sync" :is-dark-mode="isDarkMode">
      <div class="flex items-center justify-between gap-3 px-4 py-3">
        <div class="min-w-0">
          <p class="text-sm font-medium" :class="isDarkMode ? 'text-gray-100' : 'text-gray-900'">Status</p>
          <div class="mt-1 flex flex-wrap items-center gap-2">
            <span
              class="inline-flex items-center gap-1.5 text-xs font-medium font-quicksand online-status"
              data-testid="online-status"
              :class="syncBadgeClass"
            >
              <Icon :name="syncStatusIcon" :class="{ 'animate-spin': isSyncing }" size="14" />
              {{ syncStatusText }}
            </span>
            <span
              v-if="queueLength > 0"
              data-testid="sync-queue-status"
              class="inline-flex items-center gap-1.5 text-xs font-medium font-quicksand"
              :class="isDarkMode ? 'text-orange-400' : 'text-orange-700'"
            >
              {{ queueLength }} pending
            </span>
          </div>
        </div>
        <button
          v-if="isOnline"
          type="button"
          :disabled="isSyncing"
          class="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium font-quicksand disabled:opacity-50"
          :class="isDarkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-600 text-white hover:bg-blue-700'"
          @click="$emit('sync-now')"
        >
          Sync
        </button>
      </div>
      <div v-if="queueLength > 0 && isOnline" class="border-t px-4 py-3" :class="isDarkMode ? 'border-gray-700' : 'border-gray-100'">
        <button
          type="button"
          :disabled="isSyncing"
          class="text-sm font-medium font-quicksand disabled:opacity-50"
          :class="isDarkMode ? 'text-blue-400' : 'text-blue-600'"
          @click="$emit('retry-sync')"
        >
          Retry failed sync
        </button>
      </div>
    </SettingsListGroup>

    <SettingsListGroup title="Import" :is-dark-mode="isDarkMode">
      <div
        class="px-4 py-3"
        @dragover.prevent="$emit('import-dragover')"
        @dragenter.prevent="$emit('import-dragenter')"
        @dragleave="$emit('import-dragleave')"
        @drop.prevent="$emit('import-drop', $event)"
      >
        <SettingsListRow
          label="Import file"
          subtitle="CSV, TSV, or JSON"
          icon="ri:upload-cloud-2-line"
          :is-dark-mode="isDarkMode"
          :show-chevron="false"
          @click="fileInputRef?.click()"
        />
        <input
          ref="fileInputRef"
          type="file"
          accept=".csv,.txt,.tsv,.json,text/csv,text/plain,application/json"
          class="hidden"
          @change="onFileSelected"
        />
        <p :class="[helper, 'mt-2 px-1 text-xs']">
          Duplicates (same date and registration) are skipped. Drag and drop also works on desktop.
        </p>
      </div>
    </SettingsListGroup>

    <SettingsListGroup title="Integrations" :is-dark-mode="isDarkMode">
      <SettingsListRow
        label="Data sources"
        subtitle="Third-party APIs"
        icon="ri:links-line"
        :is-dark-mode="isDarkMode"
        to="/data-sources?from=dashboard"
        @click="$emit('close')"
      />
      <div class="border-t px-4 py-3" :class="isDarkMode ? 'border-gray-700' : 'border-gray-100'">
        <FcvSync mode="connect" :is-dark-mode="isDarkMode" show-rollout-label />
      </div>
    </SettingsListGroup>

    <SettingsListGroup title="Export" :is-dark-mode="isDarkMode">
      <SettingsListRow
        label="Export logbook"
        :subtitle="`${entryCount} ${entryCount === 1 ? 'entry' : 'entries'}`"
        icon="ri:download-cloud-2-line"
        :is-dark-mode="isDarkMode"
        @click="entryCount > 0 && $emit('export-logbook')"
      />
      <SettingsListRow
        label="Generate FAA Form 8710"
        subtitle="PDF from logbook data"
        icon="ri:file-pdf-line"
        :is-dark-mode="isDarkMode"
        @click="entryCount > 0 && $emit('generate-8710')"
      />
    </SettingsListGroup>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import SettingsListGroup from '../SettingsListGroup.vue'
import SettingsListRow from '../SettingsListRow.vue'
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

const emit = defineEmits<{
  'retry-sync': []
  'sync-now': []
  'import-dragover': []
  'import-dragenter': []
  'import-dragleave': []
  'import-drop': [event: DragEvent]
  'import-file': [file: File]
  'export-logbook': []
  'generate-8710': []
  close: []
}>()

const { helper } = useSettingsClasses(computed(() => props.isDarkMode))
const fileInputRef = ref<HTMLInputElement | null>(null)

const syncBadgeClass = computed(() => {
  if (!props.isOnline) {
    return props.isDarkMode ? 'text-red-400' : 'text-red-700'
  }
  if (props.isSyncing) {
    return props.isDarkMode ? 'text-yellow-400' : 'text-yellow-700'
  }
  return props.isDarkMode ? 'text-green-400' : 'text-green-700'
})

function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  emit('import-file', file)
  input.value = ''
}
</script>
