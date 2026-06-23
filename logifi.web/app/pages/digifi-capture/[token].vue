<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import DigifiCaptureZones from '~/components/digifi/DigifiCaptureZones.vue'
import IosAppPageShell from '~/components/ios/IosAppPageShell.vue'
import { useCapacitorPlatform } from '~/composables/useCapacitorPlatform'
import { useDigifiCaptureUpload } from '~/composables/useDigifiCaptureUpload'

const route = useRoute()
const { isIos } = useCapacitorPlatform()
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

onMounted(() => {
  validateToken()
})
</script>

<template>
  <IosAppPageShell v-if="isIos" title="Phone capture">
    <p class="mb-4 text-sm text-slate-300">
      Choose which logbook page you are photographing, then take the picture.
    </p>

    <div v-if="checking" class="text-sm text-slate-300">Checking session…</div>
    <p v-else-if="sessionError" class="text-sm text-rose-300">{{ sessionError }}</p>

    <template v-else>
      <DigifiCaptureZones
        :uploading-side="uploadingSide"
        :last-preview-by-side="lastPreviewBySide"
        :disabled="!sessionActive"
        @select-file="onCaptureFile"
      />

      <p class="mt-4 text-xs text-center text-slate-500">
        Photos are compressed before upload. You can capture each side more than once if needed.
      </p>
    </template>

    <p
      v-if="uploadMessage"
      class="mt-4 text-sm text-center"
      :class="uploadMessage.includes('uploaded') ? 'text-emerald-300' : 'text-rose-300'"
    >
      {{ uploadMessage }}
    </p>
  </IosAppPageShell>

  <main v-else class="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 font-quicksand">
    <div class="mx-auto max-w-md space-y-5">
      <header class="space-y-1">
        <h1 class="text-xl font-semibold">Logifi phone capture</h1>
        <p class="text-sm text-slate-300">
          Choose which logbook page you are photographing, then take the picture.
        </p>
      </header>

      <div v-if="checking" class="text-sm text-slate-300">Checking session…</div>
      <p v-else-if="sessionError" class="text-sm text-rose-300">{{ sessionError }}</p>

      <template v-else>
        <DigifiCaptureZones
          :uploading-side="uploadingSide"
          :last-preview-by-side="lastPreviewBySide"
          :disabled="!sessionActive"
          @select-file="onCaptureFile"
        />

        <p class="text-xs text-slate-500 text-center">
          Photos are compressed before upload. You can capture each side more than once if needed.
        </p>
      </template>

      <p
        v-if="uploadMessage"
        class="text-sm text-center"
        :class="uploadMessage.includes('uploaded') ? 'text-emerald-300' : 'text-rose-300'"
      >
        {{ uploadMessage }}
      </p>
    </div>
  </main>
</template>
