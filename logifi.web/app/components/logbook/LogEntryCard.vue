<template>
  <button
    type="button"
    :class="[
      'w-full text-left rounded-xl border transition-all duration-200 border-l-4 px-4 py-3 sm:px-5 sm:py-4',
      isSigned
        ? isDarkMode
          ? 'bg-gray-900 border-l-green-500 border-gray-700 hover:bg-white/10'
          : 'bg-gray-100 border-l-green-500 border-gray-300 hover:bg-gray-200'
        : isPending
          ? isDarkMode
            ? 'bg-gray-900 border-l-amber-500 border-gray-700 hover:bg-white/10'
            : 'bg-gray-100 border-l-amber-500 border-gray-300 hover:bg-gray-200'
        : entry.flagged
          ? isDarkMode
            ? 'bg-amber-900/20 border-l-amber-500 border-gray-700 hover:bg-amber-900/30'
            : 'bg-amber-50 border-l-amber-500 border-gray-300 hover:bg-amber-100'
          : isDarkMode
            ? 'bg-gray-900 border-gray-700 border-l-transparent hover:bg-white/10 hover:border-l-blue-500/50'
            : 'bg-gray-100 border-gray-300 border-l-transparent hover:bg-gray-200 hover:border-l-blue-500',
    ]"
    @click="$emit('click', entry)"
  >
    <!-- Header zone -->
    <div class="flex flex-col gap-1.5 min-w-0">
      <!-- Row 1: date · role left, flight number centered in the gap, total right -->
      <div class="flex items-baseline min-w-0">
        <p
          :class="[
            'min-w-0 shrink truncate text-base font-semibold font-quicksand',
            isDarkMode ? 'text-white' : 'text-gray-900',
          ]"
        >
          <span>{{ formatDisplayDate(entry.date) }}</span>
          <span :class="['font-normal', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            · {{ roleDisplayLabel(entry.role) }}<template v-if="entry.logbookType === 'simulator'"> · Simulator</template>
          </span>
        </p>
        <div class="min-w-0 flex-1 text-center px-2">
          <span
            v-if="headerFlightNumber"
            data-testid="header-flight-number"
            :class="[
              'text-base font-semibold font-quicksand leading-none',
              isDarkMode ? 'text-white' : 'text-gray-900',
            ]"
          >
            {{ headerFlightNumber }}
          </span>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <Icon
            v-if="entry.isVoid"
            name="ri:prohibited-line"
            size="18"
            :class="isDarkMode ? 'text-rose-400' : 'text-rose-600'"
            title="Voided entry"
          />
          <Icon
            v-else-if="isSigned"
            name="ri:lock-line"
            size="18"
            :class="isDarkMode ? 'text-green-400' : 'text-green-600'"
            title="Signed by instructor"
          />
          <Icon
            v-else-if="isPending"
            name="ri:time-line"
            size="18"
            :class="isDarkMode ? 'text-amber-400' : 'text-amber-600'"
            title="Pending instructor signature"
          />
          <p :class="['text-2xl font-bold font-mono tracking-tight leading-none', totalTimeClass]">
            {{ headerTotal }}
          </p>
        </div>
      </div>

      <!-- Row 2+: route, aircraft, or sim details -->
      <template v-if="entry.logbookType === 'simulator'">
        <div class="min-w-0">
          <div :class="['text-base font-semibold truncate font-quicksand', isDarkMode ? 'text-gray-200' : 'text-gray-900']">
            {{ getSimHeaderLabel(entry) }}
          </div>
          <div v-if="entry.trainingElements" :class="['text-xs truncate mt-0.5', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            {{ entry.trainingElements }}
          </div>
        </div>
      </template>
      <template v-else>
        <div class="min-w-0">
          <div :class="['text-base font-semibold truncate font-quicksand', isDarkMode ? 'text-gray-200' : 'text-gray-900']">
            {{ formatEntryAirportCode(entry, entry.departure) }} → {{ formatEntryAirportCode(entry, entry.destination) }}
          </div>
          <div v-if="entry.route" :class="['text-xs truncate mt-0.5', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            {{ entry.route }}
          </div>
        </div>
        <p
          v-if="aircraftSummary"
          :class="['text-sm truncate mt-0.5', isDarkMode ? 'text-gray-400' : 'text-gray-500']"
        >
          {{ aircraftSummary }}
        </p>
      </template>
    </div>

    <!-- Detail zone -->
    <div v-if="detailChipFields.length" class="mt-3 flex flex-wrap gap-2 min-w-0">
      <template v-for="field in detailChipFields" :key="field.key">
        <template v-if="field.key === 'conditions'">
          <span
            v-for="condition in getDisplayConditions(entry)"
            :key="`${entry.id}-${condition}`"
            :class="chipClass"
          >
            {{ condition }}
          </span>
        </template>
        <span
          v-else-if="!getEntryFieldDisplay(entry, field.key).isEmpty"
          :class="chipClass"
        >
          <span :class="['font-semibold', isDarkMode ? 'text-gray-400' : 'text-gray-500']">{{ field.label }}:</span>
          {{ getEntryFieldDisplay(entry, field.key).text }}
        </span>
      </template>
    </div>

    <p
      v-if="pilotsLine"
      data-testid="pilots-line"
      :class="['mt-3 text-sm truncate text-right font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']"
    >
      {{ pilotsLine }}
    </p>

    <!-- Footer zone -->
    <div
      v-if="(showRemarksFooter && entry.remarks?.trim()) || (entry.tags && entry.tags.length)"
      class="mt-3 pt-3 border-t min-w-0"
      :class="isDarkMode ? 'border-gray-700' : 'border-gray-200'"
    >
      <p
        v-if="showRemarksFooter && entry.remarks?.trim()"
        :class="['text-sm italic line-clamp-2', isDarkMode ? 'text-gray-400' : 'text-gray-500']"
      >
        {{ entry.remarks }}
      </p>
      <div v-if="entry.tags?.length" class="mt-2 flex flex-wrap gap-1.5">
        <span
          v-for="tag in entry.tags"
          :key="`${entry.id}-${tag}`"
          :class="[
            'rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold border',
            isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-300' : 'bg-white border-gray-200 text-gray-600',
          ]"
        >
          {{ tag }}
        </span>
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LogbookColumnConfig, LogEntry } from '~/utils/logbookTypes'
import {
  formatDisplayDate,
  formatEntryAirportCode,
  formatLogbookNumber,
  getDisplayConditions,
  getEntryFieldDisplay,
  getSimHeaderLabel,
  getSimHeaderTime,
  getTotalTimeColorClass,
  roleDisplayLabel,
} from '~/utils/entryFieldDisplay'

const props = defineProps<{
  entry: LogEntry
  isDarkMode: boolean
  visibleDetailFields: LogbookColumnConfig[]
  showRemarksFooter: boolean
  isSigned?: boolean
  isPending?: boolean
}>()

defineEmits<{
  click: [entry: LogEntry]
}>()

const chipClass = computed(() => [
  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-quicksand border',
  props.isDarkMode
    ? 'bg-gray-800/80 border-gray-600 text-gray-200'
    : 'bg-white border-gray-200 text-gray-700',
])

const headerFlightNumber = computed(() => {
  const enabled = props.visibleDetailFields.some((field) => field.key === 'flightNumber')
  const value = props.entry.flightNumber?.trim()
  if (!enabled || !value) return ''
  return value
})

const detailChipFields = computed(() =>
  props.visibleDetailFields.filter((field) => field.key !== 'flightNumber' && field.key !== 'pilots'),
)

const pilotsLine = computed(() => {
  const enabled = props.visibleDetailFields.some((field) => field.key === 'pilots')
  const value = props.entry.trainingElements?.trim()
  if (!enabled || !value) return ''
  return value
})

const totalTimeClass = computed(() => getTotalTimeColorClass(props.entry, props.isDarkMode))

const headerTotal = computed(() => {
  if (props.entry.logbookType === 'simulator') {
    return getSimHeaderTime(props.entry)
  }
  return formatLogbookNumber(props.entry.flightTime.total)
})

const aircraftSummary = computed(() => {
  const parts = [
    props.entry.registration?.trim(),
    props.entry.aircraftMakeModel?.trim(),
    props.entry.aircraftCategoryClass?.trim(),
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : ''
})
</script>
