<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import DigifiCaptureZones from '~/components/digifi/DigifiCaptureZones.vue'
import IosAppPageShell from '~/components/ios/IosAppPageShell.vue'
import { useCapacitorPlatform } from '~/composables/useCapacitorPlatform'
import { useDigifiCaptureUpload } from '~/composables/useDigifiCaptureUpload'
import { useTheme } from '~/composables/useTheme'

const route = useRoute()
const { isIos } = useCapacitorPlatform()
const { isDark: isDarkMode } = useTheme()
const token = computed(() => String(route.params.token ?? ''))
const {
  checking,
  sessionActive,
  sessionError,
  uploadingSide,
  uploadMessage,
  lastPreviewBySide,
  validateToken,
  onCaptureFile,
} = useDigifiCaptureUpload(token)

const pageClass = computed(() =>
  isDarkMode.value
    ? 'min-h-screen bg-gray-950 text-gray-100 px-4 py-6 font-quicksand'
    : 'min-h-screen bg-gray-50 text-gray-900 px-4 py-6 font-quicksand'
)

onMounted(() => {
  validateToken()
})
</script>

<template>
  <IosAppPageShell v-if="isIos" title="Phone capture">
    <p :class="['mb-4 text-sm', isDarkMode ? 'text-gray-300' : 'text-gray-600']">
      Choose which logbook page you are photographing, then take the picture.
    </p>

    <div v-if="checking" :class="['text-sm', isDarkMode ? 'text-gray-300' : 'text-gray-600']">Checking session…</div>
    <p v-else-if="sessionError" :class="['text-sm', isDarkMode ? 'text-rose-300' : 'text-rose-600']">{{ sessionError }}</p>

    <template v-else>
      <DigifiCaptureZones
        :uploading-side="uploadingSide"
        :last-preview-by-side="lastPreviewBySide"
        :disabled="!sessionActive"
        @select-file="onCaptureFile"
      />

      <p :class="['mt-4 text-xs text-center', isDarkMode ? 'text-gray-500' : 'text-gray-500']">
        Photos are compressed before upload. You can capture each side more than once if needed.
      </p>
    </template>

    <p
      v-if="uploadMessage"
      class="mt-4 text-sm text-center"
      :class="uploadMessage.includes('uploaded') ? (isDarkMode ? 'text-emerald-300' : 'text-emerald-600') : (isDarkMode ? 'text-rose-300' : 'text-rose-600')"
    >
      {{ uploadMessage }}
    </p>
  </IosAppPageShell>

  <main v-else :class="pageClass">
    <div class="mx-auto max-w-md space-y-5">
      <header class="space-y-1">
        <h1 class="text-xl font-semibold">Logifi phone capture</h1>
        <p :class="['text-sm', isDarkMode ? 'text-gray-300' : 'text-gray-600']">
          Choose which logbook page you are photographing, then take the picture.
        </p>
      </header>

      <div v-if="checking" :class="['text-sm', isDarkMode ? 'text-gray-300' : 'text-gray-600']">Checking session…</div>
      <p v-else-if="sessionError" :class="['text-sm', isDarkMode ? 'text-rose-300' : 'text-rose-600']">{{ sessionError }}</p>

      <template v-else>
        <DigifiCaptureZones
          :uploading-side="uploadingSide"
          :last-preview-by-side="lastPreviewBySide"
          :disabled="!sessionActive"
          @select-file="onCaptureFile"
        />

        <p :class="['text-xs text-center', isDarkMode ? 'text-gray-500' : 'text-gray-500']">
          Photos are compressed before upload. You can capture each side more than once if needed.
        </p>
      </template>

      <p
        v-if="uploadMessage"
        class="text-sm text-center"
        :class="uploadMessage.includes('uploaded') ? (isDarkMode ? 'text-emerald-300' : 'text-emerald-600') : (isDarkMode ? 'text-rose-300' : 'text-rose-600')"
      >
        {{ uploadMessage }}
      </p>
    </div>
  </main>
</template>
