<template>
  <header
    class="flex items-center justify-between pb-4 border-b transition-colors"
    :class="isDark ? 'border-white/10' : 'border-gray-400/50'"
  >
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2">
        <Icon name="ri:scan-line" size="24" :class="isDark ? 'text-orange-400' : 'text-orange-600'" />
        <h1
          class="text-2xl font-bold font-quicksand"
          :class="isDark ? 'text-white' : 'text-gray-900'"
        >
          Digifi
        </h1>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <button
        type="button"
        :class="[
          'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-quicksand font-semibold transition-colors border',
          isDark
            ? 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
        ]"
        @click="$emit('show-directions')"
      >
        <Icon name="ri:question-line" size="16" />
        <span class="hidden sm:inline">Directions</span>
      </button>
      
      <button
        type="button"
        :class="[
          'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-quicksand font-semibold transition-colors border',
          isDark
            ? 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
        ]"
        @click="$emit('show-common-errors')"
      >
        <Icon name="ri:alert-line" size="16" />
        <span class="hidden sm:inline">Common Errors</span>
      </button>

      <NuxtLink
        to="/dashboard"
        :class="[
          'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-quicksand font-semibold transition-colors border',
          isDark
            ? 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
        ]"
      >
        <Icon name="ri:arrow-left-line" size="16" />
        <span class="hidden sm:inline">Logifi</span>
      </NuxtLink>

      <button
        type="button"
        :class="[
          'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-quicksand font-semibold transition-colors border',
          isDark
            ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white shadow-sm shadow-black/20'
            : 'bg-gray-200 hover:bg-gray-300 text-gray-900 border-gray-300'
        ]"
        @click="$emit('show-account')"
      >
        <Icon name="ri:user-line" size="16" />
        <span class="hidden sm:inline">Account</span>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  isDark: boolean
}>()

defineEmits<{
  'show-directions': []
  'show-common-errors': []
  'show-account': []
}>()
</script>
