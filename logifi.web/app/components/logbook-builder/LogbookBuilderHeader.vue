<script setup lang="ts">
import { computed } from 'vue'
import type { BuilderColumn } from '~/utils/logbookBuilderTypes'
import type { LogbookColumnKey } from '~/utils/logbookTypes'

const props = defineProps<{ column: BuilderColumn }>()
const emit = defineEmits<{ update: [col: BuilderColumn, updates: Partial<Pick<BuilderColumn, 'fieldKey' | 'label'>>] }>()

const FIELD_OPTIONS: { value: LogbookColumnKey | ''; label: string }[] = [
  { value: '', label: 'Unmapped' },
  { value: 'date', label: 'Date' },
  { value: 'aircraft', label: 'Aircraft' },
  { value: 'identification', label: 'Identification' },
  { value: 'flightNumber', label: 'Flight Number' },
  { value: 'fromTo', label: 'From → To' },
  { value: 'conditions', label: 'Conditions' },
  { value: 'remarks', label: 'Remarks' },
  { value: 'pic', label: 'PIC' },
  { value: 'sic', label: 'SIC' },
  { value: 'dualR', label: 'Dual R' },
  { value: 'solo', label: 'Solo' },
  { value: 'night', label: 'Night' },
  { value: 'actual', label: 'Actual' },
  { value: 'hood', label: 'Hood' },
  { value: 'dualG', label: 'Dual G' },
  { value: 'xc', label: 'XC' },
  { value: 'dayLandings', label: 'Day Landings' },
  { value: 'nightLandings', label: 'Night Landings' },
  { value: 'approach', label: 'Approach' },
  { value: 'pilots', label: 'Pilots' },
  { value: 'total', label: 'Total' },
]

const currentValue = computed({
  get: () => props.column.fieldKey ?? '',
  set: (val: LogbookColumnKey | '') => {
    const fieldKey = val === '' ? null : val
    const label = val === '' ? 'Notes' : (FIELD_OPTIONS.find((o) => o.value === val)?.label ?? props.column.label)
    emit('update', props.column, { fieldKey, label })
  },
})

const isNumeric = computed(() => {
  const k = props.column.fieldKey
  return k != null && ['pic','sic','dualR','solo','night','actual','hood','dualG','xc','dayLandings','nightLandings','approach','total'].includes(k)
})
</script>

<template>
  <div class="flex flex-col gap-0.5">
    <select
      :value="currentValue"
      class="w-full max-w-[140px] rounded border-0 bg-transparent py-0.5 text-xs font-semibold uppercase tracking-wider text-gray-600 focus:ring-1 focus:ring-blue-500 dark:text-gray-400"
      :class="isNumeric ? 'text-right' : ''"
      @change="currentValue = ($event.target as HTMLSelectElement).value as LogbookColumnKey | ''"
    >
      <option v-for="opt in FIELD_OPTIONS" :key="opt.value || 'none'" :value="opt.value">
        {{ opt.label }}
      </option>
    </select>
  </div>
</template>
