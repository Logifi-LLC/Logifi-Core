<template>
  <AuthEntryPage initial-tab="signin" />
</template>

<script setup lang="ts">
import AuthEntryPage from '~/components/AuthEntryPage.vue'

useSeoMeta({
  title: 'Sign in · Logifi',
  description: 'Sign in to your Logifi logbook.',
  robots: 'noindex',
})
</script>
