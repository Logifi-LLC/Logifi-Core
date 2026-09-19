<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { navigateTo } from '#app'
import DigifiCaptureZones from '~/components/digifi/DigifiCaptureZones.vue'
import IosAppPageShell from '~/components/ios/IosAppPageShell.vue'
import { useAuth } from '~/composables/useAuth'
import { useCapacitorPlatform } from '~/composables/useCapacitorPlatform'
import { useDigifiCaptureUpload } from '~/composables/useDigifiCaptureUpload'
import { useDigifiQrScanner } from '~/composables/useDigifiQrScanner'
import {
  parseDigifiCaptureTokenFromUrl,
  type DigifiCaptureSessionListItem,
} from '~/utils/digifiTypes'
import { apiFetch } from '~/utils/apiFetch'
import { useTheme } from '~/composables/useTheme'

interface CaptureSessionsResponse {
  ok: true
  sessions: DigifiCaptureSessionListItem[]
}

const { initAuth, isAuthenticated, getAccessToken } = useAuth()
const { isDark: isDarkMode } = useTheme()
const { isIos } = useCapacitorPlatform()
const token = ref('')
const sessions = ref<DigifiCaptureSessionListItem[]>([])
const loadingSessions = ref(false)
const sessionsError = ref<string | null>(null)
const pollHandle = ref<number | null>(null)
const joiningSessionId = ref<string | null>(null)

const {
  checking,
  sessionActive,
  sessionError,
  uploadingSide,
  uploadMessage,
  lastPreviewBySide,
  validateToken,
  onCaptureFile,
  setSessionToken,
  resetUploadMessage,
} = useDigifiCaptureUpload(token)

const {
  scanQrCode,
  scanning,
  scanError,
} = useDigifiQrScanner()

const hasCaptureToken = computed(() => token.value.length > 0)
const currentSession = computed(() => sessions.value[0] ?? null)
const showCapture = computed(() => hasCaptureToken.value && sessionActive.value)
const pageMessage = computed(() => sessionError.value || sessionsError.value || scanError.value)
const isJoining = computed(() => joiningSessionId.value != null)
const isLoadingJoin = computed(() => loadingSessions.value || checking.value || isJoining.value)
const showStickyJoin = computed(() => isIos.value && !showCapture.value && !!currentSession.value)
const showStickyQr = computed(() => isIos.value && !showCapture.value && !currentSession.value && !isLoadingJoin.value)

const eyeCardClass = computed(() =>
  isDarkMode.value
    ? 'rounded-2xl border border-white/15 bg-white/5 p-4'
    : 'rounded-2xl border border-gray-200 bg-white p-4 shadow-sm'
)
const eyeCardSpacedClass = computed(() => `${eyeCardClass.value} space-y-3`)
const eyeSectionLabelClass = computed(() =>
  `text-xs font-semibold uppercase tracking-wide ${isDarkMode.value ? 'text-gray-400' : 'text-gray-500'}`
)
const eyeCardTitleClass = computed(() =>
  `mt-1 text-sm font-semibold ${isDarkMode.value ? 'text-gray-100' : 'text-gray-900'}`
)
const eyeBodyTextClass = computed(() =>
  `text-sm ${isDarkMode.value ? 'text-gray-300' : 'text-gray-600'}`
)
const eyeMutedBodyClass = computed(() =>
  `mt-1 text-sm ${isDarkMode.value ? 'text-gray-300' : 'text-gray-600'}`
)
const eyeHintClass = computed(() =>
  `text-xs ${isDarkMode.value ? 'text-gray-400' : 'text-gray-500'}`
)
const eyeSecondaryLinkClass = computed(() =>
  isDarkMode.value
    ? 'w-full py-2 text-sm font-medium text-gray-400 hover:text-gray-200'
    : 'w-full py-2 text-sm font-medium text-gray-500 hover:text-gray-800'
)
const eyeOutlineButtonClass = computed(() =>
  isDarkMode.value
    ? 'w-full rounded-xl border border-white/20 px-4 py-3.5 text-sm font-semibold hover:bg-white/10 disabled:opacity-50'
    : 'w-full rounded-xl border border-gray-300 px-4 py-3.5 text-sm font-semibold text-gray-900 hover:bg-gray-100 disabled:opacity-50'
)
const eyePageClass = computed(() =>
  isDarkMode.value
    ? 'min-h-screen bg-gray-950 text-gray-100 px-4 py-6 font-quicksand'
    : 'min-h-screen bg-gray-50 text-gray-900 px-4 py-6 font-quicksand'
)
const eyeConnectedBannerClass = computed(() =>
  isDarkMode.value
    ? 'rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200'
    : 'rounded-xl border border-emerald-500/40 bg-emerald-50 px-3 py-2 text-sm text-emerald-800'
)

function stepPillClass(step: 'connect' | 'capture'): string {
  const base = 'rounded-full px-3 py-1 text-xs font-semibold transition-colors'
  const inactive = isDarkMode.value
    ? 'bg-white/10 text-gray-400'
    : 'bg-gray-100 text-gray-500'
  if (step === 'connect') {
    return showCapture.value
      ? `${base} bg-emerald-500/20 ${isDarkMode.value ? 'text-emerald-200' : 'text-emerald-700'}`
      : `${base} bg-blue-500/25 ${isDarkMode.value ? 'text-blue-100' : 'text-blue-800'} ring-1 ring-blue-400/40`
  }
  return showCapture.value
    ? `${base} bg-blue-500/25 ${isDarkMode.value ? 'text-blue-100' : 'text-blue-800'} ring-1 ring-blue-400/40`
    : `${base} ${inactive}`
}

function authHeaders(): Record<string, string> {
  const accessToken = getAccessToken()
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
}

function stopPolling() {
  if (pollHandle.value != null) {
    clearInterval(pollHandle.value)
    pollHandle.value = null
  }
}

async function loadSessions() {
  if (!isAuthenticated.value) return
  loadingSessions.value = true
  sessionsError.value = null
  try {
    const response = await apiFetch<CaptureSessionsResponse>('/api/digifi/capture/sessions', {
      method: 'GET',
      headers: authHeaders(),
    })
    sessions.value = response.sessions
  } catch (error: unknown) {
    sessionsError.value =
      (error as { data?: { statusMessage?: string } })?.data?.statusMessage ??
      'Could not load active capture sessions.'
  } finally {
    loadingSessions.value = false
  }
}

async function joinSession(session: DigifiCaptureSessionListItem) {
  joiningSessionId.value = session.sessionId
  setSessionToken(session.token)
  await validateToken()
  joiningSessionId.value = null
}

async function rejoinFromToken(rawTokenOrUrl: string) {
  const parsedToken = parseDigifiCaptureTokenFromUrl(rawTokenOrUrl)
  if (!parsedToken) {
    sessionsError.value = 'Could not read a Digifi capture token from that QR code.'
    return
  }
  sessionsError.value = null
  setSessionToken(parsedToken)
  await validateToken()
}

async function startQrScan() {
  const rawValue = await scanQrCode()
  if (!rawValue) return
  await rejoinFromToken(rawValue)
}

async function leaveCapture() {
  setSessionToken('')
  resetUploadMessage()
  await loadSessions()
}

onMounted(async () => {
  await initAuth()
  if (!isAuthenticated.value) {
    await navigateTo('/dashboard')
    return
  }
  await loadSessions()
  pollHandle.value = window.setInterval(() => {
    void loadSessions()
  }, 4000)
})

onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <IosAppPageShell v-if="isIos" title="Digifi Eye">
    <template #trailing>
      <span class="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
        Beta
      </span>
    </template>

    <div class="space-y-5">
      <p :class="eyeBodyTextClass">
        Use your computer for setup and review. Eye is only for capturing pages.
      </p>

      <div class="flex items-center justify-center gap-2">
        <span :class="stepPillClass('connect')">1. Connect</span>
        <Icon name="ri:arrow-right-s-line" size="16" :class="isDarkMode ? 'text-gray-500' : 'text-gray-400'" />
        <span :class="stepPillClass('capture')">2. Capture</span>
      </div>

      <p v-if="pageMessage" :class="['text-sm', isDarkMode ? 'text-rose-300' : 'text-rose-600']">{{ pageMessage }}</p>

      <section v-if="showCapture" class="space-y-4">
        <div :class="eyeConnectedBannerClass">
          Connected to desktop — photos will appear on your computer.
        </div>

        <DigifiCaptureZones
          :uploading-side="uploadingSide"
          :last-preview-by-side="lastPreviewBySide"
          :disabled="!sessionActive"
          @select-file="onCaptureFile"
        />

        <p :class="['text-center', eyeHintClass]">
          Photos are compressed before upload. You can capture each side more than once if needed.
        </p>

        <p
          v-if="uploadMessage"
          class="text-sm text-center"
          :class="uploadMessage.includes('uploaded') ? (isDarkMode ? 'text-emerald-300' : 'text-emerald-600') : (isDarkMode ? 'text-rose-300' : 'text-rose-600')"
        >
          {{ uploadMessage }}
        </p>

        <button
          type="button"
          :class="eyeSecondaryLinkClass"
          @click="leaveCapture"
        >
          Back to session list
        </button>
      </section>

      <section v-else class="space-y-3">
        <div :class="eyeCardClass">
          <p :class="eyeSectionLabelClass">Step 1</p>
          <p :class="eyeCardTitleClass">On your computer</p>
          <p :class="eyeMutedBodyClass">Open Add Pages and tap Connect phone.</p>
        </div>

        <div :class="eyeCardSpacedClass">
          <div>
            <p :class="eyeSectionLabelClass">Step 2</p>
            <p :class="eyeCardTitleClass">On this phone</p>
          </div>

          <p v-if="isLoadingJoin" :class="eyeBodyTextClass">
            Looking for active sessions...
          </p>

          <div v-else-if="currentSession" class="space-y-2">
            <p :class="eyeBodyTextClass">Active desktop session found.</p>
            <p :class="eyeHintClass">
              Expires {{ new Date(currentSession.expiresAt).toLocaleTimeString() }} •
              {{ currentSession.photoCount }} photo(s)
            </p>
            <button
              v-if="!showStickyJoin"
              type="button"
              class="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-50"
              :disabled="joiningSessionId === currentSession.sessionId"
              @click="joinSession(currentSession)"
            >
              {{ joiningSessionId === currentSession.sessionId ? 'Joining...' : 'Join session' }}
            </button>
          </div>

          <p v-else :class="eyeBodyTextClass">
            Waiting for your computer to start a session...
          </p>
        </div>

        <div :class="eyeCardSpacedClass">
          <div>
            <p :class="eyeSectionLabelClass">Step 3</p>
            <p :class="eyeCardTitleClass">Or scan QR</p>
            <p :class="eyeMutedBodyClass">Use the QR code shown on your computer.</p>
          </div>
          <button
            v-if="!showStickyQr"
            type="button"
            :class="eyeOutlineButtonClass"
            :disabled="scanning"
            @click="startQrScan"
          >
            {{ scanning ? 'Scanning QR...' : 'Scan QR code' }}
          </button>
        </div>
      </section>
    </div>

    <template v-if="showStickyJoin && currentSession" #footer>
      <button
        type="button"
        class="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-50"
        :disabled="joiningSessionId === currentSession.sessionId"
        @click="joinSession(currentSession)"
      >
        {{ joiningSessionId === currentSession.sessionId ? 'Joining...' : 'Join session' }}
      </button>
    </template>

    <template v-else-if="showStickyQr" #footer>
      <button
        type="button"
        :class="eyeOutlineButtonClass"
        :disabled="scanning"
        @click="startQrScan"
      >
        {{ scanning ? 'Scanning QR...' : 'Scan QR code' }}
      </button>
    </template>
  </IosAppPageShell>

  <main v-else :class="eyePageClass">
    <div class="mx-auto max-w-md space-y-5">
      <header class="space-y-2">
        <div class="flex items-center gap-2">
          <h1 class="text-xl font-semibold">Digifi Eye</h1>
          <span class="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
            Beta
          </span>
        </div>
        <p :class="eyeBodyTextClass">
          Use your computer for setup and review. Eye is only for capturing pages.
        </p>
      </header>

      <div class="flex items-center justify-center gap-2">
        <span :class="stepPillClass('connect')">1. Connect</span>
        <Icon name="ri:arrow-right-s-line" size="16" :class="isDarkMode ? 'text-gray-500' : 'text-gray-400'" />
        <span :class="stepPillClass('capture')">2. Capture</span>
      </div>

      <p v-if="pageMessage" :class="['text-sm', isDarkMode ? 'text-rose-300' : 'text-rose-600']">{{ pageMessage }}</p>

      <section v-if="showCapture" class="space-y-4">
        <div :class="eyeConnectedBannerClass">
          Connected to desktop — photos will appear on your computer.
        </div>

        <DigifiCaptureZones
          :uploading-side="uploadingSide"
          :last-preview-by-side="lastPreviewBySide"
          :disabled="!sessionActive"
          @select-file="onCaptureFile"
        />

        <p :class="['text-center', eyeHintClass]">
          Photos are compressed before upload. You can capture each side more than once if needed.
        </p>

        <p
          v-if="uploadMessage"
          class="text-sm text-center"
          :class="uploadMessage.includes('uploaded') ? (isDarkMode ? 'text-emerald-300' : 'text-emerald-600') : (isDarkMode ? 'text-rose-300' : 'text-rose-600')"
        >
          {{ uploadMessage }}
        </p>

        <button
          type="button"
          :class="eyeSecondaryLinkClass"
          @click="leaveCapture"
        >
          Back to session list
        </button>
      </section>

      <section v-else class="space-y-3">
        <div :class="eyeCardClass">
          <p :class="eyeSectionLabelClass">Step 1</p>
          <p :class="eyeCardTitleClass">On your computer</p>
          <p :class="eyeMutedBodyClass">Open Add Pages and tap Connect phone.</p>
        </div>

        <div :class="eyeCardSpacedClass">
          <div>
            <p :class="eyeSectionLabelClass">Step 2</p>
            <p :class="eyeCardTitleClass">On this phone</p>
          </div>

          <p v-if="isLoadingJoin" :class="eyeBodyTextClass">
            Looking for active sessions...
          </p>

          <div v-else-if="currentSession" class="space-y-2">
            <p :class="eyeBodyTextClass">Active desktop session found.</p>
            <p :class="eyeHintClass">
              Expires {{ new Date(currentSession.expiresAt).toLocaleTimeString() }} •
              {{ currentSession.photoCount }} photo(s)
            </p>
            <button
              type="button"
              class="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-50"
              :disabled="joiningSessionId === currentSession.sessionId"
              @click="joinSession(currentSession)"
            >
              {{ joiningSessionId === currentSession.sessionId ? 'Joining...' : 'Join session' }}
            </button>
          </div>

          <p v-else :class="eyeBodyTextClass">
            Waiting for your computer to start a session...
          </p>
        </div>

        <div :class="eyeCardSpacedClass">
          <div>
            <p :class="eyeSectionLabelClass">Step 3</p>
            <p :class="eyeCardTitleClass">Or scan QR</p>
            <p :class="eyeMutedBodyClass">Use the QR code shown on your computer.</p>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>
