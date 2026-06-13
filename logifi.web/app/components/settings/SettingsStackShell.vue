<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[60] pointer-events-none">
      <Transition name="settings-backdrop">
        <div
          v-if="open"
          class="pointer-events-auto fixed inset-0 hidden bg-black/50 lg:block"
          aria-hidden="true"
          @click="emit('close')"
        />
      </Transition>

      <Transition name="settings-panel">
        <div
          v-if="open"
          ref="shellRef"
          class="settings-stack-panel pointer-events-auto fixed inset-0 flex flex-col font-quicksand lg:inset-y-0 lg:left-auto lg:right-0 lg:w-full lg:max-w-[32rem] lg:rounded-l-2xl lg:border-l lg:shadow-2xl"
          :class="
            isDarkMode
              ? 'bg-gray-900 text-gray-100 lg:border-gray-700'
              : 'bg-gray-50 text-gray-900 lg:border-gray-200'
          "
        >
          <header
            class="shrink-0 border-b pt-[env(safe-area-inset-top)] transition-colors"
            :class="isDarkMode ? 'border-gray-800 bg-gray-900/95' : 'border-gray-200 bg-gray-50/95'"
          >
            <div class="flex items-center justify-between px-4 py-2">
              <div class="w-20 shrink-0">
                <button
                  v-if="!isRoot"
                  type="button"
                  class="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold transition-colors"
                  :class="isDarkMode ? 'text-gray-200 hover:bg-gray-800' : 'text-gray-800 hover:bg-gray-200'"
                  @click="emit('pop')"
                >
                  <Icon name="ri:arrow-left-line" size="18" />
                  Back
                </button>
              </div>

              <h1
                class="min-w-0 flex-1 truncate px-2 text-center text-base font-semibold"
                :class="isDarkMode ? 'text-white' : 'text-gray-900'"
              >
                {{ title }}
              </h1>

              <div class="flex w-20 shrink-0 justify-end">
                <button
                  v-if="isRoot"
                  type="button"
                  class="rounded-lg px-2 py-1.5 text-sm font-semibold transition-colors"
                  :class="isDarkMode ? 'text-blue-400 hover:bg-gray-800' : 'text-blue-600 hover:bg-gray-200'"
                  aria-label="Close settings"
                  @click="emit('close')"
                >
                  Done
                </button>
              </div>
            </div>
          </header>

          <div
            class="settings-stack-scroll flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] custom-scrollbar"
          >
            <div class="mx-auto w-full max-w-2xl lg:max-w-none">
              <Transition :name="transitionName" mode="out-in">
                <div :key="currentFrame">
                  <slot />
                </div>
              </Transition>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { settingsStackTitle, type SettingsStackFrame } from './settingsNav'
import { useSettingsSwipeBack } from './useSettingsSwipeBack'

const props = defineProps<{
  open: boolean
  stack: SettingsStackFrame[]
  isDarkMode: boolean
}>()

const emit = defineEmits<{
  close: []
  pop: []
  push: [frame: SettingsStackFrame]
}>()

const shellRef = ref<HTMLElement | null>(null)
const transitionName = ref('settings-push')

const currentFrame = computed(() => props.stack[props.stack.length - 1] ?? 'root')
const isRoot = computed(() => currentFrame.value === 'root')
const title = computed(() => settingsStackTitle(currentFrame.value))

let previousDepth = props.stack.length
watch(
  () => props.stack.length,
  (depth) => {
    transitionName.value = depth > previousDepth ? 'settings-push' : 'settings-pop'
    previousDepth = depth
  }
)

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close')
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      document.addEventListener('keydown', onKeydown)
    } else {
      document.removeEventListener('keydown', onKeydown)
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})

useSettingsSwipeBack({
  shellRef,
  isOpen: computed(() => props.open),
  canPop: computed(() => !isRoot.value),
  onPop: () => emit('pop'),
})
</script>

<style scoped>
.settings-stack-scroll {
  -webkit-overflow-scrolling: touch;
}

.settings-backdrop-enter-active,
.settings-backdrop-leave-active {
  transition: opacity 0.2s ease;
}

.settings-backdrop-enter-from,
.settings-backdrop-leave-to {
  opacity: 0;
}

.settings-panel-enter-active,
.settings-panel-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

@media (max-width: 1023px) {
  .settings-panel-enter-from,
  .settings-panel-leave-to {
    opacity: 0;
    transform: translateY(8px);
  }
}

@media (min-width: 1024px) {
  .settings-panel-enter-from,
  .settings-panel-leave-to {
    transform: translateX(100%);
  }
}

.settings-push-enter-active,
.settings-push-leave-active,
.settings-pop-enter-active,
.settings-pop-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.settings-push-enter-from {
  opacity: 0;
  transform: translateX(24px);
}

.settings-push-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}

.settings-pop-enter-from {
  opacity: 0;
  transform: translateX(-24px);
}

.settings-pop-leave-to {
  opacity: 0;
  transform: translateX(16px);
}
</style>
