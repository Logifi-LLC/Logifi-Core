<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
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
const padRef = ref<{ toBlob: (mime?: string) => Promise<Blob | null> } | null>(null)

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
  } catch (err: unknown) {
    submitError.value =
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage ||
      (err as Error)?.message ||
      'Could not submit signature'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  void loadSession()
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
          <SignaturePad
            ref="padRef"
            :is-dark-mode="true"
            :disabled="submitting"
            @change="(v) => (padHasInk = v)"
          />
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
  </main>
</template>
