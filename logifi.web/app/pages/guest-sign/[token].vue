<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import SignaturePad from '~/components/SignaturePad.vue'
import { apiFetch } from '~/utils/apiFetch'

definePageMeta({
  layout: false,
})

type SessionResponse = {
  ok: true
  sessionId: string
  status: string
  isPending: boolean
  expiresAt: string
  alreadySigned: boolean
  entry: {
    id: string
    date: string
    departure: string | null
    destination: string | null
    registration: string | null
    aircraftMakeModel: string | null
  } | null
}

type PadExpose = {
  toBlob: (mime?: string) => Promise<Blob | null>
  clear: () => void
  resize: () => void
}

const route = useRoute()
const token = computed(() => String(route.params.token ?? ''))

const checking = ref(true)
const sessionError = ref<string | null>(null)
const session = ref<SessionResponse | null>(null)
const guestName = ref('')
const guestCertificate = ref('')
const padHasInk = ref(false)
const submitting = ref(false)
const submitError = ref<string | null>(null)
const completed = ref(false)
const signatureFullscreen = ref(false)
const padRef = ref<PadExpose | null>(null)

const canSubmit = computed(
  () =>
    Boolean(session.value?.isPending) &&
    !session.value?.alreadySigned &&
    guestName.value.trim().length > 0 &&
    padHasInk.value &&
    !submitting.value
)

async function loadSession(): Promise<void> {
  checking.value = true
  sessionError.value = null
  try {
    if (!token.value) {
      throw new Error('Missing session token')
    }
    session.value = await apiFetch<SessionResponse>('/api/guest-sign/session', {
      method: 'GET',
      query: { token: token.value },
    })
    if (session.value.alreadySigned) {
      sessionError.value = 'This entry is already signed.'
    } else if (!session.value.isPending) {
      sessionError.value =
        session.value.status === 'expired'
          ? 'This signing link has expired. Ask the student for a new QR code.'
          : 'This signing link is no longer active.'
    }
  } catch (err: unknown) {
    const statusMessage =
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage ||
      (err as Error)?.message ||
      'Could not load signing session'
    sessionError.value = statusMessage
    session.value = null
  } finally {
    checking.value = false
  }
}

async function openSignatureFullscreen(): Promise<void> {
  if (submitting.value) return
  signatureFullscreen.value = true
  await nextTick()
  // Double rAF so layout has applied before measuring parent height
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      padRef.value?.resize()
    })
  })
}

function closeSignatureFullscreen(): void {
  signatureFullscreen.value = false
}

function clearFullscreenSignature(): void {
  padRef.value?.clear()
}

async function submitSignature(): Promise<void> {
  if (!canSubmit.value || !token.value) return
  submitError.value = null
  submitting.value = true
  try {
    const blob = await padRef.value?.toBlob('image/png')
    if (!blob) {
      throw new Error('Draw a signature before submitting')
    }
    const form = new FormData()
    form.append('token', token.value)
    form.append('guestName', guestName.value.trim())
    if (guestCertificate.value.trim()) {
      form.append('guestCertificate', guestCertificate.value.trim())
    }
    form.append('signature', blob, 'signature.png')

    await apiFetch('/api/guest-sign/complete', {
      method: 'POST',
      body: form,
    })
    completed.value = true
    signatureFullscreen.value = false
  } catch (err: unknown) {
    submitError.value =
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage ||
      (err as Error)?.message ||
      'Could not submit signature'
  } finally {
    submitting.value = false
  }
}

watch(signatureFullscreen, (open) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = open ? 'hidden' : ''
})

onMounted(() => {
  void loadSession()
})

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <main class="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 font-quicksand">
    <div class="mx-auto max-w-md space-y-5">
      <header class="space-y-1">
        <h1 class="text-xl font-semibold">Guest instructor signature</h1>
        <p class="text-sm text-slate-300">
          Sign this training flight on your phone. No Logifi account needed.
        </p>
      </header>

      <div v-if="checking" class="text-sm text-slate-300">Checking session…</div>
      <p v-else-if="sessionError && !completed" class="text-sm text-rose-300">{{ sessionError }}</p>

      <div
        v-else-if="completed"
        class="rounded-xl border border-emerald-700/50 bg-emerald-950/40 p-4 space-y-2"
      >
        <p class="text-sm font-semibold text-emerald-200">Signature saved</p>
        <p class="text-sm text-emerald-100/80">You can return the phone to the student.</p>
      </div>

      <template v-else-if="session?.isPending && !session.alreadySigned">
        <div
          v-if="session.entry"
          class="rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-sm space-y-1"
        >
          <p class="font-semibold text-slate-100">Flight to sign</p>
          <p class="text-slate-300">{{ session.entry.date }}</p>
          <p class="text-slate-300">
            {{ session.entry.departure || '—' }} → {{ session.entry.destination || '—' }}
          </p>
          <p class="text-slate-400 text-xs">
            {{ session.entry.registration || '—' }}
            <span v-if="session.entry.aircraftMakeModel"> · {{ session.entry.aircraftMakeModel }}</span>
          </p>
        </div>

        <label class="block text-sm space-y-1">
          <span class="text-slate-300">Your name</span>
          <input
            v-model="guestName"
            type="text"
            autocomplete="name"
            placeholder="Full name"
            class="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-base text-slate-100"
          />
        </label>

        <label class="block text-sm space-y-1">
          <span class="text-slate-300">Certificate # (optional)</span>
          <input
            v-model="guestCertificate"
            type="text"
            autocomplete="off"
            placeholder="CFI / certificate number"
            class="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-base text-slate-100"
          />
        </label>

        <div class="space-y-1">
          <span class="block text-sm text-slate-300">Signature</span>
          <button
            type="button"
            class="flex w-full min-h-[7.5rem] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-600 bg-slate-900/80 px-3 py-4 text-center disabled:opacity-50"
            :disabled="submitting"
            @click="openSignatureFullscreen"
          >
            <template v-if="padHasInk">
              <span class="text-sm font-semibold text-emerald-200">Signature captured</span>
              <span class="text-xs text-slate-400">Tap to edit</span>
            </template>
            <template v-else>
              <span class="text-sm font-semibold text-slate-100">Tap to sign</span>
              <span class="text-xs text-slate-400">Opens a full-screen signature pad</span>
            </template>
          </button>
        </div>

        <p v-if="submitError" class="text-sm text-rose-300">{{ submitError }}</p>

        <button
          type="button"
          class="w-full rounded-xl bg-blue-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-50"
          :disabled="!canSubmit"
          @click="submitSignature"
        >
          {{ submitting ? 'Submitting…' : 'Submit signature' }}
        </button>
      </template>
    </div>

    <!-- Keep pad mounted (v-show) so ink survives Back/Done -->
    <div
      v-show="signatureFullscreen"
      class="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-sign-fullscreen-title"
    >
      <header
        class="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
      >
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-sm font-semibold text-slate-200"
          @click="closeSignatureFullscreen"
        >
          ← Back
        </button>
        <h2 id="guest-sign-fullscreen-title" class="text-sm font-semibold text-slate-100">
          Sign here
        </h2>
        <span class="w-14" aria-hidden="true" />
      </header>

      <div class="min-h-0 flex-1 px-3 py-3">
        <SignaturePad
          ref="padRef"
          class="h-full"
          :is-dark-mode="true"
          :fill-parent="true"
          :hide-footer="true"
          :disabled="submitting"
          @change="(v) => (padHasInk = v)"
        />
      </div>

      <footer
        class="flex shrink-0 items-center justify-between gap-3 border-t border-slate-800 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <button
          type="button"
          class="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-300 disabled:opacity-40"
          :disabled="!padHasInk || submitting"
          @click="clearFullscreenSignature"
        >
          Clear
        </button>
        <button
          type="button"
          class="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
          @click="closeSignatureFullscreen"
        >
          Done
        </button>
      </footer>
    </div>
  </main>
</template>
