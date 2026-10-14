<template>
  <div class="space-y-3 font-quicksand">
    <p v-if="loading && !status" class="text-sm" :class="muted">Loading</p>
    <p v-if="error" class="text-sm text-red-500">{{ error }}</p>
    <template v-if="status">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide" :class="muted">Your code</p>
        <p class="mt-1 font-mono text-2xl font-semibold tracking-widest">{{ status.code }}</p>
      </div>
      <button
        type="button"
        class="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
        @click="onShare"
      >
        {{ shareLabel }}
      </button>
      <p v-if="shareUrl" class="break-all font-mono text-xs" :class="muted">{{ shareUrl }}</p>
      <p class="text-sm" :class="muted">{{ status.rewardedCount }} / {{ status.rewardCap }} rewards</p>
      <p class="text-xs" :class="muted">5 credits for them. 10 for you when they buy credits.</p>
    </template>

    <form v-if="showCodeEntry && (status?.canEnterCode || error)" class="space-y-2" @submit.prevent="onApply">
      <label class="block text-sm font-semibold" :class="isDarkMode ? 'text-white' : 'text-gray-900'" for="settings-referral-code">
        Have a referral code?
      </label>
      <input
        id="settings-referral-code"
        v-model="enteredCode"
        autocapitalize="characters"
        autocomplete="off"
        spellcheck="false"
        placeholder="Friend's code"
        class="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-500"
        :class="isDarkMode ? 'border-gray-700 bg-gray-800 text-white' : 'border-gray-200 bg-white text-gray-900'"
      />
      <button
        type="submit"
        class="text-sm font-semibold text-blue-600"
        :disabled="applying"
      >
        Apply
      </button>
      <p v-if="claimMessage" class="text-sm" :class="claimIsError ? 'text-red-500' : muted">{{ claimMessage }}</p>
    </form>
    <p v-else-if="showCodeEntry && status?.referred" class="text-xs" :class="muted">Referral applied</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useReferral } from '~/composables/useReferral'

const props = defineProps<{
  isDarkMode: boolean
  showCodeEntry?: boolean
}>()

const { status, loading, error, load, claim, share, shareUrl } = useReferral()
const shareLabel = ref('Share link')
const enteredCode = ref('')
const claimMessage = ref<string | null>(null)
const claimIsError = ref(false)
const applying = ref(false)

const muted = computed(() => (props.isDarkMode ? 'text-gray-400' : 'text-gray-500'))

onMounted(() => {
  void load()
})

async function onShare() {
  try {
    const outcome = await share()
    shareLabel.value = outcome === 'copied' ? 'Copied' : 'Share link'
  } catch {
    shareLabel.value = 'Copy failed'
  }
}

async function onApply() {
  if (applying.value) return
  applying.value = true
  claimMessage.value = null
  claimIsError.value = false
  try {
    claimMessage.value = (await claim(enteredCode.value)) ?? 'Could not apply referral code'
    const saved =
      claimMessage.value === 'Referral applied' ||
      claimMessage.value === '5 credits added' ||
      claimMessage.value.startsWith('Referral saved')
    claimIsError.value = !saved
    if (saved) enteredCode.value = ''
  } catch (error) {
    claimIsError.value = true
    claimMessage.value = error instanceof Error ? error.message : 'Could not apply referral code'
  } finally {
    applying.value = false
  }
}
</script>
