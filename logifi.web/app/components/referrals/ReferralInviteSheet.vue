<template>
  <div
    v-if="referralPromptOpen"
    class="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex justify-center p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
  >
    <div
      class="pointer-events-auto w-full max-w-md rounded-2xl border shadow-lg"
      :class="isDark ? 'border-gray-700 bg-gray-900 text-gray-100' : 'border-gray-200 bg-white text-gray-900'"
    >
      <div class="flex items-center justify-between px-4 pt-3">
        <p class="font-quicksand text-sm font-semibold">Invite a friend</p>
        <button
          type="button"
          class="rounded-lg p-1"
          :class="isDark ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-400 hover:bg-gray-100'"
          aria-label="Dismiss"
          @click="dismissReferralPrompt"
        >
          <Icon name="ri:close-line" size="18" />
        </button>
      </div>
      <ReferralInviteCard class="px-4 pb-4" :is-dark-mode="isDark" />
    </div>
  </div>
</template>

<script setup lang="ts">
import ReferralInviteCard from './ReferralInviteCard.vue'
import { useTheme } from '~/composables/useTheme'
import { dismissReferralPrompt, referralPromptOpen } from '~/utils/referralPrompt'

const { isDark } = useTheme()
</script>
