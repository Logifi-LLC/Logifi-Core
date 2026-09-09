<template>
  <div class="space-y-6">
    <SettingsListGroup title="Digifi Credits" :is-dark-mode="isDarkMode">
      <div class="px-4 py-3">
        <DigifiCreditsIndicator compact @open-checkout="showAddCreditsModal = true" />
      </div>
      <div class="border-t px-4 py-3 max-h-[400px] overflow-y-auto" :class="isDarkMode ? 'border-gray-700' : 'border-gray-100'">
        <DigifiCreditHistory :is-dark-mode="isDarkMode" />
      </div>
    </SettingsListGroup>

    <SettingsListGroup title="Digifi Destination" :is-dark-mode="isDarkMode">
      <div class="px-4 py-3 space-y-3">
        <p class="text-sm" :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
          Choose where Digifi sends your scanned flights
        </p>
        <div class="space-y-2">
          <button
            type="button"
            :disabled="sinkLoading"
            class="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border text-left transition-colors"
            :class="[
              preferredSink === 'logten'
                ? isDarkMode
                  ? 'bg-orange-600/20 border-orange-500/40 text-white'
                  : 'bg-orange-50 border-orange-300 text-gray-900'
                : isDarkMode
                  ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-750'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100',
              sinkLoading ? 'opacity-50 cursor-not-allowed' : ''
            ]"
            @click="changeSink('logten')"
          >
            <div class="flex items-center gap-2">
              <Icon name="ri:macbook-line" size="18" />
              <span class="text-sm font-medium">LogTen Pro (Mac)</span>
            </div>
            <Icon v-if="preferredSink === 'logten'" name="ri:check-line" size="18" :class="isDarkMode ? 'text-orange-400' : 'text-orange-600'" />
          </button>
          <button
            type="button"
            :disabled="sinkLoading"
            class="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border text-left transition-colors"
            :class="[
              preferredSink === 'logifi'
                ? isDarkMode
                  ? 'bg-blue-600/20 border-blue-500/40 text-white'
                  : 'bg-blue-50 border-blue-300 text-gray-900'
                : isDarkMode
                  ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-750'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100',
              sinkLoading ? 'opacity-50 cursor-not-allowed' : ''
            ]"
            @click="changeSink('logifi')"
          >
            <div class="flex items-center gap-2">
              <Icon name="ri:book-open-line" size="18" />
              <span class="text-sm font-medium">Logifi logbook</span>
            </div>
            <Icon v-if="preferredSink === 'logifi'" name="ri:check-line" size="18" :class="isDarkMode ? 'text-blue-400' : 'text-blue-600'" />
          </button>
        </div>
      </div>
    </SettingsListGroup>

    <SettingsListGroup title="Digifi Learning" :is-dark-mode="isDarkMode">
      <div class="px-4 py-3 space-y-3">
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1">
            <p class="text-sm font-semibold mb-1" :class="isDarkMode ? 'text-white' : 'text-gray-900'">
              Learning enabled
            </p>
            <p class="text-xs" :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
              Save corrections & vocabulary to improve future scans. Turn off to stop learning.
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

    <SettingsListGroup title="Pilot Notes (Digifi)" :is-dark-mode="isDarkMode">
      <div class="px-4 py-3 space-y-3">
        <p class="text-xs" :class="isDarkMode ? 'text-gray-400' : 'text-gray-600'">
          Tell Digifi about your flying background. Helps personalize aircraft and airport recognition (schools, bases, types, eras).
        </p>
        <textarea
          v-model="localNotes"
          :disabled="notesSaving"
          rows="4"
          placeholder="Example: Trained at Purdue Flight School, based at KORD, flew C172 and PA28 in the 1990s..."
          :class="[
            'w-full px-3 py-2 rounded-lg border text-sm font-quicksand resize-y',
            isDarkMode
              ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400',
            notesSaving ? 'opacity-50 cursor-not-allowed' : ''
          ]"
        />
        <div class="flex items-center gap-2">
          <button
            type="button"
            :disabled="notesSaving || localNotes === pilotNotes"
            :class="[
              'px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
              isDarkMode
                ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500'
                : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400',
              notesSaving || localNotes === pilotNotes ? 'cursor-not-allowed' : ''
            ]"
            @click="handleSaveNotes"
          >
            {{ notesSaving ? 'Saving...' : 'Save Notes' }}
          </button>
          <button
            v-if="pilotNotes"
            type="button"
            :disabled="notesSaving"
            :class="[
              'px-4 py-2 rounded-lg text-sm font-semibold transition-colors border',
              isDarkMode
                ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
              notesSaving ? 'opacity-50 cursor-not-allowed' : ''
            ]"
            @click="confirmEraseNotes"
          >
            Erase
          </button>
          <button
            v-if="pilotPriors"
            type="button"
            :class="[
              'ml-auto px-3 py-2 rounded-lg text-xs font-medium transition-colors',
              isDarkMode
                ? 'text-gray-400 hover:text-gray-200'
                : 'text-gray-600 hover:text-gray-900'
            ]"
            @click="showPriors = !showPriors"
          >
            {{ showPriors ? 'Hide' : 'Show' }} extracted priors
          </button>
        </div>
        <div
          v-if="showPriors && pilotPriors"
          :class="[
            'px-3 py-2 rounded-lg border text-xs',
            isDarkMode
              ? 'bg-gray-800/50 border-gray-700 text-gray-300'
              : 'bg-gray-50 border-gray-200 text-gray-700'
          ]"
        >
          {{ formatPriorsForDisplay(pilotPriors) }}
        </div>
      </div>
    </SettingsListGroup>

    <SettingsListGroup title="Sign-in" :is-dark-mode="isDarkMode">
      <SettingsListRow
        label="Email"
        :value="userEmail || 'Not available'"
        :is-dark-mode="isDarkMode"
        @click="$emit('push-email')"
      />
      <SettingsListRow
        label="Password"
        value="Change"
        :is-dark-mode="isDarkMode"
        @click="$emit('push-password')"
      />
    </SettingsListGroup>

    <SettingsListGroup title="Danger zone" :is-dark-mode="isDarkMode">
      <SettingsListRow
        label="Delete account"
        subtitle="Permanently erase your Logifi data"
        icon="ri:delete-bin-line"
        :is-dark-mode="isDarkMode"
        :show-chevron="false"
        destructive
        @click="showDeleteConfirm = true"
      />
    </SettingsListGroup>

    <DigifiAddCreditsModal :is-open="showAddCreditsModal" @close="showAddCreditsModal = false" />

    <!-- Delete account confirmation -->
    <div
      v-if="showDeleteConfirm"
      class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
      @click.self="!isDeleting && (showDeleteConfirm = false)"
    >
      <div
        :class="[
          'w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4',
          isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100',
        ]"
        @click.stop
      >
        <h3
          id="delete-account-title"
          :class="['text-lg font-bold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']"
        >
          Delete your account?
        </h3>
        <p :class="['text-sm font-quicksand leading-relaxed', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
          This permanently deletes your Logifi account, logbook, Digifi data, credits, and profile.
          This cannot be undone.
        </p>
        <div class="space-y-2">
          <label
            for="delete-confirm-input"
            :class="['text-xs font-bold uppercase tracking-wider font-quicksand', isDarkMode ? 'text-gray-500' : 'text-gray-400']"
          >
            Type DELETE to confirm
          </label>
          <input
            id="delete-confirm-input"
            v-model="deleteConfirmText"
            type="text"
            autocomplete="off"
            :disabled="isDeleting"
            :class="[
              'w-full px-4 py-3 rounded-xl border text-base font-quicksand outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500',
              isDarkMode
                ? 'bg-gray-800 border-gray-700 text-white'
                : 'bg-white border-gray-200 text-gray-900',
            ]"
            placeholder="DELETE"
            @keyup.enter="confirmDelete"
          />
        </div>
        <p
          v-if="deleteError"
          class="text-sm font-quicksand text-red-500"
        >
          {{ deleteError }}
        </p>
        <div class="flex gap-3 pt-2">
          <button
            type="button"
            class="flex-1 py-3 rounded-xl font-bold font-quicksand text-sm"
            :class="isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700'"
            :disabled="isDeleting"
            @click="showDeleteConfirm = false"
          >
            Cancel
          </button>
          <button
            type="button"
            class="flex-1 py-3 rounded-xl font-bold font-quicksand text-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!canConfirmDelete || isDeleting"
            @click="confirmDelete"
          >
            <span v-if="isDeleting" class="inline-flex items-center justify-center gap-2">
              <Icon name="ri:loader-4-line" size="18" class="animate-spin" />
              Deleting…
            </span>
            <span v-else>Delete forever</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import SettingsListGroup from '../SettingsListGroup.vue'
import SettingsListRow from '../SettingsListRow.vue'
import DigifiCreditsIndicator from '~/components/digifi/DigifiCreditsIndicator.vue'
import DigifiCreditHistory from '~/components/digifi/DigifiCreditHistory.vue'
import DigifiAddCreditsModal from '~/components/digifi/DigifiAddCreditsModal.vue'
import { useAuth } from '~/composables/useAuth'
import { useDigifiDestination } from '~/composables/useDigifiDestination'
import { useDigifiLearning } from '~/composables/useDigifiLearning'
import { useDigifiPilotNotes } from '~/composables/useDigifiPilotNotes'
import { useToast } from '~/composables/useToast'
import { formatPriorsForDisplay } from '~/utils/digifiPilotNotesExtraction'
import { onMounted } from 'vue'

defineProps<{
  isDarkMode: boolean
  userEmail?: string | null
}>()

const emit = defineEmits<{
  'push-email': []
  'push-password': []
  'account-deleted': []
}>()

const { deleteAccount } = useAuth()
const { preferredSink, loadPreferredSink, setPreferredSink, isLoading: sinkLoading } = useDigifiDestination()
const { isOptedIn: isLearningOptedIn, isLoading: learningLoading, loadOptInStatus, setOptIn, eraseDigifiLearningData } = useDigifiLearning()
const { notes: pilotNotes, priors: pilotPriors, isLoading: notesLoading, isSaving: notesSaving, loadNotes, saveNotes, eraseNotes } = useDigifiPilotNotes()
const { showToast } = useToast()

const showAddCreditsModal = ref(false)
const showDeleteConfirm = ref(false)
const deleteConfirmText = ref('')
const isDeleting = ref(false)
const deleteError = ref<string | null>(null)
const localNotes = ref('')
const showPriors = ref(false)

onMounted(() => {
  loadPreferredSink()
  loadOptInStatus()
  loadNotes().then(() => {
    localNotes.value = pilotNotes.value
  })
})

const canConfirmDelete = computed(() => deleteConfirmText.value.trim() === 'DELETE')

watch(showDeleteConfirm, (open) => {
  if (!open) {
    deleteConfirmText.value = ''
    deleteError.value = null
    isDeleting.value = false
  }
})

async function confirmDelete() {
  if (!canConfirmDelete.value || isDeleting.value) return

  isDeleting.value = true
  deleteError.value = null

  const result = await deleteAccount()
  if (result.success) {
    showDeleteConfirm.value = false
    emit('account-deleted')
    return
  }

  deleteError.value = result.error || 'Failed to delete account'
  isDeleting.value = false
}

async function changeSink(sink: 'logten' | 'logifi') {
  if (preferredSink.value === sink) return
  try {
    await setPreferredSink(sink)
    if (sink === 'logten') {
      await setOptIn(true)
    }
    const label = sink === 'logten' ? 'LogTen Pro' : 'Logifi logbook'
    showToast(`Digifi destination changed to ${label}`, { type: 'success' })
  } catch (error) {
    showToast('Failed to change destination', { type: 'error' })
  }
}

async function toggleLearning() {
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

async function confirmEraseLearningData() {
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

async function handleSaveNotes() {
  try {
    await saveNotes(localNotes.value)
    showToast('Pilot notes saved', { type: 'success' })
  } catch (error) {
    showToast('Failed to save pilot notes', { type: 'error' })
  }
}

async function confirmEraseNotes() {
  if (!confirm('Erase your pilot notes and extracted priors? This cannot be undone.')) {
    return
  }
  try {
    await eraseNotes()
    localNotes.value = ''
    showToast('Pilot notes erased', { type: 'success' })
  } catch (error) {
    showToast('Failed to erase pilot notes', { type: 'error' })
  }
}
</script>
