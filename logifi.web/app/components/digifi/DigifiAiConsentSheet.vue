<script setup lang="ts">
import { useTheme } from '~/composables/useTheme'
import { useDigifiAiConsent } from '~/composables/useDigifiAiConsent'
import {
  DIGIFI_AI_CONSENT_BODY,
  DIGIFI_AI_CONSENT_CONTINUE_LABEL,
  DIGIFI_AI_CONSENT_DECLINE_LABEL,
  DIGIFI_AI_CONSENT_PRIVACY_PATH,
  DIGIFI_AI_CONSENT_TERMS_PATH,
  DIGIFI_AI_CONSENT_TITLE,
} from '~/utils/digifiAiConsent'

const { isDark } = useTheme()
const {
  digifiAiConsentSheetOpen,
  acceptDigifiAiConsent,
  declineDigifiAiConsent,
} = useDigifiAiConsent()

const linkClass = 'font-semibold underline underline-offset-2'
</script>

<template>
  <Teleport to="body">
    <div
      v-if="digifiAiConsentSheetOpen"
      class="fixed inset-0 z-[130] flex items-end justify-center bg-black/50 p-4 font-quicksand sm:items-center"
      @click.self="declineDigifiAiConsent"
    >
      <div
        class="w-full max-w-md rounded-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl"
        :class="isDark ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'"
        role="dialog"
        aria-modal="true"
        aria-labelledby="digifi-ai-consent-title"
        @click.stop
      >
        <h2 id="digifi-ai-consent-title" class="text-lg font-bold">
          {{ DIGIFI_AI_CONSENT_TITLE }}
        </h2>
        <p
          class="mt-2 text-sm leading-relaxed"
          :class="isDark ? 'text-gray-300' : 'text-gray-600'"
        >
          {{ DIGIFI_AI_CONSENT_BODY }}
        </p>
        <p class="mt-3 text-sm">
          <NuxtLink
            :to="DIGIFI_AI_CONSENT_PRIVACY_PATH"
            :class="[linkClass, isDark ? 'text-blue-300' : 'text-blue-700']"
          >
            Privacy
          </NuxtLink>
          <span aria-hidden="true" :class="isDark ? 'text-gray-500' : 'text-gray-400'"> · </span>
          <NuxtLink
            :to="DIGIFI_AI_CONSENT_TERMS_PATH"
            :class="[linkClass, isDark ? 'text-blue-300' : 'text-blue-700']"
          >
            Terms
          </NuxtLink>
        </p>
        <div class="mt-5 flex flex-col gap-2">
          <button
            type="button"
            class="min-h-[48px] w-full rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white"
            @click="acceptDigifiAiConsent"
          >
            {{ DIGIFI_AI_CONSENT_CONTINUE_LABEL }}
          </button>
          <button
            type="button"
            class="min-h-[48px] w-full rounded-xl px-4 text-sm font-semibold"
            :class="isDark ? 'text-gray-300' : 'text-gray-600'"
            @click="declineDigifiAiConsent"
          >
            {{ DIGIFI_AI_CONSENT_DECLINE_LABEL }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
