<template>
  <div class="space-y-3 font-quicksand">
    <p v-if="loading && !status" class="text-sm" :class="muted">Loading</p>
    <p v-else-if="error" class="text-sm" :class="muted">{{ error }}</p>
    <template v-else-if="status">
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
      <p class="text-sm" :class="muted">{{ status.rewardedCount }} / {{ status.rewardCap }} rewards</p>
      <p class="text-xs" :class="muted">5 credits for them. 10 for you when they buy credits.</p>

      <form v-if="showCodeEntry && status.canEnterCode" class="space-y-2" @submit.prevent="onApply">
        <label class="block text-xs font-semibold uppercase tracking-wide" :class="muted" for="settings-referral-code">
          Have a code?
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
        <p v-if="claimMessage" class="text-xs" :class="muted">{{ claimMessage }}</p>
      </form>
      <p v-else-if="showCodeEntry && status.referred" class="text-xs" :class="muted">Referral applied</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useReferral } from '~/composables/useReferral'

const props = defineProps<{
  isDarkMode: boolean
  showCodeEntry?: boolean
}>()

const { status, loading, error, load, claim, share } = useReferral()
const shareLabel = ref('Share link')
const enteredCode = ref('')
const claimMessage = ref<string | null>(null)
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
  try {
    claimMessage.value = await claim(enteredCode.value)
    if (claimMessage.value === 'Referral applied' || claimMessage.value === '5 credits added') {
      enteredCode.value = ''
    }
  } catch {
    claimMessage.value = 'Could not apply that code'
  } finally {
    applying.value = false
  }
}
</script>
