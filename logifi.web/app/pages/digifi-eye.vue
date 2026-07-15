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

interface CaptureSessionsResponse {
  ok: true
  sessions: DigifiCaptureSessionListItem[]
}

const { initAuth, isAuthenticated, getAccessToken } = useAuth()
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

function stepPillClass(step: 'connect' | 'capture'): string {
  const base = 'rounded-full px-3 py-1 text-xs font-semibold transition-colors'
  if (step === 'connect') {
    return showCapture.value
      ? `${base} bg-emerald-500/20 text-emerald-200`
      : `${base} bg-blue-500/25 text-blue-100 ring-1 ring-blue-400/40`
  }
  return showCapture.value
    ? `${base} bg-blue-500/25 text-blue-100 ring-1 ring-blue-400/40`
    : `${base} bg-white/10 text-slate-400`
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
      <p class="text-sm text-slate-300">
        Use your computer for setup and review. Eye is only for capturing pages.
      </p>

      <div class="flex items-center justify-center gap-2">
        <span :class="stepPillClass('connect')">1. Connect</span>
        <Icon name="ri:arrow-right-s-line" size="16" class="text-slate-500" />
        <span :class="stepPillClass('capture')">2. Capture</span>
      </div>

      <p v-if="pageMessage" class="text-sm text-rose-300">{{ pageMessage }}</p>

      <section v-if="showCapture" class="space-y-4">
        <div class="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          Connected to desktop — photos will appear on your computer.
        </div>

        <DigifiCaptureZones
          :uploading-side="uploadingSide"
          :last-preview-by-side="lastPreviewBySide"
          :disabled="!sessionActive"
          @select-file="onCaptureFile"
        />

        <p class="text-xs text-center text-slate-500">
          Photos are compressed before upload. You can capture each side more than once if needed.
        </p>

        <p
          v-if="uploadMessage"
          class="text-sm text-center"
          :class="uploadMessage.includes('uploaded') ? 'text-emerald-300' : 'text-rose-300'"
        >
          {{ uploadMessage }}
        </p>

        <button
          type="button"
          class="w-full py-2 text-sm font-medium text-slate-400 hover:text-slate-200"
          @click="leaveCapture"
        >
          Back to session list
        </button>
      </section>

      <section v-else class="space-y-3">
        <div class="rounded-2xl border border-white/15 bg-white/5 p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Step 1</p>
          <p class="mt-1 text-sm font-semibold text-slate-100">On your computer</p>
          <p class="mt-1 text-sm text-slate-300">Open Add Pages and tap Connect phone.</p>
        </div>

        <div class="rounded-2xl border border-white/15 bg-white/5 p-4 space-y-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Step 2</p>
            <p class="mt-1 text-sm font-semibold text-slate-100">On this phone</p>
          </div>

          <p v-if="isLoadingJoin" class="text-sm text-slate-300">
            Looking for active sessions...
          </p>

          <div v-else-if="currentSession" class="space-y-2">
            <p class="text-sm text-slate-300">Active desktop session found.</p>
            <p class="text-xs text-slate-400">
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

          <p v-else class="text-sm text-slate-300">
            Waiting for your computer to start a session...
          </p>
        </div>

        <div class="rounded-2xl border border-white/15 bg-white/5 p-4 space-y-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Step 3</p>
            <p class="mt-1 text-sm font-semibold text-slate-100">Or scan QR</p>
            <p class="mt-1 text-sm text-slate-300">Use the QR code shown on your computer.</p>
          </div>
          <button
            v-if="!showStickyQr"
            type="button"
            class="w-full rounded-xl border border-white/20 px-4 py-3.5 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
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
        class="w-full rounded-xl border border-white/20 px-4 py-3.5 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
        :disabled="scanning"
        @click="startQrScan"
      >
        {{ scanning ? 'Scanning QR...' : 'Scan QR code' }}
      </button>
    </template>
  </IosAppPageShell>

  <main v-else class="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 font-quicksand">
    <div class="mx-auto max-w-md space-y-5">
      <header class="space-y-2">
        <div class="flex items-center gap-2">
          <h1 class="text-xl font-semibold">Digifi Eye</h1>
          <span class="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
            Beta
          </span>
        </div>
        <p class="text-sm text-slate-300">
          Use your computer for setup and review. Eye is only for capturing pages.
        </p>
      </header>

      <div class="flex items-center justify-center gap-2">
        <span :class="stepPillClass('connect')">1. Connect</span>
        <Icon name="ri:arrow-right-s-line" size="16" class="text-slate-500" />
        <span :class="stepPillClass('capture')">2. Capture</span>
      </div>

      <p v-if="pageMessage" class="text-sm text-rose-300">{{ pageMessage }}</p>

      <section v-if="showCapture" class="space-y-4">
        <div class="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          Connected to desktop — photos will appear on your computer.
        </div>

        <DigifiCaptureZones
          :uploading-side="uploadingSide"
          :last-preview-by-side="lastPreviewBySide"
          :disabled="!sessionActive"
          @select-file="onCaptureFile"
        />

        <p class="text-xs text-center text-slate-500">
          Photos are compressed before upload. You can capture each side more than once if needed.
        </p>

        <p
          v-if="uploadMessage"
          class="text-sm text-center"
          :class="uploadMessage.includes('uploaded') ? 'text-emerald-300' : 'text-rose-300'"
        >
          {{ uploadMessage }}
        </p>

        <button
          type="button"
          class="w-full py-2 text-sm font-medium text-slate-400 hover:text-slate-200"
          @click="leaveCapture"
        >
          Back to session list
        </button>
      </section>

      <section v-else class="space-y-3">
        <div class="rounded-2xl border border-white/15 bg-white/5 p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Step 1</p>
          <p class="mt-1 text-sm font-semibold text-slate-100">On your computer</p>
          <p class="mt-1 text-sm text-slate-300">Open Add Pages and tap Connect phone.</p>
        </div>

        <div class="rounded-2xl border border-white/15 bg-white/5 p-4 space-y-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Step 2</p>
            <p class="mt-1 text-sm font-semibold text-slate-100">On this phone</p>
          </div>

          <p v-if="isLoadingJoin" class="text-sm text-slate-300">
            Looking for active sessions...
          </p>

          <div v-else-if="currentSession" class="space-y-2">
            <p class="text-sm text-slate-300">Active desktop session found.</p>
            <p class="text-xs text-slate-400">
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

          <p v-else class="text-sm text-slate-300">
            Waiting for your computer to start a session...
          </p>
        </div>

        <div class="rounded-2xl border border-white/15 bg-white/5 p-4 space-y-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Step 3</p>
            <p class="mt-1 text-sm font-semibold text-slate-100">Or scan QR</p>
            <p class="mt-1 text-sm text-slate-300">Use the QR code shown on your computer.</p>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>
