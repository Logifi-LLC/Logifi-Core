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
      <div v-if="isOnline" class="border-t px-4 py-3" :class="isDarkMode ? 'border-gray-700' : 'border-gray-100'">
        <button
          type="button"
          :disabled="isSyncing"
          class="text-sm font-medium font-quicksand disabled:opacity-50"
          :class="isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'"
          @click="$emit('force-full-sync')"
        >
          Force full sync
        </button>
        <p :class="[helper, 'mt-1 text-xs']">
          Re-downloads your entire logbook. Use only if entries look out of date after a normal sync.
        </p>
      </div>
    </SettingsListGroup>

    <SettingsListGroup title="Import" :is-dark-mode="isDarkMode">
      <div
        @dragover.prevent="$emit('import-dragover')"
        @dragenter.prevent="$emit('import-dragenter')"
        @dragleave="$emit('import-dragleave')"
        @drop.prevent="onImportDrop"
      >
        <SettingsListRow
          label="Import from provider"
          subtitle="ForeFlight, MyFlightBook, LogTen, or CSV"
          icon="ri:upload-cloud-2-line"
          :is-dark-mode="isDarkMode"
          :show-chevron="true"
          @click="openImportModal()"
        />
      </div>
      <div class="border-t px-4 py-3" :class="isDarkMode ? 'border-gray-700' : 'border-gray-100'">
        <p :class="[helper, 'text-xs']">
          Choose your logbook software for guided export. Files are parsed on-device. Duplicates (same date and registration) are skipped.
        </p>
      </div>
      <SettingsListRow
        label="Logbook transfer"
        :subtitle="transferRowSubtitle"
        icon="ri:mail-send-line"
        :is-dark-mode="isDarkMode"
        :show-chevron="!hasPendingTransfer"
        @click="openTransferSheet()"
      />
      <LogbookImportModal
        :is-open="showImportModal"
        :is-dark-mode="isDarkMode"
        :pending-file="pendingImportFile"
        @close="closeImportModal"
        @import-provider-file="onProviderFile"
        @request-transfer="openTransferSheet()"
      />
      <LogbookTransferRequestSheet
        :is-open="showTransferSheet"
        :is-dark-mode="isDarkMode"
        @close="closeTransferSheet"
        @success="onTransferSuccess"
      />
      <div class="border-t px-4 py-3" :class="isDarkMode ? 'border-gray-700' : 'border-gray-100'">
        <button
          type="button"
          class="flex w-full items-center justify-between text-left text-sm font-semibold font-quicksand transition-colors"
          :class="isDarkMode ? 'text-gray-100 hover:text-white' : 'text-gray-900 hover:text-gray-700'"
          @click="showImportGuide = !showImportGuide"
        >
          <span>Supported columns</span>
          <Icon :name="showImportGuide ? 'ri:arrow-up-s-line' : 'ri:arrow-down-s-line'" size="18" />
        </button>
        <div
          v-show="showImportGuide"
          class="mt-3 rounded-lg border p-4 text-sm font-quicksand space-y-3"
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
      </div>
    </SettingsListGroup>

    <SettingsListGroup title="Integrations" :is-dark-mode="isDarkMode">
      <SettingsListRow
        v-if="fcvConnected"
        label="Import airline schedule (Autofi)"
        subtitle="Pull new flights from FLICA into logbook"
        icon="ri:download-cloud-2-line"
        :is-dark-mode="isDarkMode"
        @click="$emit('import-fcv')"
      />
      <SettingsListRow
        label="Data sources"
        subtitle="Third-party APIs"
        icon="ri:links-line"
        :is-dark-mode="isDarkMode"
        to="/data-sources?from=dashboard"
        @click="$emit('close')"
      />
      <div class="border-t px-4 py-3" :class="isDarkMode ? 'border-gray-700' : 'border-gray-100'">
        <FcvSync mode="connect" :is-dark-mode="isDarkMode" @connection-changed="$emit('flica-connection-changed', $event)" />
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
import { computed, onMounted, ref } from 'vue'
import SettingsListGroup from '../SettingsListGroup.vue'
import SettingsListRow from '../SettingsListRow.vue'
import { useSettingsClasses } from '../useSettingsClasses'
import FcvSync from '~/components/fcv/FcvSync.vue'
import LogbookImportModal from '~/components/import/LogbookImportModal.vue'
import LogbookTransferRequestSheet from '~/components/import/LogbookTransferRequestSheet.vue'
import type { ImportProviderKey } from '../../../../shared/import'
import { useLogbookTransferRequest } from '~/composables/useLogbookTransferRequest'

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
  fcvConnected?: boolean
}>()

const emit = defineEmits<{
  'retry-sync': []
  'sync-now': []
  'force-full-sync': []
  'import-dragover': []
  'import-dragenter': []
  'import-dragleave': []
  'import-drop': [event: DragEvent]
  'import-file': [file: File]
  'import-provider-file': [payload: { file: File; provider: ImportProviderKey }]
  'export-logbook': []
  'generate-8710': []
  'import-fcv': []
  'flica-connection-changed': [{ connected: boolean }]
  close: []
}>()

const showImportGuide = ref(false)
const showImportModal = ref(false)
const showTransferSheet = ref(false)
const pendingImportFile = ref<File | null>(null)

const { helper } = useSettingsClasses(computed(() => props.isDarkMode))
const { hasPendingRequest: hasPendingTransfer, refreshStatus: refreshTransferStatus } =
  useLogbookTransferRequest()

const transferRowSubtitle = computed(() =>
  hasPendingTransfer.value
    ? "Requested — we'll email you to schedule"
    : 'LogTen, ForeFlight, or CSV — request a reviewed transfer',
)

onMounted(() => {
  void refreshTransferStatus()
})

const syncBadgeClass = computed(() => {
  if (props.syncStatusText === 'Checking…') {
    return props.isDarkMode ? 'text-gray-400' : 'text-gray-500'
  }
  if (!props.isOnline || props.syncStatusText === 'Offline') {
    return props.isDarkMode ? 'text-red-400' : 'text-red-700'
  }
  if (props.isSyncing || props.syncStatusText === 'Syncing') {
    return props.isDarkMode ? 'text-yellow-400' : 'text-yellow-700'
  }
  return props.isDarkMode ? 'text-green-400' : 'text-green-700'
})

function openImportModal(file?: File | null) {
  pendingImportFile.value = file ?? null
  showImportModal.value = true
}

function closeImportModal() {
  showImportModal.value = false
  pendingImportFile.value = null
}

function openTransferSheet() {
  showTransferSheet.value = true
}

function closeTransferSheet() {
  showTransferSheet.value = false
}

function onTransferSuccess() {
  void refreshTransferStatus()
}

function onProviderFile(payload: { file: File; provider: ImportProviderKey }) {
  emit('import-provider-file', payload)
  closeImportModal()
}

function onImportDrop(event: DragEvent) {
  // Handle locally so dashboard does not auto-parse without a provider.
  const file = event.dataTransfer?.files?.[0]
  if (!file) return
  const name = file.name.toLowerCase()
  if (name.endsWith('.json')) {
    emit('import-file', file)
    return
  }
  openImportModal(file)
}
</script>
