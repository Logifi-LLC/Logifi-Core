<script lang="ts">
import { defineComponent, computed, ref } from 'vue'
import type { LogbookColumnKey } from '~/utils/logbookTypes'
import { CATEGORY_CLASS_OPTIONS, ROLE_OPTIONS } from '~/utils/logbookBuilderTypes'

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
    /** When fieldKey is role, default role to show when cell is empty. */
    defaultRole: { type: String, default: null },
    /** When fieldKey is identification (or aircraft), suggestions from other cells on the page. */
    suggestions: { type: Array as () => string[], default: () => [] },
    disabled: { type: Boolean, default: false },
    builderRow: { type: Number, default: undefined },
    builderCol: { type: Number, default: undefined },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const inputRef = ref<HTMLInputElement | null>(null)
    const selectRef = ref<HTMLSelectElement | null>(null)
    const roleSelectRef = ref<HTMLSelectElement | null>(null)
    const isNumeric = computed(() =>
      props.fieldKey != null && numericKeys.includes(props.fieldKey as LogbookColumnKey)
    )
    const isRole = computed(() => props.fieldKey === 'role')
    const isCategoryClass = computed(() => props.fieldKey === 'categoryClass')
    const isCategoryClassTimeColumn = computed(() => props.fieldKey === 'categoryClass' && props.categoryClassValue != null)
    const roleDisplayValue = computed(() => (props.modelValue || props.defaultRole || 'PIC').trim() || 'PIC')
    const inputClass = computed(() => {
      const base = 'w-full min-w-0 border-0 bg-transparent px-1.5 py-0.5 text-center text-sm font-quicksand outline-none min-h-[1.75rem] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:bg-blue-50 focus:dark:bg-blue-900/20 focus:ring-1 focus:ring-inset focus:ring-blue-500'
      const mono = (isNumeric.value || isCategoryClassTimeColumn.value) ? 'font-mono' : ''
      return `${base} ${mono}`
    })
    const selectClass = computed(() => {
      return 'w-full min-w-0 border-0 bg-transparent px-1.5 py-0.5 text-center text-sm font-quicksand outline-none min-h-[1.75rem] text-gray-900 dark:text-gray-100 focus:bg-blue-50 focus:dark:bg-blue-900/20 focus:ring-1 focus:ring-inset focus:ring-blue-500 dark:bg-transparent'
    })
    function focus() {
      if (isRole.value) roleSelectRef.value?.focus()
      else if (isCategoryClass.value && !isCategoryClassTimeColumn.value) selectRef.value?.focus()
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
      roleSelectRef,
      inputClass,
      selectClass,
      isRole,
      isCategoryClass,
      isCategoryClassTimeColumn,
      roleDisplayValue,
      categoryClassOptions: CATEGORY_CLASS_OPTIONS,
      roleOptions: ROLE_OPTIONS,
      focus,
      onInput,
      onSelectChange,
    }
  },
})
</script>

<template>
  <select
    v-if="isRole"
    ref="roleSelectRef"
    :value="roleDisplayValue"
    :class="selectClass"
    :disabled="disabled"
    :data-builder-row="builderRow"
    :data-builder-col="builderCol"
    @change="onSelectChange($event)"
  >
    <option v-for="opt in roleOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
  </select>
  <select
    v-else-if="isCategoryClass && !isCategoryClassTimeColumn"
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
  <template v-else>
    <input
    ref="inputRef"
    :value="modelValue"
    type="text"
    :class="inputClass"
    :disabled="disabled"
    :data-builder-row="builderRow"
    :data-builder-col="builderCol"
    :list="(fieldKey === 'identification' && suggestions.length) ? `ident-list-${builderRow}-${builderCol}` : undefined"
    :placeholder="fieldKey === 'date' ? 'MM/DD' : undefined"
    @input="onInput($event)"
  />
    <datalist
      v-if="fieldKey === 'identification' && suggestions.length"
      :id="`ident-list-${builderRow}-${builderCol}`"
    >
      <option v-for="s in suggestions" :key="s" :value="s" />
    </datalist>
  </template>
</template>
