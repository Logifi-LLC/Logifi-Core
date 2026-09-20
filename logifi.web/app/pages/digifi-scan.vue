<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, ref } from 'vue'
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
import { DIGIFI_EYE_PATH, scanSideForPageShape, type DigifiPageShape } from '~/utils/digifiMobileReview'
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
const pageShape = ref<DigifiPageShape>('left')
let stopAutosave: (() => void) | null = null
let stopDraftFlush: (() => void) | null = null

const title = computed(() => (phase.value === 'review' ? 'Review' : 'Digifi'))
const captureSide = computed(() => scanSideForPageShape(pageShape.value, leftPageScanned.value))
const captureLabel = computed(() => {
  if (pageShape.value === 'two-page' && leftPageScanned.value) return 'Photograph right page'
  if (pageShape.value === 'right') return 'Photograph right page'
  if (pageShape.value === 'two-page') return 'Photograph left page'
  return 'Photograph page'
})

function openCapture() {
  if (!canScan.value || scanning.value) return
  showCamera.value = true
}

async function onCaptureFile(file: File) {
  showCamera.value = false
  await scanPage(file, captureSide.value)
  if (error.value) return
  const needsRight = pageShape.value === 'two-page' && captureSide.value === 'left'
  phase.value = needsRight ? 'setup' : 'review'
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
    await loadLastTemplateIfAny(grid, userId)
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
      <NuxtLink
        :to="DIGIFI_EYE_PATH"
        :class="['text-xs font-semibold', isDarkMode ? 'text-gray-300' : 'text-gray-600']"
      >
        Eye
      </NuxtLink>
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

      <DigifiMobileLayoutWizard
        v-if="phase === 'setup'"
        :scanning="scanning"
        :page-shape="pageShape"
        :capture-label="captureLabel"
        @update:page-shape="pageShape = $event"
        @capture="openCapture"
      />

      <DigifiMobileCameraCapture
        v-if="showCamera"
        :disabled="scanning"
        :shutter-label="captureLabel"
        @capture="onCaptureFile"
        @cancel="showCamera = false"
      />

      <template v-else>
        <DigifiMobileColumnCarousel />
        <button
          type="button"
          :class="['w-full py-2 text-sm font-medium', isDarkMode ? 'text-gray-400' : 'text-gray-500']"
          @click="backToSetup"
        >
          Scan again
        </button>
      </template>
    </div>

    <template v-if="phase === 'review'" #footer>
      <DigifiMobileValidateBar />
    </template>
  </IosAppPageShell>
</template>
