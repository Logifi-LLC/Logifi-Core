<template>
  <p
    v-if="summary"
    class="mt-4 text-sm font-quicksand"
    :class="summary.expiringSoon ? emphasisClass : baseClass"
  >
    Solo: {{ summary.title }} · expires {{ formatDate(summary.expiresAt) }}
    <span v-if="summary.expiringSoon"> ({{ summary.daysRemaining }} days)</span>
  </p>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useEndorsements } from '~/composables/useEndorsements'
import { useAuth } from '~/composables/useAuth'
import { pickActiveSoloEndorsement } from '~/utils/soloEndorsementStatus'

const props = defineProps<{
  isDarkMode: boolean
}>()

const { user } = useAuth()
const { asStudent, refreshEndorsements } = useEndorsements()

onMounted(() => {
  if (!user.value?.id) return
  void refreshEndorsements()
})

const summary = computed(() => {
  if (!user.value?.id) return null
  return pickActiveSoloEndorsement(asStudent.value)
})

const baseClass = computed(() =>
  props.isDarkMode ? 'text-gray-400' : 'text-gray-600'
)

const emphasisClass = computed(() =>
  props.isDarkMode ? 'text-amber-300 font-medium' : 'text-amber-800 font-medium'
)

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return iso.slice(0, 10)
  }
}
</script>