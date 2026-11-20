<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import IosAppPageShell from '~/components/ios/IosAppPageShell.vue'
import SettingsEndorsementsTab from '~/components/settings/tabs/SettingsEndorsementsTab.vue'
import type { PilotAccountRole } from '~/components/settings/tabs/SettingsProfileTab.vue'
import { useAuth } from '~/composables/useAuth'
import { useCapacitorPlatform } from '~/composables/useCapacitorPlatform'
import { useTheme } from '~/composables/useTheme'
import { supabase } from '~/lib/supabase'
import {
  loadEndorsementsPage,
  parseEndorsementsRole,
} from '~/utils/endorsementsPageLoad'
import {
  ACCOUNT_SCOPED_STORAGE_KEYS,
  getScopedItem,
} from '~/utils/userScopedStorage'

definePageMeta({ layout: 'default' })

const router = useRouter()
const { initAuth, user, isAuthenticated } = useAuth()
const { isDark } = useTheme()
const { isIos } = useCapacitorPlatform()

const role = ref<PilotAccountRole>('STUDENT')
const loading = ref(true)
const loadError = ref<string | null>(null)

const pageBg = computed(() =>
  isDark.value ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'
)
const headerBorder = computed(() => (isDark.value ? 'border-gray-800' : 'border-gray-200'))
const muted = computed(() => (isDark.value ? 'text-gray-400' : 'text-gray-500'))

function loadRoleFromLocal(): PilotAccountRole | null {
  const userId = user.value?.id
  if (!userId) return null
  try {
    const stored = getScopedItem(ACCOUNT_SCOPED_STORAGE_KEYS.PILOT_PROFILE, userId)
    if (!stored) return null
    const parsed = JSON.parse(stored) as { role?: unknown }
    return parseEndorsementsRole(parsed.role)
  } catch {
    return null
  }
}

async function readRemoteRole(userId: string): Promise<PilotAccountRole | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return parseEndorsementsRole(data?.role)
}

async function loadRole(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    const result = await loadEndorsementsPage({
      initAuth,
      getUserId: () => user.value?.id ?? null,
      readLocalRole: loadRoleFromLocal,
      readRemoteRole,
    })
    role.value = result.role
    loadError.value = result.error
  } finally {
    loading.value = false
  }
}

function goBack() {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()
    return
  }
  void router.push('/dashboard')
}

onMounted(() => {
  void loadRole()
})
</script>

<template>
  <IosAppPageShell v-if="isIos" title="Endorsements">
    <p v-if="loading" class="pt-4 text-sm" :class="muted">Loading…</p>
    <p v-else-if="!isAuthenticated" class="pt-4 text-sm" :class="muted">
      Sign in from the logbook to manage endorsements.
    </p>
    <div v-else class="space-y-2 pt-4">
      <p v-if="loadError" class="text-sm" :class="isDark ? 'text-red-400' : 'text-red-700'">
        {{ loadError }}
      </p>
      <button
        v-if="loadError"
        type="button"
        class="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold"
        :class="isDark ? 'text-gray-100' : 'text-gray-900'"
        @click="loadRole"
      >
        Retry
      </button>
      <SettingsEndorsementsTab
        :is-dark-mode="isDark"
        :role="role"
        :is-active="true"
      />
    </div>
  </IosAppPageShell>

  <div v-else class="min-h-[100dvh] font-quicksand" :class="pageBg">
    <header
      class="sticky top-0 z-50 border-b pt-[env(safe-area-inset-top)] backdrop-blur-sm"
      :class="[headerBorder, isDark ? 'bg-gray-950/95' : 'bg-gray-50/95']"
    >
      <div class="mx-auto flex max-w-3xl items-center gap-1 px-3 py-1 sm:px-4">
        <button
          type="button"
          class="inline-flex min-h-11 min-w-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold"
          :class="isDark ? 'text-gray-200 hover:bg-gray-800' : 'text-gray-800 hover:bg-gray-200'"
          @click="goBack"
        >
          <Icon name="ri:arrow-left-line" size="18" />
          Back
        </button>
        <h1 class="min-w-0 flex-1 truncate text-center text-base font-semibold">Endorsements</h1>
        <div class="w-11 shrink-0" aria-hidden="true" />
      </div>
    </header>

    <main class="mx-auto max-w-3xl px-3 py-3 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-4">
      <p v-if="loading" class="text-sm" :class="muted">Loading…</p>
      <p v-else-if="!isAuthenticated" class="text-sm" :class="muted">
        Sign in from the logbook to manage endorsements.
      </p>
      <div v-else class="space-y-2">
        <p v-if="loadError" class="text-sm" :class="isDark ? 'text-red-400' : 'text-red-700'">
          {{ loadError }}
        </p>
        <button
          v-if="loadError"
          type="button"
          class="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold"
          :class="isDark ? 'text-gray-100' : 'text-gray-900'"
          @click="loadRole"
        >
          Retry
        </button>
        <SettingsEndorsementsTab
          :is-dark-mode="isDark"
          :role="role"
          :is-active="true"
        />
      </div>
    </main>
  </div>
</template>
