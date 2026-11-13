<template>
  <AuthEntryPage initial-tab="signup" />
</template>

<script setup lang="ts">
import AuthEntryPage from '~/components/AuthEntryPage.vue'

useSeoMeta({
  title: 'Sign up · Logifi',
  description: 'Create your free Logifi pilot logbook account.',
  robots: 'noindex',
})
</script>
