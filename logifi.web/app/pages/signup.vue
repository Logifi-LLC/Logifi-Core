<template>
  <div class="min-h-screen bg-gray-50 font-quicksand">
    <ClientOnly>
      <AuthModal
        v-if="showAuth"
        :initial-tab="authTab"
        :notice="authNotice"
        @close="closeAuth"
        @success="handleAuthSuccess"
      />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import AuthModal from '~/components/AuthModal.vue'
import { useAuthEntryPage } from '~/composables/useAuthEntryPage'

const { showAuth, authTab, authNotice, handleAuthSuccess, closeAuth } = useAuthEntryPage('signup')

useSeoMeta({
  title: 'Sign up — Logifi',
  description: 'Create your free Logifi pilot logbook account.',
})
</script>
