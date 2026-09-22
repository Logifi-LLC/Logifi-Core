<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, ref, watch } from 'vue'
import { navigateTo } from '#app'
import DigifiCreditsIndicator from '~/components/digifi/DigifiCreditsIndicator.vue'
import DigifiMobileColumnCarousel from '~/components/digifi/DigifiMobileColumnCarousel.vue'
import DigifiMobileLayoutWizard from '~/components/digifi/DigifiMobileLayoutWizard.vue'
import DigifiMobileCameraCapture from '~/components/digifi/DigifiMobileCameraCapture.vue'
import DigifiMobileValidateBar from '~/components/digifi/DigifiMobileValidateBar.vue'
import IosAppPageShell from '~/components/ios/IosAppPageShell.vue'
import { useAuth } from '~/composables/useAuth'
import { useDigifiCredits } from '~/composables/useDigifiCredits'
import { useDigifiDestination } from '~/composables/useDigifiDestination'
import { useLogbookBuilderDigifi } from '~/composables/useLogbookBuilderDigifi'
import {
  resumeDraftAutosave,
  saveDraftNow,
  setupBuilderDraftAutosave,
  setupBuilderDraftFlush,
  suspendDraftAutosave,
} from '~/composables/useLogbookBuilderDraft'
import { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import { loadLastTemplateIfAny } from '~/composables/useLogbookBuilderLastTemplate'
import { DIGIFI_EYE_PATH } from '~/utils/digifiMobileReview'
import {
  pickNextPendingMobileScan,
  upsertPendingMobileScan,
  type PendingMobileScan,
} from '~/utils/digifiMobileScanQueue'
import type { DigifiPageSide } from '~/utils/digifiTypes'
import { useTheme } from '~/composables/useTheme'

const { initAuth, isAuthenticated, user } = useAuth()
const { isDark: isDarkMode } = useTheme()
const { fetchBalance } = useDigifiCredits()
const { preferredSink, loadPreferredSink } = useDigifiDestination()

const grid = useLogbookBuilderGrid()
provide('logbookBuilderGrid', grid)
provide('digifiPreferredSink', preferredSink)

const {
  scanning,
  error,
  scanRowWarning,
  scanPhase,
  canScan,
  scanPage,
  leftPageScanned,
} = useLogbookBuilderDigifi(grid)

const phase = ref<'setup' | 'review'>('setup')
const showCamera = ref(false)
const leftPagePhotoCaptured = ref(false)
const rightPagePhotoCaptured = ref(false)
const pendingScans = ref<PendingMobileScan[]>([])
let scanDrainChain: Promise<void> = Promise.resolve()
const templatePreloaded = ref(false)
let stopAutosave: (() => void) | null = null
let stopDraftFlush: (() => void) | null = null

const title = computed(() => (phase.value === 'review' ? 'Review' : 'Digifi'))
const captureSide = computed((): DigifiPageSide => {
  if (grid.layout.value === 'two-page' && leftPagePhotoCaptured.value) return 'right'
  return 'left'
})
const captureLabel = computed(() => {
  if (grid.layout.value === 'two-page' && leftPagePhotoCaptured.value) return 'Photograph right page'
  if (grid.layout.value === 'two-page') return 'Photograph left page'
  return 'Photograph page'
})
const twoPageCaptureStep = computed((): 1 | 2 | null => {
  if (grid.layout.value !== 'two-page') return null
  return leftPagePhotoCaptured.value ? 2 : 1
})
const awaitingRightPagePhoto = computed(
  () =>
    grid.layout.value === 'two-page' &&
    leftPagePhotoCaptured.value &&
    !rightPagePhotoCaptured.value &&
    phase.value === 'setup'
)
const captureBlockedByScan = computed(() => {
  if (!scanning.value) return false
  if (grid.layout.value !== 'two-page') return true
  return !leftPagePhotoCaptured.value || captureSide.value !== 'right'
})

function resetCaptureSession() {
  leftPagePhotoCaptured.value = false
  rightPagePhotoCaptured.value = false
  pendingScans.value = []
}

function scheduleScanDrain() {
  scanDrainChain = scanDrainChain.then(() => drainPendingScans()).catch(() => {})
}

async function drainPendingScans() {
  if (scanning.value || !canScan.value) return

  const next = pickNextPendingMobileScan(
    pendingScans.value,
    grid.layout.value,
    leftPageScanned.value
  )
  if (!next) return

  pendingScans.value = pendingScans.value.filter((item) => item.pageSide !== next.pageSide)
  await scanPage(next.file, next.pageSide)
  scheduleScanDrain()
}

async function waitForScanPipelineIdle() {
  scheduleScanDrain()
  await scanDrainChain
  while (pendingScans.value.length > 0 || scanning.value) {
    scheduleScanDrain()
    await scanDrainChain
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

watch(scanning, (isScanning, wasScanning) => {
  if (wasScanning && !isScanning) {
    scheduleScanDrain()
  }
})

watch(
  () => grid.layout.value,
  () => {
    resetCaptureSession()
  }
)

function openCapture() {
  if (!canScan.value || captureBlockedByScan.value) return
  showCamera.value = true
}

async function onCaptureFile(file: File) {
  const pageSide = captureSide.value

  if (pageSide === 'left' && grid.layout.value === 'two-page') {
    leftPagePhotoCaptured.value = true
  }
  if (pageSide === 'right') {
    rightPagePhotoCaptured.value = true
  }

  pendingScans.value = upsertPendingMobileScan(pendingScans.value, pageSide, file)
  scheduleScanDrain()

  const needsRightPhoto = grid.layout.value === 'two-page' && pageSide === 'left'
  if (needsRightPhoto) {
    phase.value = 'setup'
    return
  }

  showCamera.value = false
  await waitForScanPipelineIdle()
  if (!error.value) {
    phase.value = 'review'
  }
}

async function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  await onCaptureFile(file)
}

function backToSetup() {
  phase.value = 'setup'
  resetCaptureSession()
}

onMounted(async () => {
  await initAuth()
  if (!isAuthenticated.value) {
    await navigateTo('/dashboard')
    return
  }
  void fetchBalance()
  void loadPreferredSink()
  suspendDraftAutosave()
  const userId = user.value?.id
  if (userId) {
    templatePreloaded.value = await loadLastTemplateIfAny(grid, userId)
  }
  resumeDraftAutosave()
  stopAutosave?.()
  stopAutosave = setupBuilderDraftAutosave(grid, userId)
  stopDraftFlush?.()
  stopDraftFlush = setupBuilderDraftFlush(grid, userId)
})

onUnmounted(() => {
  stopAutosave?.()
  stopDraftFlush?.()
  saveDraftNow(grid, user.value?.id)
})
</script>

<template>
  <IosAppPageShell :title="title">
    <template #trailing>
      <div class="flex flex-col items-end gap-0.5 leading-tight">
        <button
          v-if="phase === 'review'"
          type="button"
          :class="['text-[11px] font-medium', isDarkMode ? 'text-gray-400' : 'text-gray-500']"
          @click="backToSetup"
        >
          Scan again
        </button>
        <NuxtLink
          :to="DIGIFI_EYE_PATH"
          :class="['text-xs font-semibold', isDarkMode ? 'text-gray-300' : 'text-gray-600']"
        >
          Eye
        </NuxtLink>
      </div>
    </template>

    <div class="space-y-4">
      <DigifiCreditsIndicator compact />

      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        capture="environment"
        class="hidden"
        @change="onFile"
      >

      <p v-if="error" :class="['text-sm', isDarkMode ? 'text-rose-300' : 'text-rose-600']">{{ error }}</p>
      <p v-else-if="scanPhase" :class="['text-sm', isDarkMode ? 'text-gray-300' : 'text-gray-600']">{{ scanPhase }}</p>
      <p v-if="scanRowWarning" :class="['text-xs', isDarkMode ? 'text-amber-200' : 'text-amber-700']">{{ scanRowWarning }}</p>

      <p
        v-if="awaitingRightPagePhoto"
        :class="['text-sm font-medium', isDarkMode ? 'text-green-200' : 'text-green-800']"
      >
        Left page captured. Photograph the right page next — one page per photo.
      </p>

      <DigifiMobileLayoutWizard
        v-if="phase === 'setup'"
        :scanning="scanning"
        :capture-label="captureLabel"
        :two-page-step="twoPageCaptureStep"
        :left-page-scanned="leftPageScanned"
        :left-page-photo-captured="leftPagePhotoCaptured"
        :template-preloaded="templatePreloaded"
        @capture="openCapture"
      />

      <DigifiMobileCameraCapture
        v-if="showCamera"
        :disabled="captureBlockedByScan"
        :shutter-label="captureLabel"
        :two-page-step="twoPageCaptureStep"
        @capture="onCaptureFile"
        @cancel="showCamera = false"
      />

      <DigifiMobileColumnCarousel v-else-if="phase === 'review'" />
    </div>

    <template v-if="phase === 'review'" #footer>
      <DigifiMobileValidateBar />
    </template>
  </IosAppPageShell>
</template>
