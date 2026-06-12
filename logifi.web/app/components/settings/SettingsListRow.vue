<template>
  <component :is="to ? NuxtLink : 'button'" :to="to" :type="to ? undefined : 'button'" :class="rowClasses" @click="onClick">
    <div
      v-if="icon || $slots.leading"
      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
      :class="isDarkMode ? 'bg-gray-700/60 text-gray-300' : 'bg-gray-100 text-gray-600'"
    >
      <slot name="leading">
        <Icon v-if="icon" :name="icon" size="18" />
      </slot>
    </div>

    <div class="min-w-0 flex-1">
      <p
        class="text-sm font-medium"
        :class="destructive ? destructiveRow : isDarkMode ? 'text-gray-100' : 'text-gray-900'"
      >
        {{ label }}
      </p>
      <p v-if="subtitle" class="mt-0.5 truncate text-xs" :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
        {{ subtitle }}
      </p>
    </div>

    <div v-if="value || badge != null || showChevron || $slots.trailing" class="flex shrink-0 items-center gap-2">
      <slot name="trailing">
        <span
          v-if="badge != null"
          class="rounded-full px-2 py-0.5 text-xs font-medium"
          :class="isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'"
        >
          {{ badge }}
        </span>
        <span
          v-if="value"
          class="max-w-[140px] truncate text-sm"
          :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
        >
          {{ value }}
        </span>
        <Icon
          v-if="showChevron"
          name="ri:arrow-right-s-line"
          size="20"
          :class="isDarkMode ? 'text-gray-500' : 'text-gray-400'"
        />
      </slot>
    </div>
  </component>
</template>

<script setup lang="ts">
import { computed, resolveComponent } from 'vue'
import { useSettingsClasses } from './useSettingsClasses'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    label: string
    subtitle?: string
    value?: string
    badge?: string | number
    icon?: string
    isDarkMode: boolean
    showChevron?: boolean
    destructive?: boolean
    to?: string
  }>(),
  {
    showChevron: true,
  }
)

const emit = defineEmits<{
  click: []
}>()

const NuxtLink = resolveComponent('NuxtLink')

const { listRow, listRowSeparator, destructiveRow } = useSettingsClasses(computed(() => props.isDarkMode))

const rowClasses = computed(() => [listRow.value, listRowSeparator.value, props.destructive ? destructiveRow.value : ''])

function onClick() {
  emit('click')
}
</script>
