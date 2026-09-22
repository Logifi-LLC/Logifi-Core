<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, ref, watch } from 'vue'
import { navigateTo, useRoute } from '#app'
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
  getStoredDraft,
  resumeDraftAutosave,
  restoreDraftToGrid,
  saveDraftNow,
  setupBuilderDraftAutosave,
  setupBuilderDraftFlush,
  clearBuilderDraft,
  storedDraftHasContent,
  suspendDraftAutosave,
} from '~/composables/useLogbookBuilderDraft'
import { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import { loadLastTemplateIfAny } from '~/composables/useLogbookBuilderLastTemplate'
import {
  clearDigifiPageSideCells,
  recoverDigifiSpreadFromServer,
} from '~/composables/useDigifiSpreadRecovery'
import {
  isMobileCaptureSideComplete,
  isTwoPageReadyForReview,
  mobileSetupCaptureLabel,
  mobileTwoPageCaptureStep,
  mobileTwoPageChipLabel,
  mobileTwoPageLeftChipState,
  mobileTwoPageRightChipState,
  nextMobileCaptureSide,
  type MobileCaptureSession,
} from '~/utils/digifiMobileCapture'
import { DIGIFI_EYE_PATH } from '~/utils/digifiMobileReview'
import {
  pickNextPendingMobileScan,
  upsertPendingMobileScan,
  type PendingMobileScan,
} from '~/utils/digifiMobileScanQueue'
import type { DigifiPageSide } from '~/utils/digifiTypes'
import { useTheme } from '~/composables/useTheme'

const route = useRoute()
const { initAuth, isAuthenticated, user, getAccessToken } = useAuth()
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
  rescanRemarksBand,
  remarksRescanOffers,
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
let pageInitDone = false

const title = computed(() => (phase.value === 'review' ? 'Review' : 'Digifi'))

const captureSession = computed(
  (): MobileCaptureSession => ({
    leftPhotoCaptured: leftPagePhotoCaptured.value,
    rightPhotoCaptured: rightPagePhotoCaptured.value,
  })
)

const nextCaptureSide = computed(() =>
  nextMobileCaptureSide(grid.layout.value, grid, captureSession.value)
)

const captureSide = computed((): DigifiPageSide => nextCaptureSide.value ?? 'left')

const readyForReview = computed(() => isTwoPageReadyForReview(grid))

const captureLabel = computed(() =>
  mobileSetupCaptureLabel(grid.layout.value, nextCaptureSide.value, readyForReview.value)
)

const leftChipLabel = computed(() =>
  mobileTwoPageChipLabel(
    mobileTwoPageLeftChipState(grid, captureSession.value, nextCaptureSide.value)
  )
)

const rightChipLabel = computed(() =>
  mobileTwoPageChipLabel(
    mobileTwoPageRightChipState(grid, captureSession.value, nextCaptureSide.value)
  )
)

const twoPageCaptureStep = computed(() => mobileTwoPageCaptureStep(nextCaptureSide.value))

const leftCaptureComplete = computed(() =>
  isMobileCaptureSideComplete(grid, 'left', leftPagePhotoCaptured.value)
)

const rightCaptureComplete = computed(() =>
  isMobileCaptureSideComplete(grid, 'right', rightPagePhotoCaptured.value)
)

const awaitingRightPagePhoto = computed(
  () =>
    grid.layout.value === 'two-page' &&
    nextCaptureSide.value === 'right' &&
    phase.value === 'setup' &&
    !showCamera.value
)

const captureBlockedByScan = computed(() => {
  if (!scanning.value) return false
  if (grid.layout.value !== 'two-page') return true
  return !leftCaptureComplete.value || captureSide.value !== 'right'
})

function syncCaptureSessionFromGrid() {
  if (grid.layout.value !== 'two-page') return
  if (leftCaptureComplete.value) {
    leftPagePhotoCaptured.value = true
  }
  if (rightCaptureComplete.value) {
    rightPagePhotoCaptured.value = true
  }
}

function resetCaptureSession() {
  leftPagePhotoCaptured.value = false
  rightPagePhotoCaptured.value = false
  pendingScans.value = []
}

function queryWantsNewSpread(): boolean {
  const value = route.query.new
  return value === '1' || value === 'true'
}

/** Fresh spread for a new logbook page: new spreadId, empty scan cells, keep template/layout. */
function beginNewDigifiSpreadSession() {
  resetCaptureSession()
  showCamera.value = false
  grid.clearGrid()
  phase.value = 'setup'
  grid.digifiMobilePhase.value = 'setup'
  clearBuilderDraft(user.value?.id)
  saveDraftNow(grid, user.value?.id)
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

watch(
  phase,
  (value) => {
    grid.digifiMobilePhase.value = value
  },
  { immediate: true }
)

function openCapture() {
  if (!canScan.value || captureBlockedByScan.value) return
  if (nextCaptureSide.value === null) {
    if (readyForReview.value) {
      phase.value = 'review'
    }
    return
  }
  showCamera.value = true
}

function retakeCaptureSide(pageSide: DigifiPageSide) {
  if (pageSide === 'left') {
    leftPagePhotoCaptured.value = false
    grid.leftPageScanned.value = false
  } else {
    rightPagePhotoCaptured.value = false
  }
  grid.clearDigifiScanStatus(pageSide)
  clearDigifiPageSideCells(grid, pageSide)
  pendingScans.value = pendingScans.value.filter((item) => item.pageSide !== pageSide)
  phase.value = 'setup'
  showCamera.value = false
  openCapture()
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
  beginNewDigifiSpreadSession()
}

async function recoverSpreadIfNeeded(userId: string | undefined): Promise<number> {
  if (!isAuthenticated.value || !userId) return 0
  const spreadId = grid.spreadId.value
  if (!spreadId) return 0
  const { recoveredPages } = await recoverDigifiSpreadFromServer({
    grid,
    spreadId,
    getAccessToken,
  })
  if (recoveredPages > 0) {
    saveDraftNow(grid, userId)
  }
  return recoveredPages
}

async function finishPageInit() {
  if (pageInitDone) return
  suspendDraftAutosave()
  const userId = user.value?.id

  if (queryWantsNewSpread()) {
    clearBuilderDraft(userId)
    if (userId) {
      templatePreloaded.value = await loadLastTemplateIfAny(grid, userId)
    }
    beginNewDigifiSpreadSession()
    pageInitDone = true
    resumeDraftAutosave()
    stopAutosave?.()
    stopAutosave = setupBuilderDraftAutosave(grid, userId)
    return
  }

  if (storedDraftHasContent(userId)) {
    const draft = getStoredDraft(userId)
    if (draft) {
      restoreDraftToGrid(grid, draft)
      const recoveredPages = await recoverSpreadIfNeeded(userId)
      if (draft.digifiMobilePhase === 'review') {
        phase.value = 'review'
      } else if (grid.layout.value === 'two-page') {
        syncCaptureSessionFromGrid()
        if (recoveredPages >= 2 || isTwoPageReadyForReview(grid)) {
          phase.value = 'review'
        } else if (grid.leftPageScanned.value) {
          phase.value = 'setup'
        }
      }
      pageInitDone = true
      resumeDraftAutosave()
      stopAutosave?.()
      stopAutosave = setupBuilderDraftAutosave(grid, userId)
      return
    }
  }

  if (userId) {
    templatePreloaded.value = await loadLastTemplateIfAny(grid, userId)
    await recoverSpreadIfNeeded(userId)
    if (grid.layout.value === 'two-page') {
      syncCaptureSessionFromGrid()
    }
  }
  phase.value = 'setup'
  grid.digifiMobilePhase.value = 'setup'
  pageInitDone = true
  resumeDraftAutosave()
  stopAutosave?.()
  stopAutosave = setupBuilderDraftAutosave(grid, userId)
}

onMounted(async () => {
  await initAuth()
  if (!isAuthenticated.value) {
    await navigateTo('/dashboard')
    return
  }
  void fetchBalance()
  void loadPreferredSink()
  await finishPageInit()
  stopDraftFlush?.()
  stopDraftFlush = setupBuilderDraftFlush(grid, user.value?.id)
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
          New spread
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
        :left-chip-label="leftChipLabel"
        :right-chip-label="rightChipLabel"
        :ready-for-review="readyForReview"
        :template-preloaded="templatePreloaded"
        @capture="openCapture"
        @retake="retakeCaptureSide"
      />

      <DigifiMobileCameraCapture
        v-if="showCamera"
        :disabled="captureBlockedByScan"
        :shutter-label="captureLabel"
        :two-page-step="twoPageCaptureStep"
        :left-page-ready-for-right="awaitingRightPagePhoto || twoPageCaptureStep === 2"
        @capture="onCaptureFile"
        @cancel="showCamera = false"
      />

      <DigifiMobileColumnCarousel
        v-else-if="phase === 'review'"
        :remarks-rescan-offers="remarksRescanOffers"
        :rescan-busy="scanning"
        @rescan-remarks-band="(rowIndex) => void rescanRemarksBand(rowIndex)"
      />
    </div>

    <template v-if="phase === 'review'" #footer>
      <DigifiMobileValidateBar />
    </template>
  </IosAppPageShell>
</template>
