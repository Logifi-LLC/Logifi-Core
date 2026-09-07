<script setup lang="ts">
import { ref, computed, provide, watchEffect, onMounted, onUnmounted, nextTick } from 'vue'
import LogbookBuilderGrid from '~/components/logbook-builder/LogbookBuilderGrid.vue'
import LogbookBuilderToolbar from '~/components/logbook-builder/LogbookBuilderToolbar.vue'
import LogbookBuilderValidateBar from '~/components/logbook-builder/LogbookBuilderValidateBar.vue'
import LogbookBuilderDigifiPanel from '~/components/logbook-builder/LogbookBuilderDigifiPanel.vue'
import DigifiCommonMistakesPanel from '~/components/digifi/DigifiCommonMistakesPanel.vue'
import { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'
import {
  getStoredDraft,
  restoreDraftToGrid,
  resumeDraftAutosave,
  saveDraftNow,
  setupBuilderDraftAutosave,
  setupBuilderDraftFlush,
  storedDraftHasContent,
  suspendDraftAutosave,
} from '~/composables/useLogbookBuilderDraft'
import { loadLastTemplateIfAny } from '~/composables/useLogbookBuilderLastTemplate'
import { recoverDigifiSpreadFromServer } from '~/composables/useDigifiSpreadRecovery'
import { useTheme } from '~/composables/useTheme'
import { useAuth } from '~/composables/useAuth'
import { useToast } from '~/composables/useToast'
import { useDigifiCredits } from '~/composables/useDigifiCredits'
import { useDigifiLearning } from '~/composables/useDigifiLearning'
import { useDigifiDestination } from '~/composables/useDigifiDestination'
import { supabase } from '~/lib/supabase'
import DigifiLearningOptInModal from '~/components/digifi/DigifiLearningOptInModal.vue'
import DigifiDestinationModal from '~/components/digifi/DigifiDestinationModal.vue'
import DigifiSettingsModal from '~/components/settings/DigifiSettingsModal.vue'
import { getDisplayedPilotInitials } from '~/utils/dashboardHydration'
import type { Database } from '~/types/database'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const { showToast } = useToast()
const { fetchBalance } = useDigifiCredits()
const gridRef = ref<InstanceType<typeof LogbookBuilderGrid> | null>(null)
const digifiSectionRef = ref<HTMLElement | null>(null)
const grid = useLogbookBuilderGrid()
provide('logbookBuilderGrid', grid)
const { user, isAuthenticated, getAccessToken } = useAuth()

let stopAutosave: (() => void) | null = null
let stopDraftFlush: (() => void) | null = null
let pageInitDone = false

async function recoverSpreadIfNeeded(userId: string | undefined): Promise<void> {
  if (!isAuthenticated.value || !userId) return

  const spreadId = grid.spreadId.value
  if (!spreadId) return

  const { recoveredPages } = await recoverDigifiSpreadFromServer({
    grid,
    spreadId,
    getAccessToken,
  })

  if (recoveredPages > 0) {
    saveDraftNow(grid, userId)
  }
}

async function finishPageInit() {
  if (pageInitDone) return

  suspendDraftAutosave()
  const userId = user.value?.id

  if (storedDraftHasContent(userId)) {
    const draft = getStoredDraft(userId)
    if (draft) {
      restoreDraftToGrid(grid, draft)
      await recoverSpreadIfNeeded(userId)
      pageInitDone = true
      resumeDraftAutosave()
      stopAutosave?.()
      stopAutosave = setupBuilderDraftAutosave(grid, userId)
      return
    }
  }

  if (!isAuthenticated.value || !user.value) {
    resumeDraftAutosave()
    stopAutosave?.()
    stopAutosave = setupBuilderDraftAutosave(grid, userId)
    return
  }

  await loadLastTemplateIfAny(grid, user.value.id)
  await recoverSpreadIfNeeded(userId)
  pageInitDone = true
  resumeDraftAutosave()
  stopAutosave?.()
  stopAutosave = setupBuilderDraftAutosave(grid, userId)
}

onMounted(() => {
  finishPageInit()
  stopDraftFlush?.()
  stopDraftFlush = setupBuilderDraftFlush(grid, user.value?.id)

  if (route.query.digifi === 'open') {
    showDigifiPanel.value = true
    nextTick(() => {
      digifiSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const creditsResult = route.query.credits
  if (creditsResult === 'success') {
    void fetchBalance()
    showToast('Credits added successfully', { type: 'success' })
    void router.replace({ query: { ...route.query, credits: undefined } })
  } else if (creditsResult === 'cancelled') {
    showToast('Checkout cancelled', { type: 'info' })
    void router.replace({ query: { ...route.query, credits: undefined } })
  }
})

watchEffect(() => {
  if (!pageInitDone && isAuthenticated.value && user.value) {
    finishPageInit()
  }
})

watchEffect((onCleanup) => {
  const userId = user.value?.id
  stopDraftFlush?.()
  stopDraftFlush = setupBuilderDraftFlush(grid, userId)
  onCleanup(() => {
    stopDraftFlush?.()
    stopDraftFlush = null
  })
})

onUnmounted(() => {
  stopAutosave?.()
  stopDraftFlush?.()
})

const builderPilots = ref<string[]>([])
provide('builderPilots', builderPilots)

// Initialize Digifi composables BEFORE providing them
const { optInStatus, loadOptInStatus, setOptIn } = useDigifiLearning()
const { displayCredits, loading: creditsLoading } = useDigifiCredits()
const { preferredSink, loadPreferredSink, setPreferredSink } = useDigifiDestination()

provide('showDigifiLearningOptInModal', () => {
  if (optInStatus.value === false) {
    showDigifiLearningOptIn.value = true
  }
})

provide('digifiPreferredSink', preferredSink)

const handleLearningOptInAccept = async () => {
  try {
    await setOptIn(true)
    showDigifiLearningOptIn.value = false
    showToast('Digifi learning enabled', { type: 'success' })
  } catch (error) {
    showToast('Failed to enable learning', { type: 'error' })
  }
}

const handleLearningOptInDecline = () => {
  showDigifiLearningOptIn.value = false
}

watchEffect(async (onCleanup) => {
  const currentUser = user.value

  if (!isAuthenticated.value || !currentUser) {
    builderPilots.value = []
    return
  }

  let cancelled = false
  onCleanup(() => {
    cancelled = true
  })

  try {
    const { data, error } = await (supabase as any)
      .from('log_entries')
      .select('training_elements')
      .eq('user_id', currentUser.id)

    if (error) {
      console.error('Error loading builder pilots:', error)
      return
    }

    if (!data || cancelled) return

    const names = (data as { training_elements: string | null }[])
      .map((row) => (row.training_elements || '').trim())
      .filter((name) => !!name)

    builderPilots.value = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
  } catch (err) {
    console.error('Exception loading builder pilots:', err)
  }
})

const { isDark } = useTheme()
const showDigifiPanel = ref(false)
const showInstructions = ref(false)
const showDigifiChecklist = ref(false)
const showDigifiCommonMistakes = ref(false)
const showDigifiLearningOptIn = ref(false)
const showDigifiDestinationModal = ref(false)
const showDigifiSettings = ref(false)
const digifiSettingsStack = ref<Array<'root' | 'account' | 'digifi' | 'account-email' | 'account-password'>>(['root'])

const isDigifiMode = computed(() => route.query.digifi === 'open')

watchEffect(() => {
  if (isDigifiMode.value && isAuthenticated.value) {
    fetchBalance()
    loadPreferredSink()
  }
})

// Show destination chooser on first Digifi entry if no preference set
watchEffect(() => {
  if (isDigifiMode.value && isAuthenticated.value && preferredSink.value === null && !showDigifiDestinationModal.value) {
    // Small delay to let other modals settle
    setTimeout(() => {
      if (preferredSink.value === null) {
        showDigifiDestinationModal.value = true
      }
    }, 500)
  }
})

async function handleDestinationSelect(sink: 'logten' | 'logifi') {
  try {
    await setPreferredSink(sink)
    showDigifiDestinationModal.value = false
    const label = sink === 'logten' ? 'LogTen Pro' : 'Logifi logbook'
    showToast(`Destination set to ${label}`, { type: 'success' })
  } catch (error) {
    showToast('Failed to save destination preference', { type: 'error' })
  }
}

// Profile for initials
const pilotProfile = ref<UserProfile | null>(null)
const pilotProfileLoaded = ref(false)

const pilotInitials = computed(() =>
  getDisplayedPilotInitials(pilotProfile.value?.name || '', pilotProfileLoaded.value)
)

// Account settings state
const accountEmail = ref('')
const currentPassword = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')
const isUpdatingEmail = ref(false)
const isUpdatingPassword = ref(false)
const emailSuccessMessage = ref('')
const emailErrorMessage = ref('')
const passwordSuccessMessage = ref('')
const passwordErrorMessage = ref('')

function openDigifiSettings(tab?: 'account' | 'digifi') {
  digifiSettingsStack.value = tab ? ['root', tab] : ['root']
  showDigifiSettings.value = true
}

function pushDigifiSettingsFrame(frame: 'root' | 'account' | 'digifi' | 'account-email' | 'account-password') {
  digifiSettingsStack.value = [...digifiSettingsStack.value, frame]
}

function popDigifiSettingsFrame() {
  if (digifiSettingsStack.value.length > 1) {
    digifiSettingsStack.value = digifiSettingsStack.value.slice(0, -1)
  }
}

function closeDigifiSettings() {
  showDigifiSettings.value = false
  digifiSettingsStack.value = ['root']
}

async function updateAccountEmail() {
  if (!user.value) return
  isUpdatingEmail.value = true
  emailSuccessMessage.value = ''
  emailErrorMessage.value = ''

  try {
    const { error } = await supabase.auth.updateUser({ email: accountEmail.value })
    if (error) throw error

    emailSuccessMessage.value = 'Check your new email for a confirmation link'
    accountEmail.value = ''
    currentPassword.value = ''
  } catch (err: any) {
    emailErrorMessage.value = err.message || 'Failed to update email'
  } finally {
    isUpdatingEmail.value = false
  }
}

async function updateAccountPassword() {
  if (!user.value) return
  isUpdatingPassword.value = true
  passwordSuccessMessage.value = ''
  passwordErrorMessage.value = ''

  if (newPassword.value !== confirmNewPassword.value) {
    passwordErrorMessage.value = 'Passwords do not match'
    isUpdatingPassword.value = false
    return
  }

  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword.value })
    if (error) throw error

    passwordSuccessMessage.value = 'Password updated successfully'
    currentPassword.value = ''
    newPassword.value = ''
    confirmNewPassword.value = ''
  } catch (err: any) {
    passwordErrorMessage.value = err.message || 'Failed to update password'
  } finally {
    isUpdatingPassword.value = false
  }
}

function handleAccountDeleted() {
  closeDigifiSettings()
  showToast('Account deleted', { type: 'success' })
  void router.push('/')
}

function handleShowDirections() {
  closeDigifiSettings()
  showInstructions.value = true
}

function handleShowCommonErrors() {
  closeDigifiSettings()
  showDigifiCommonMistakes.value = true
}

watchEffect(() => {
  if (isAuthenticated.value && user.value && optInStatus.value === null) {
    loadOptInStatus()
  }
})

watchEffect(async (onCleanup) => {
  if (!isAuthenticated.value || !user.value) {
    pilotProfile.value = null
    pilotProfileLoaded.value = false
    return
  }

  let cancelled = false
  onCleanup(() => {
    cancelled = true
  })

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.value.id)
      .single()

    if (error || cancelled) return

    pilotProfile.value = data as UserProfile
    pilotProfileLoaded.value = true
  } catch (err) {
    console.error('Failed to load pilot profile:', err)
  }
})
</script>

<template>
  <div
    class="min-h-screen font-quicksand transition-colors duration-300 p-4 sm:p-6 lg:p-8"
    :class="isDark ? 'bg-gray-950' : 'bg-gray-50'"
  >
    <div class="mx-auto max-w-7xl space-y-4">
      <!-- Digifi mode header with Feedback + avatar -->
      <div
        v-if="isDigifiMode"
        class="flex items-center justify-between pb-4 border-b"
        :class="isDark ? 'border-white/10' : 'border-gray-400/50'"
      >
        <h1
          class="text-2xl font-bold font-quicksand"
          :class="isDark ? 'text-white' : 'text-gray-900'"
        >
          Digifi
        </h1>
        <nav class="flex items-center gap-3">
          <NuxtLink
            to="/feedback?from=digifi"
            class="hidden sm:inline-block text-xs sm:text-sm font-medium font-quicksand transition-colors"
            :class="[
              isDark
                ? 'text-gray-300 hover:text-orange-400'
                : 'text-gray-600 hover:text-orange-600'
            ]"
            aria-label="Send feedback about Digifi"
          >
            Feedback
          </NuxtLink>
          <div
            class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium font-quicksand border"
            :class="[
              isDark
                ? 'bg-orange-600/10 border-orange-500/30 text-orange-300'
                : 'bg-orange-50 border-orange-200 text-orange-700'
            ]"
            aria-label="Digifi credits available"
          >
            <Icon name="ri:coins-line" size="14" />
            <span>{{ creditsLoading ? '…' : displayCredits }}</span>
          </div>
          <button
            type="button"
            @click="openDigifiSettings()"
            :class="[
              'h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center text-sm sm:text-base font-bold transition-all duration-200 shadow-sm border overflow-hidden',
              isDark 
                ? 'bg-orange-600/20 text-orange-400 border-orange-500/30 hover:bg-orange-600/40' 
                : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
            ]"
            aria-label="Digifi Settings"
          >
            <template v-if="pilotInitials">
              {{ pilotInitials }}
            </template>
            <Icon
              v-else
              name="ri:send-plane-line"
              :size="20"
            />
          </button>
        </nav>
      </div>
      
      <!-- Normal Logifi mode header -->
      <div
        v-else
        class="flex items-center justify-between pb-4 border-b"
        :class="isDark ? 'border-white/10' : 'border-gray-400/50'"
      >
        <h1
          class="text-2xl font-bold font-quicksand"
          :class="isDark ? 'text-white' : 'text-gray-900'"
        >
          Add Pages
        </h1>
        <NuxtLink
          to="/dashboard"
          :class="[
            'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-quicksand font-bold transition-colors border',
            isDark
              ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white shadow-sm shadow-black/20'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-900 border-gray-300'
          ]"
        >
          Back to Logbook
        </NuxtLink>
      </div>

      <!-- Digifi mode help panels (Directions and Common Errors) -->
      <section v-if="isDigifiMode">
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 max-h-0"
          enter-to-class="opacity-100 max-h-[1200px]"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 max-h-[1200px]"
          leave-to-class="opacity-0 max-h-0"
        >
          <div v-if="showInstructions" class="mb-4 overflow-hidden">
            <div
              class="rounded-xl border p-4"
              :class="isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'"
            >
              <div class="flex items-center justify-between mb-3">
                <h2 class="text-sm font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">
                  Digifi Directions
                </h2>
                <button
                  type="button"
                  @click="showInstructions = false"
                  class="text-xs font-medium transition-colors"
                  :class="isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'"
                >
                  Close
                </button>
              </div>
              <ul
                class="space-y-1.5 text-sm list-disc list-inside"
                :class="isDark ? 'text-gray-300' : 'text-gray-700'"
              >
                <li>Use the toolbar to set rows, layout, and columns before scanning.</li>
                <li>Upload a paper logbook page photo using the Digifi scanner below.</li>
                <li>Review AI-filled cells carefully; correct any mistakes before importing.</li>
                <li>Use Validate to review totals and issues, then Import to add entries to your logbook.</li>
                <li>You can also Send to LogTen Pro to open the entries directly in LogTen.</li>
              </ul>
            </div>
          </div>
        </Transition>

        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 max-h-0"
          enter-to-class="opacity-100 max-h-[1200px]"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 max-h-[1200px]"
          leave-to-class="opacity-0 max-h-0"
        >
          <div v-if="showDigifiCommonMistakes" class="mb-4 overflow-hidden">
            <div
              class="rounded-xl border p-4"
              :class="isDark ? 'border-orange-500/30 bg-orange-500/10' : 'border-orange-200 bg-orange-50'"
            >
              <div class="flex items-center justify-between mb-3">
                <h2 class="text-sm font-semibold" :class="isDark ? 'text-orange-100' : 'text-orange-900'">
                  Common Digifi Errors
                </h2>
                <button
                  type="button"
                  @click="showDigifiCommonMistakes = false"
                  class="text-xs font-medium transition-colors"
                  :class="isDark ? 'text-orange-300/70 hover:text-orange-200' : 'text-orange-700/70 hover:text-orange-900'"
                >
                  Close
                </button>
              </div>
              <DigifiCommonMistakesPanel :is-dark="isDark" />
            </div>
          </div>
        </Transition>
      </section>

      <!-- Non-Digifi mode: show expandable buttons for instructions, checklist, and common mistakes -->
      <section
        v-if="!isDigifiMode"
        class="rounded-2xl border px-4 py-3 sm:px-5 sm:py-4"
        :class="isDark ? 'border-white/10 bg-gray-900' : 'border-gray-200 bg-white'"
      >
        <div class="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            :class="[
              'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold font-quicksand transition-colors',
              isDark
                ? 'border-white/15 text-gray-200 hover:bg-white/10'
                : 'border-gray-300 text-gray-800 hover:bg-gray-100',
            ]"
            @click="showInstructions = !showInstructions"
          >
            <Icon :name="showInstructions ? 'ri:arrow-up-s-line' : 'ri:arrow-down-s-line'" size="16" />
            Instructions
          </button>
          <button
            type="button"
            :class="[
              'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold font-quicksand transition-colors',
              isDark
                ? 'border-blue-400/30 text-blue-300 hover:bg-blue-500/10'
                : 'border-blue-300 text-blue-700 hover:bg-blue-50',
            ]"
            @click="showDigifiChecklist = !showDigifiChecklist"
          >
            <Icon :name="showDigifiChecklist ? 'ri:arrow-up-s-line' : 'ri:arrow-down-s-line'" size="16" />
            Digifi Checklist
          </button>
          <button
            type="button"
            :class="[
              'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold font-quicksand transition-colors',
              isDark
                ? 'border-orange-400/30 text-orange-300 hover:bg-orange-500/10'
                : 'border-orange-300 text-orange-800 hover:bg-orange-50',
            ]"
            @click="showDigifiCommonMistakes = !showDigifiCommonMistakes"
          >
            <Icon :name="showDigifiCommonMistakes ? 'ri:arrow-up-s-line' : 'ri:arrow-down-s-line'" size="16" />
            Common mistakes
          </button>
        </div>

        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 max-h-0"
          enter-to-class="opacity-100 max-h-[1200px]"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 max-h-[1200px]"
          leave-to-class="opacity-0 max-h-0"
        >
          <div v-if="showInstructions" class="mt-3 overflow-hidden">
            <div
              class="rounded-xl border p-4"
              :class="isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-gray-50'"
            >
              <h2 class="text-sm font-semibold mb-2" :class="isDark ? 'text-white' : 'text-gray-900'">
                Add Pages Instructions
              </h2>
              <ul
                class="space-y-1.5 text-sm list-disc list-inside"
                :class="isDark ? 'text-gray-300' : 'text-gray-700'"
              >
                <li>Use the toolbar to set rows, layout, and columns before editing or scanning.</li>
                <li>Type directly in the grid to transcribe pages manually when not using Digifi.</li>
                <li v-if="isDigifiMode && preferredSink === 'logten'">Use Validate to review totals and issues, then Send to LogTen Pro to open the flights on your Mac.</li>
                <li v-else-if="isDigifiMode && preferredSink === 'logifi'">Use Validate to review totals and issues, then Import to add entries to your Logifi logbook.</li>
                <li v-else>Use Validate to review totals and issues, then Import to add entries to your logbook.</li>
              </ul>
            </div>
          </div>
        </Transition>

        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 max-h-0"
          enter-to-class="opacity-100 max-h-[1200px]"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 max-h-[1200px]"
          leave-to-class="opacity-0 max-h-0"
        >
          <div v-if="showDigifiChecklist" class="mt-3 overflow-hidden">
            <div
              class="rounded-xl border p-4"
              :class="isDark ? 'border-blue-500/30 bg-blue-500/10' : 'border-blue-200 bg-blue-50'"
            >
              <h2 class="text-sm font-semibold mb-2" :class="isDark ? 'text-blue-100' : 'text-blue-900'">
                {{ preferredSink === 'logten' ? 'Pre-Scan Checklist (for LogTen Pro)' : preferredSink === 'logifi' ? 'Pre-Scan Checklist (for Logifi)' : 'Pre-Scan Digifi Checklist' }}
              </h2>
              <ul
                class="space-y-1.5 text-sm list-disc list-inside"
                :class="isDark ? 'text-blue-100/90' : 'text-blue-900/90'"
              >
                <li>Confirm row count and layout (single-page or two-page) are correct.</li>
                <li>Verify columns/template match the paper page format.</li>
                <li>Ensure the page photo is flat, bright, and fully in frame.</li>
                <li>In two-page mode, scan the left page first before scanning the right page.</li>
                <li v-if="preferredSink === 'logten'">After scan, review all AI-filled cells before sending to LogTen Pro.</li>
                <li v-else>After scan, review all AI-filled cells before importing.</li>
              </ul>
            </div>
          </div>
        </Transition>

        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 max-h-0"
          enter-to-class="opacity-100 max-h-[1200px]"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 max-h-[1200px]"
          leave-to-class="opacity-0 max-h-0"
        >
          <div v-if="showDigifiCommonMistakes" class="mt-3 overflow-hidden">
            <DigifiCommonMistakesPanel :is-dark="isDark" />
          </div>
        </Transition>
      </section>
      <LogbookBuilderToolbar />

      <section
        ref="digifiSectionRef"
        class="rounded-3xl p-4 sm:p-6 font-quicksand border shadow-[0_20px_50px_rgba(0,0,0,0.08)]"
        :class="isDark ? 'border-white/10 bg-gray-900' : 'border-gray-200 bg-white'"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              class="text-base sm:text-lg font-semibold flex items-center gap-2"
              :class="isDark ? 'text-white' : 'text-gray-900'"
            >
              <Icon name="ri:scan-line" size="20" class="text-blue-500" />
              Digifi scanner (optional)
            </h2>
            <p class="text-sm mt-1" :class="isDark ? 'text-gray-400' : 'text-gray-600'">
              Use Digifi only when you want AI to pre-fill rows from paper page photos.
            </p>
          </div>
          <button
            type="button"
            :class="[
              'inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold font-quicksand transition-colors',
              isDark
                ? 'border-blue-400/40 text-blue-300 hover:bg-blue-500/10'
                : 'border-blue-300 text-blue-700 hover:bg-blue-50',
            ]"
            @click="showDigifiPanel = !showDigifiPanel"
          >
            <Icon :name="showDigifiPanel ? 'ri:subtract-line' : 'ri:add-line'" size="16" />
            {{ showDigifiPanel ? 'Hide Digifi Scanner' : 'Open Digifi Scanner' }}
          </button>
        </div>

        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 max-h-0"
          enter-to-class="opacity-100 max-h-[2200px]"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 max-h-[2200px]"
          leave-to-class="opacity-0 max-h-0"
        >
          <div v-if="showDigifiPanel" class="mt-4 overflow-hidden">
            <LogbookBuilderDigifiPanel />
          </div>
        </Transition>
      </section>

      <!-- Digifi empty state -->
      <div
        v-if="isDigifiMode && grid.rows.value.length === 0"
        class="rounded-2xl border p-8 sm:p-12 text-center"
        :class="isDark ? 'border-orange-500/30 bg-orange-500/5' : 'border-orange-200 bg-orange-50'"
      >
        <div class="max-w-md mx-auto space-y-4">
          <Icon
            name="ri:scan-line"
            size="48"
            :class="isDark ? 'text-orange-400' : 'text-orange-600'"
          />
          <h2
            class="text-xl font-bold font-quicksand"
            :class="isDark ? 'text-white' : 'text-gray-900'"
          >
            {{ preferredSink === 'logten' ? 'Ready to scan for LogTen Pro' : preferredSink === 'logifi' ? 'Ready to scan for Logifi' : 'Ready to scan your logbook' }}
          </h2>
          <p
            class="text-sm"
            :class="isDark ? 'text-gray-300' : 'text-gray-700'"
          >
            <template v-if="preferredSink === 'logten'">
              Scan a logbook spread below. After you review, send the flights directly to LogTen Pro on your Mac.
            </template>
            <template v-else-if="preferredSink === 'logifi'">
              Scan a logbook spread below. After you review, import the flights into your Logifi digital logbook.
            </template>
            <template v-else>
              Open the Digifi scanner below to photograph a logbook spread. AI will transcribe the entries for you to review.
            </template>
          </p>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-xl border px-6 py-3 text-sm font-semibold font-quicksand transition-colors shadow-sm"
            :class="[
              isDark
                ? 'border-orange-400/40 bg-orange-600/20 text-orange-300 hover:bg-orange-600/30'
                : 'border-orange-300 bg-orange-100 text-orange-800 hover:bg-orange-200'
            ]"
            @click="showDigifiPanel = true; nextTick(() => digifiSectionRef?.scrollIntoView({ behavior: 'smooth', block: 'start' }))"
          >
            <Icon name="ri:scan-line" size="18" />
            Scan a spread
          </button>
        </div>
      </div>

      <LogbookBuilderGrid ref="gridRef" />
      <LogbookBuilderValidateBar />
      <section
        v-if="!isDigifiMode"
        class="rounded-3xl p-4 sm:p-6 font-quicksand border shadow-[0_20px_50px_rgba(0,0,0,0.15)]"
        :class="isDark
          ? 'border-white/10 bg-gray-900'
          : 'border-gray-200 bg-white'"
      >
        <h2
          class="text-base font-semibold mb-3"
          :class="isDark ? 'text-white' : 'text-gray-900'"
        >
          How to use
        </h2>
        <ul
          class="space-y-2 text-sm list-disc list-inside"
          :class="isDark ? 'text-gray-300' : 'text-gray-700'"
        >
          <li>Use this grid to <strong>transcribe entries from a paper logbook</strong>. Fill in the cells, then validate and import into your digital logbook.</li>
          <li><strong>Toolbar:</strong> Set the number of rows; choose single-page or two-page layout (and “Columns on left” for two-page); add or remove columns; sign in to save or load templates.</li>
          <li><strong>Grid:</strong> Click a cell to edit; drag a column header to reorder columns; drag the right edge of a column header to resize; use the Tags column for each row. Use Tab or Enter to move between cells.</li>
          <li><strong>Approaches:</strong> Use the <strong>Approach</strong> column for counts, and the <strong>Approach Type</strong> dropdown (ILS, RNAV, Visual, etc.) when you want the type tracked. If the type is only written in remarks, you can leave the dropdown blank and the system will still count the approaches.</li>
          <li>Click <strong>Validate</strong> to check your data and see a summary with column totals. Then click <strong>Import</strong> on the confirmation step to add the entries to your logbook.</li>
        </ul>
      </section>
    </div>
    
    <!-- Digifi Settings Modal -->
    <DigifiSettingsModal
      :open="showDigifiSettings"
      :stack="digifiSettingsStack"
      :is-dark-mode="isDark"
      :user-email="user?.email"
      v-model:account-email="accountEmail"
      v-model:current-password="currentPassword"
      v-model:new-password="newPassword"
      v-model:confirm-new-password="confirmNewPassword"
      :is-updating-email="isUpdatingEmail"
      :is-updating-password="isUpdatingPassword"
      :email-success="emailSuccessMessage"
      :email-error="emailErrorMessage"
      :password-success="passwordSuccessMessage"
      :password-error="passwordErrorMessage"
      @close="closeDigifiSettings"
      @pop="popDigifiSettingsFrame"
      @push="pushDigifiSettingsFrame"
      @update-email="updateAccountEmail"
      @update-password="updateAccountPassword"
      @account-deleted="handleAccountDeleted"
      @show-directions="handleShowDirections"
      @show-common-errors="handleShowCommonErrors"
    />

    <!-- Digifi Destination Chooser Modal -->
    <DigifiDestinationModal
      :open="showDigifiDestinationModal"
      :is-dark="isDark"
      @close="showDigifiDestinationModal = false"
      @select="handleDestinationSelect"
    />

    <!-- Digifi Learning Opt-In Modal -->
    <DigifiLearningOptInModal
      v-if="showDigifiLearningOptIn"
      :is-dark="isDark"
      @accept="handleLearningOptInAccept"
      @decline="handleLearningOptInDecline"
    />
  </div>
</template>
