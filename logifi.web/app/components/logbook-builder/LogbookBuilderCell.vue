<script lang="ts">
import { defineComponent, computed, ref } from 'vue'
import type { LogbookColumnKey } from '~/utils/logbookTypes'

const numericKeys: LogbookColumnKey[] = [
  'pic', 'sic', 'dualR', 'solo', 'night', 'actual', 'hood', 'dualG', 'xc',
  'dayLandings', 'nightLandings', 'approach', 'total'
]

export default defineComponent({
  name: 'LogbookBuilderCell',
  props: {
    modelValue: { type: String, default: '' },
    fieldKey: { type: String as () => LogbookColumnKey | null, default: null },
    disabled: { type: Boolean, default: false },
    builderRow: { type: Number, default: undefined },
    builderCol: { type: Number, default: undefined },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const inputRef = ref<HTMLInputElement | null>(null)
    const isNumeric = computed(() =>
      props.fieldKey != null && numericKeys.includes(props.fieldKey as LogbookColumnKey)
    )
    const inputClass = computed(() => {
      const base = 'w-full min-w-0 border-0 bg-transparent px-1.5 py-0.5 text-sm font-quicksand outline-none min-h-[1.75rem] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:bg-blue-50 focus:dark:bg-blue-900/20 focus:ring-1 focus:ring-inset focus:ring-blue-500'
      const align = isNumeric.value ? 'text-right font-mono' : ''
      return `${base} ${align}`
    })
    function focus() {
      inputRef.value?.focus()
    }
    function onInput(e: Event) {
      emit('update:modelValue', (e.target as HTMLInputElement).value)
    }
    return { inputRef, inputClass, focus, onInput }
  },
})
</script>

<template>
  <input
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
