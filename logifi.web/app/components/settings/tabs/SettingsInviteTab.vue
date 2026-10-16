<template>
  <div class="space-y-6">
    <SettingsListGroup title="Invite a friend" :is-dark-mode="isDarkMode">
      <div class="px-4 py-3">
        <ReferralInviteCard :is-dark-mode="isDarkMode" show-code-entry />
      </div>
    </SettingsListGroup>
  </div>
</template>

<script setup lang="ts">
import SettingsListGroup from '../SettingsListGroup.vue'
import ReferralInviteCard from '~/components/referrals/ReferralInviteCard.vue'

defineProps<{
  isDarkMode: boolean
}>()
</script>
