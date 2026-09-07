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
        v-if="open"
        class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        @click.self="$emit('close')"
      >
        <div
          class="w-full max-w-md rounded-2xl border p-6 shadow-2xl"
          :class="isDark ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-200'"
        >
          <h2
            class="text-xl font-bold font-quicksand mb-2"
            :class="isDark ? 'text-white' : 'text-gray-900'"
          >
            Where should Digifi send your flights?
          </h2>
          <p
            class="text-sm mb-6"
            :class="isDark ? 'text-gray-300' : 'text-gray-700'"
          >
            Choose your destination. You can change this later in settings.
          </p>

          <div class="space-y-3">
            <!-- LogTen Pro option -->
            <button
              type="button"
              class="w-full text-left rounded-xl border p-4 transition-all"
              :class="[
                isDark
                  ? 'border-orange-500/40 bg-orange-600/10 hover:bg-orange-600/20 text-white'
                  : 'border-orange-300 bg-orange-50 hover:bg-orange-100 text-gray-900'
              ]"
              @click="handleSelect('logten')"
            >
              <div class="flex items-start gap-3">
                <Icon
                  name="ri:macbook-line"
                  size="24"
                  :class="isDark ? 'text-orange-400' : 'text-orange-600'"
                />
                <div class="flex-1">
                  <div
                    class="font-semibold font-quicksand mb-1"
                    :class="isDark ? 'text-white' : 'text-gray-900'"
                  >
                    LogTen Pro (Mac)
                  </div>
                  <p
                    class="text-xs"
                    :class="isDark ? 'text-gray-300' : 'text-gray-700'"
                  >
                    Open flights directly in LogTen Pro after review
                  </p>
                </div>
              </div>
            </button>

            <!-- Logifi option -->
            <button
              type="button"
              class="w-full text-left rounded-xl border p-4 transition-all"
              :class="[
                isDark
                  ? 'border-blue-500/40 bg-blue-600/10 hover:bg-blue-600/20 text-white'
                  : 'border-blue-300 bg-blue-50 hover:bg-blue-100 text-gray-900'
              ]"
              @click="handleSelect('logifi')"
            >
              <div class="flex items-start gap-3">
                <Icon
                  name="ri:book-open-line"
                  size="24"
                  :class="isDark ? 'text-blue-400' : 'text-blue-600'"
                />
                <div class="flex-1">
                  <div
                    class="font-semibold font-quicksand mb-1"
                    :class="isDark ? 'text-white' : 'text-gray-900'"
                  >
                    Logifi logbook
                  </div>
                  <p
                    class="text-xs"
                    :class="isDark ? 'text-gray-300' : 'text-gray-700'"
                  >
                    Import to your Logifi digital logbook
                  </p>
                </div>
              </div>
            </button>
          </div>

          <button
            type="button"
            class="mt-6 w-full text-center text-sm font-medium transition-colors"
            :class="isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'"
            @click="$emit('close')"
          >
            I'll decide later
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  open: boolean
  isDark: boolean
}>()

const emit = defineEmits<{
  close: []
  select: [sink: 'logten' | 'logifi']
}>()

function handleSelect(sink: 'logten' | 'logifi') {
  emit('select', sink)
}
</script>
