<template>
  <div class="space-y-6">
    <SettingsListGroup title="About Digifi" :is-dark-mode="isDarkMode">
      <div class="px-4 py-3">
        <p class="text-sm" :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">
          <template v-if="isIos">
            Set up and review on your computer. Use Digifi Eye to photograph logbook pages from the iOS app.
          </template>
          <template v-else>
            Digifi uses AI to pre-fill rows from photos of your paper logbook pages on Add Pages.
            You are responsible for verifying every entry before importing into your logbook.
          </template>
        </p>
      </div>
    </SettingsListGroup>

    <SettingsListGroup title="Scanner" :is-dark-mode="isDarkMode">
      <SettingsListRow
        :label="isIos ? 'Digifi Eye' : 'Open Digifi scanner'"
        :subtitle="isIos ? 'Camera for desktop Add Pages' : 'Add Pages — upload page photos'"
        icon="ri:scan-line"
        :badge="isIos ? 'Beta' : undefined"
        :to="isIos ? '/digifi-eye' : '/logbook-builder?digifi=open'"
        :is-dark-mode="isDarkMode"
        @click="$emit('close')"
      />
    </SettingsListGroup>

    <SettingsListGroup title="Credits" :is-dark-mode="isDarkMode">
      <div class="px-4 py-3">
        <DigifiCreditsIndicator compact @open-checkout="showAddCreditsModal = true" />
      </div>
      <div class="border-t px-4 py-3" :class="isDarkMode ? 'border-gray-700' : 'border-gray-100'">
        <DigifiCreditHistory :is-dark-mode="isDarkMode" />
      </div>
    </SettingsListGroup>

    <SettingsListGroup title="Learning" :is-dark-mode="isDarkMode">
      <div class="px-4 py-3 space-y-3">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1">
            <p class="text-sm font-semibold mb-1" :class="isDarkMode ? 'text-white' : 'text-gray-900'">
              Save corrections & vocabulary
            </p>
            <p class="text-xs" :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
              Improve future scans by learning from your corrections and vocabulary
            </p>
          </div>
          <button
            type="button"
            :disabled="learningLoading"
            :class="[
              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              isLearningOptedIn
                ? 'bg-blue-600'
                : isDarkMode
                ? 'bg-gray-700'
                : 'bg-gray-200',
              learningLoading ? 'opacity-50 cursor-not-allowed' : ''
            ]"
            @click="toggleLearning"
          >
            <span
              :class="[
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                isLearningOptedIn ? 'translate-x-5' : 'translate-x-0'
              ]"
            />
          </button>
        </div>
        <button
          v-if="isLearningOptedIn"
          type="button"
          :disabled="learningLoading"
          :class="[
            'w-full px-4 py-2 rounded-xl text-sm font-semibold transition-colors border',
            isDarkMode
              ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-400'
              : 'bg-red-50 hover:bg-red-100 border-red-200 text-red-700',
            learningLoading ? 'opacity-50 cursor-not-allowed' : ''
          ]"
          @click="confirmEraseLearningData"
        >
          Erase Digifi learning data
        </button>
      </div>
    </SettingsListGroup>

    <DigifiCommonMistakesPanel :is-dark="isDarkMode" />

    <DigifiAddCreditsModal :is-open="showAddCreditsModal" @close="showAddCreditsModal = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SettingsListGroup from '../SettingsListGroup.vue'
import SettingsListRow from '../SettingsListRow.vue'
import { useCapacitorPlatform } from '~/composables/useCapacitorPlatform'
import { useDigifiLearning } from '~/composables/useDigifiLearning'
import { useToast } from '~/composables/useToast'
import DigifiCreditsIndicator from '~/components/digifi/DigifiCreditsIndicator.vue'
import DigifiCreditHistory from '~/components/digifi/DigifiCreditHistory.vue'
import DigifiAddCreditsModal from '~/components/digifi/DigifiAddCreditsModal.vue'
import DigifiCommonMistakesPanel from '~/components/digifi/DigifiCommonMistakesPanel.vue'

defineProps<{
  isDarkMode: boolean
}>()

defineEmits<{
  close: []
}>()

const showAddCreditsModal = ref(false)
const { isIos } = useCapacitorPlatform()
const { showToast } = useToast()
const { isOptedIn: isLearningOptedIn, isLoading: learningLoading, loadOptInStatus, setOptIn, eraseDigifiLearningData } = useDigifiLearning()

onMounted(() => {
  loadOptInStatus()
})

const toggleLearning = async () => {
  try {
    await setOptIn(!isLearningOptedIn.value)
    showToast(
      isLearningOptedIn.value ? 'Digifi learning enabled' : 'Digifi learning disabled',
      { type: 'success' }
    )
  } catch (error) {
    showToast('Failed to update learning setting', { type: 'error' })
  }
}

const confirmEraseLearningData = async () => {
  if (!confirm('Erase all saved Digifi corrections and vocabulary? This cannot be undone.')) {
    return
  }
  try {
    await eraseDigifiLearningData()
    showToast('Digifi learning data erased', { type: 'success' })
  } catch (error) {
    showToast('Failed to erase learning data', { type: 'error' })
  }
}
</script>
