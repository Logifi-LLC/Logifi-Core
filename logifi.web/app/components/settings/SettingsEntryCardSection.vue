<template>
  <div class="space-y-3">
    <p :class="listGroupHeader">Entry card</p>
    <p :class="['px-1 text-xs font-quicksand mb-2', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
      Choose which details appear on each logbook entry. Date, route, aircraft, and total always show in the card header.
    </p>

    <div class="flex flex-wrap gap-2 px-1">
      <button
        v-for="preset in presets"
        :key="preset.id"
        type="button"
        :class="chipClass(activePresetId === preset.id)"
        @click="$emit('apply-preset', preset.id)"
      >
        {{ preset.label }}
      </button>
      <button
        type="button"
        :class="chipClass(activePresetId === 'custom')"
        @click="$emit('apply-preset', 'custom')"
      >
        Custom
      </button>
    </div>

    <p
      v-if="detailFieldCrowded"
      :class="['px-1 text-xs font-quicksand', isDarkMode ? 'text-amber-400' : 'text-amber-600']"
    >
      You have many detail fields selected — cards may feel crowded. Consider using a preset or hiding a few fields.
    </p>

    <div :class="listGroup">
      <div
        v-for="(col, index) in pickerFields"
        :key="col.key"
        :draggable="!isHeaderField(col.key)"
        class="flex items-center gap-2 px-3 py-2.5"
        :class="[
          listRowSeparator,
          !isHeaderField(col.key) ? 'cursor-move' : '',
        ]"
        @dragstart="!isHeaderField(col.key) && $emit('drag-start', col.key)"
        @dragover.prevent
        @drop.prevent="!isHeaderField(col.key) && $emit('drop', col.key)"
      >
        <Icon
          v-if="!isHeaderField(col.key)"
          name="ri:drag-move-2-line"
          size="16"
          class="hidden sm:block shrink-0"
          :class="isDarkMode ? 'text-gray-500' : 'text-gray-400'"
        />
        <div v-if="!isHeaderField(col.key)" class="flex shrink-0 flex-col gap-0.5 sm:hidden">
          <button
            type="button"
            class="rounded p-0.5"
            :class="isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'"
            :disabled="index === 0"
            aria-label="Move up"
            @click="$emit('move-up', col.key)"
          >
            <Icon name="ri:arrow-up-s-line" size="16" />
          </button>
          <button
            type="button"
            class="rounded p-0.5"
            :class="isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'"
            :disabled="index === pickerFields.length - 1"
            aria-label="Move down"
            @click="$emit('move-down', col.key)"
          >
            <Icon name="ri:arrow-down-s-line" size="16" />
          </button>
        </div>
        <span v-else class="w-4 sm:w-4" aria-hidden="true" />

        <label
          :class="[
            'flex flex-1 items-center gap-2 min-w-0',
            isHeaderField(col.key) ? 'opacity-60 cursor-default' : 'cursor-pointer',
          ]"
        >
          <input
            type="checkbox"
            :checked="col.visible"
            :disabled="isHeaderField(col.key)"
            class="h-5 w-5 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            :class="isDarkMode ? 'border-gray-600 bg-gray-800' : 'bg-white'"
            @change="$emit('toggle-field', col.key)"
          />
          <span class="truncate text-sm font-quicksand" :class="isDarkMode ? 'text-gray-200' : 'text-gray-700'">
            {{ col.label }}
            <span v-if="isHeaderField(col.key)" :class="['text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-400']">
              (header)
            </span>
          </span>
        </label>
      </div>
    </div>

    <button
      type="button"
      :class="[
        'w-full rounded-xl px-4 py-3 text-sm font-quicksand transition-colors',
        isDarkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700',
      ]"
      @click="$emit('reset')"
    >
      Reset to defaults
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsClasses } from './useSettingsClasses'
import type { LogbookColumnConfig, LogbookColumnKey } from '~/utils/logbookTypes'
import { isHeaderZoneKey, type EntryCardPreset, type EntryCardPresetId } from '~/utils/entryCardPresets'

const props = defineProps<{
  isDarkMode: boolean
  presets: readonly EntryCardPreset[]
  activePresetId: EntryCardPresetId
  pickerFields: LogbookColumnConfig[]
  detailFieldCrowded: boolean
}>()

defineEmits<{
  'apply-preset': [id: EntryCardPresetId]
  'toggle-field': [key: LogbookColumnKey]
  'drag-start': [key: LogbookColumnKey]
  drop: [key: LogbookColumnKey]
  'move-up': [key: LogbookColumnKey]
  'move-down': [key: LogbookColumnKey]
  reset: []
}>()

const { listGroup, listGroupHeader, listRowSeparator } = useSettingsClasses(computed(() => props.isDarkMode))

function chipClass(active: boolean): string {
  const base = 'rounded-lg border px-3 py-1.5 text-xs font-quicksand transition-colors'
  if (active) {
    return props.isDarkMode
      ? `${base} border-blue-500 bg-blue-500/20 text-blue-300`
      : `${base} border-blue-500 bg-blue-50 text-blue-700`
  }
  return props.isDarkMode
    ? `${base} border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700`
    : `${base} border-gray-200 bg-white text-gray-700 hover:bg-gray-50`
}

function isHeaderField(key: LogbookColumnKey): boolean {
  return isHeaderZoneKey(key)
}
</script>
