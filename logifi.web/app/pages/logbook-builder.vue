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
import { supabase } from '~/lib/supabase'
import DigifiLearningOptInModal from '~/components/digifi/DigifiLearningOptInModal.vue'
import DigifiModeHeader from '~/components/DigifiModeHeader.vue'
import SettingsRootView from '~/components/settings/SettingsRootView.vue'
import SettingsStackShell from '~/components/settings/SettingsStackShell.vue'

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

provide('showDigifiLearningOptInModal', () => {
  if (optInStatus.value === false) {
    showDigifiLearningOptIn.value = true
  }
})

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
const showAccountSettings = ref(false)
const { optInStatus, loadOptInStatus, setOptIn } = useDigifiLearning()

const isDigifiMode = computed(() => route.query.digifi === 'open')

watchEffect(() => {
  if (isAuthenticated.value && user.value && optInStatus.value === null) {
    loadOptInStatus()
  }
})
</script>

<template>
  <div
    class="min-h-screen font-quicksand transition-colors duration-300 p-4 sm:p-6 lg:p-8"
    :class="isDark ? 'bg-gray-950' : 'bg-gray-50'"
  >
    <div class="mx-auto max-w-7xl space-y-4">
      <DigifiModeHeader
        v-if="isDigifiMode"
        :is-dark="isDark"
        @show-directions="showInstructions = !showInstructions"
        @show-common-errors="showDigifiCommonMistakes = !showDigifiCommonMistakes"
        @show-account="showAccountSettings = true"
      />
      
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
                <li>Use Validate to review totals and issues, then Import to add entries to your logbook.</li>
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
                Pre-Scan Digifi Checklist
              </h2>
              <ul
                class="space-y-1.5 text-sm list-disc list-inside"
                :class="isDark ? 'text-blue-100/90' : 'text-blue-900/90'"
              >
                <li>Confirm row count and layout (single-page or two-page) are correct.</li>
                <li>Verify columns/template match the paper page format.</li>
                <li>Ensure the page photo is flat, bright, and fully in frame.</li>
                <li>In two-page mode, scan the left page first before scanning the right page.</li>
                <li>After scan, review all AI-filled cells before importing.</li>
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
    
    <SettingsStackShell
      :open="showAccountSettings"
      :is-dark-mode="isDark"
      :is-root="true"
      title="Settings"
      @close="showAccountSettings = false"
    >
      <SettingsRootView :is-dark-mode="isDark" @close="showAccountSettings = false" />
    </SettingsStackShell>
  </div>
</template>
