<script lang="ts">
import { defineComponent, computed, ref } from 'vue'
import type { LogbookColumnKey } from '~/utils/logbookTypes'
import { CATEGORY_CLASS_OPTIONS } from '~/utils/logbookBuilderTypes'

const numericKeys: LogbookColumnKey[] = [
  'pic', 'sic', 'dualR', 'solo', 'night', 'actual', 'hood', 'dualG', 'xc',
  'dayLandings', 'nightLandings', 'approach', 'total'
]

export default defineComponent({
  name: 'LogbookBuilderCell',
  props: {
    modelValue: { type: String, default: '' },
    fieldKey: { type: String as () => LogbookColumnKey | null, default: null },
    /** When fieldKey is categoryClass, specific category (ASEL, etc.) makes this cell a time input. */
    categoryClassValue: { type: String, default: null },
    disabled: { type: Boolean, default: false },
    builderRow: { type: Number, default: undefined },
    builderCol: { type: Number, default: undefined },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const inputRef = ref<HTMLInputElement | null>(null)
    const selectRef = ref<HTMLSelectElement | null>(null)
    const isNumeric = computed(() =>
      props.fieldKey != null && numericKeys.includes(props.fieldKey as LogbookColumnKey)
    )
    const isCategoryClass = computed(() => props.fieldKey === 'categoryClass')
    const isCategoryClassTimeColumn = computed(() => props.fieldKey === 'categoryClass' && props.categoryClassValue != null)
    const inputClass = computed(() => {
      const base = 'w-full min-w-0 border-0 bg-transparent px-1.5 py-0.5 text-sm font-quicksand outline-none min-h-[1.75rem] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:bg-blue-50 focus:dark:bg-blue-900/20 focus:ring-1 focus:ring-inset focus:ring-blue-500'
      const align = (isNumeric.value || isCategoryClassTimeColumn.value) ? 'text-right font-mono' : ''
      return `${base} ${align}`
    })
    const selectClass = computed(() => {
      const base = 'w-full min-w-0 border-0 bg-transparent px-1.5 py-0.5 text-sm font-quicksand outline-none min-h-[1.75rem] text-gray-900 dark:text-gray-100 focus:bg-blue-50 focus:dark:bg-blue-900/20 focus:ring-1 focus:ring-inset focus:ring-blue-500 dark:bg-transparent'
      return base
    })
    function focus() {
      if (isCategoryClass.value && !isCategoryClassTimeColumn.value) selectRef.value?.focus()
      else inputRef.value?.focus()
    }
    function onInput(e: Event) {
      emit('update:modelValue', (e.target as HTMLInputElement).value)
    }
    function onSelectChange(e: Event) {
      emit('update:modelValue', (e.target as HTMLSelectElement).value)
    }
    return {
      inputRef,
      selectRef,
      inputClass,
      selectClass,
      isCategoryClass,
      isCategoryClassTimeColumn,
      categoryClassOptions: CATEGORY_CLASS_OPTIONS,
      focus,
      onInput,
      onSelectChange,
    }
  },
})
</script>

<template>
  <select
    v-if="isCategoryClass && !isCategoryClassTimeColumn"
    ref="selectRef"
    :value="modelValue"
    :class="selectClass"
    :disabled="disabled"
    :data-builder-row="builderRow"
    :data-builder-col="builderCol"
    @change="onSelectChange($event)"
  >
    <option value="">—</option>
    <option v-for="opt in categoryClassOptions" :key="opt" :value="opt">{{ opt }}</option>
  </select>
  <input
    v-else
    ref="inputRef"
    :value="modelValue"
    type="text"
    :class="inputClass"
    :disabled="disabled"
    :data-builder-row="builderRow"
    :data-builder-col="builderCol"
    @input="onInput($event)"
  />
</template>
