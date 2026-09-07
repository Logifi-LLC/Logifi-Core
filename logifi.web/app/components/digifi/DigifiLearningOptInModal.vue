<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4 font-quicksand"
        :class="isDark ? 'bg-black/70' : 'bg-black/50'"
        @click.self="handleDecline"
      >
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="isOpen"
            class="relative w-full max-w-md rounded-2xl border shadow-2xl"
            :class="isDark ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200'"
          >
            <div class="p-6">
              <div class="flex items-start gap-3 mb-4">
                <div
                  class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  :class="isDark ? 'bg-blue-500/10' : 'bg-blue-50'"
                >
                  <Icon name="ri:lightbulb-line" size="24" class="text-blue-500" />
                </div>
                <div class="flex-1">
                  <h2
                    class="text-lg font-bold mb-1"
                    :class="isDark ? 'text-white' : 'text-gray-900'"
                  >
                    Help Digifi Learn
                  </h2>
                  <p
                    class="text-sm leading-relaxed"
                    :class="isDark ? 'text-gray-300' : 'text-gray-700'"
                  >
                    We can save your corrections and vocabulary (aircraft registrations and airports) to improve recognition on future scans.
                  </p>
                </div>
              </div>

              <div
                class="rounded-xl p-3 mb-4 text-xs leading-relaxed"
                :class="isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-50 text-gray-600'"
              >
                <strong>What's saved:</strong> corrections you make during review, aircraft registrations, and airport codes you use.
                <br />
                <strong>What's NOT saved:</strong> your actual logbook entries or page photos.
              </div>

              <div class="flex gap-3">
                <button
                  type="button"
                  :disabled="isLoading"
                  class="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  :class="
                    isDark
                      ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300'
                      : 'bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700'
                  "
                  @click="handleDecline"
                >
                  No Thanks
                </button>
                <button
                  type="button"
                  :disabled="isLoading"
                  class="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors text-white"
                  :class="
                    isDark
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  "
                  @click="handleAccept"
                >
                  <span v-if="!isLoading">Enable Learning</span>
                  <span v-else>Saving...</span>
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  isOpen: boolean
  isDark: boolean
}>()

const emit = defineEmits<{
  accept: []
  decline: []
}>()

const isLoading = ref(false)

const handleAccept = async () => {
  isLoading.value = true
  try {
    emit('accept')
  } finally {
    isLoading.value = false
  }
}

const handleDecline = () => {
  emit('decline')
}
</script>
