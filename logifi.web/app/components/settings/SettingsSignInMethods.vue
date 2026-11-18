<template>
  <div class="space-y-2">
  <SettingsListGroup title="Sign-in methods" :is-dark-mode="isDarkMode">
    <div
      v-if="isLoading && rows.length === 0"
      class="px-4 py-3 text-sm font-quicksand"
      :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
    >
      Loading…
    </div>

    <div
      v-for="row in rows"
      :key="row.identity.identity_id || row.identity.id"
      class="flex min-h-11 items-center gap-3 px-4 py-3"
      :class="isDarkMode ? 'border-b border-gray-700/80 last:border-b-0' : 'border-b border-gray-100 last:border-b-0'"
    >
      <div class="min-w-0 flex-1">
        <p class="text-sm font-medium font-quicksand" :class="isDarkMode ? 'text-gray-100' : 'text-gray-900'">
          {{ row.label }}
        </p>
        <p class="mt-0.5 truncate text-xs font-quicksand" :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
          {{ row.email || 'Connected' }}
        </p>
      </div>
      <button
        type="button"
        class="min-h-11 shrink-0 rounded-lg px-3 text-sm font-semibold font-quicksand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        :class="isDarkMode ? 'text-red-400 hover:bg-gray-700/50' : 'text-red-600 hover:bg-gray-50'"
        :disabled="!canUnlinkAny || isUnlinking === (row.identity.identity_id || row.identity.id) || isBusy"
        :aria-label="canUnlinkAny ? `Unlink ${row.label}` : 'Keep at least one sign-in method'"
        @click="onUnlink(row)"
      >
        {{ isUnlinking === (row.identity.identity_id || row.identity.id) ? 'Unlinking…' : 'Unlink' }}
      </button>
    </div>

    <div
      v-if="showAppleConnect || showGoogleConnect"
      class="px-4 py-3 space-y-2"
    >
      <button
        v-if="showAppleConnect"
        type="button"
        class="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold font-quicksand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        :class="isDarkMode ? 'border-gray-700 text-white hover:bg-gray-700/50' : 'border-gray-200 text-gray-800 hover:bg-gray-50'"
        :disabled="isBusy"
        @click="linkProvider('apple')"
      >
        {{ isLinking === 'apple' ? 'Connecting…' : 'Connect Apple' }}
      </button>
      <button
        v-if="showGoogleConnect"
        type="button"
        class="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold font-quicksand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        :class="isDarkMode ? 'border-gray-700 text-white hover:bg-gray-700/50' : 'border-gray-200 text-gray-800 hover:bg-gray-50'"
        :disabled="isBusy"
        @click="linkProvider('google')"
      >
        {{ isLinking === 'google' ? 'Connecting…' : 'Connect Google' }}
      </button>
    </div>
  </SettingsListGroup>

  <p v-if="successMessage" class="text-sm text-emerald-600 dark:text-emerald-400">{{ successMessage }}</p>
  <p v-else-if="errorMessage" class="text-sm text-red-600 dark:text-red-400">{{ errorMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import SettingsListGroup from './SettingsListGroup.vue'
import { useLinkedIdentities, type LinkedIdentityRow } from '~/composables/useLinkedIdentities'

defineProps<{
  isDarkMode: boolean
}>()

const {
  rows,
  isLoading,
  isLinking,
  isUnlinking,
  errorMessage,
  successMessage,
  canUnlinkAny,
  showAppleConnect,
  showGoogleConnect,
  refreshIdentities,
  linkProvider,
  unlink,
} = useLinkedIdentities()

const isBusy = computed(() => Boolean(isLinking.value || isUnlinking.value))

onMounted(() => {
  void refreshIdentities()
})

function onUnlink(row: LinkedIdentityRow) {
  if (!canUnlinkAny.value) return
  if (!window.confirm(`Unlink ${row.label} from this account?`)) return
  void unlink(row.identity)
}
</script>
