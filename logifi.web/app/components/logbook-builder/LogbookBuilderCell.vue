<script lang="ts">
import { defineComponent, computed, ref } from 'vue'
import type { LogbookColumnKey } from '~/utils/logbookTypes'
import { CATEGORY_CLASS_OPTIONS, ROLE_OPTIONS, APPROACH_TYPE_OPTIONS, PILOT_ROLE_OPTIONS } from '~/utils/logbookBuilderTypes'
import { useTheme } from '~/composables/useTheme'

const numericKeys: LogbookColumnKey[] = [
  'pic', 'sic', 'dualR', 'solo', 'night', 'actual', 'hood', 'dualG', 'xc',
  'dayLandings', 'nightLandings', 'approach', 'total',
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
  emits: ['update:modelValue', 'focus', 'blur'],
  setup(props, { emit }) {
    const inputRef = ref<HTMLInputElement | null>(null)
    const selectRef = ref<HTMLSelectElement | null>(null)
    const roleSelectRef = ref<HTMLSelectElement | null>(null)
    const overwriteOnNextKey = ref(false)
    const isNumeric = computed(() =>
      props.fieldKey != null && numericKeys.includes(props.fieldKey as LogbookColumnKey)
    )
    const isRole = computed(() => props.fieldKey === 'role')
    const isCategoryClass = computed(() => props.fieldKey === 'categoryClass')
    const isCategoryClassTimeColumn = computed(() => props.fieldKey === 'categoryClass' && props.categoryClassValue != null)
    const isApproachType = computed(() => props.fieldKey === 'approachType')
    const isPilotRole = computed(() => props.fieldKey === 'pilotRole')
    const roleDisplayValue = computed(() => (props.modelValue || props.defaultRole || 'PIC').trim() || 'PIC')
    const { isDark } = useTheme()
    
    const inputClass = computed(() => {
      const colors = isDark.value
        ? 'text-gray-100 placeholder-gray-500 focus:bg-white/5 focus:shadow-inner'
        : 'text-gray-900 placeholder-gray-400 focus:bg-blue-50'
      const base = `w-full min-w-0 border-0 bg-transparent px-1.5 py-0.5 text-center text-sm font-quicksand outline-none min-h-[1.75rem] focus:ring-1 focus:ring-inset focus:ring-blue-500 ${colors}`
      const mono = (isNumeric.value || isCategoryClassTimeColumn.value) ? 'font-mono' : ''
      return `${base} ${mono}`
    })
    const selectClass = computed(() => {
      const colors = isDark.value
        ? 'text-gray-100 focus:bg-white/5 focus:shadow-inner bg-transparent'
        : 'text-gray-900 focus:bg-blue-50'
      return `w-full min-w-0 border-0 bg-transparent px-1.5 py-0.5 text-center text-sm font-quicksand outline-none min-h-[1.75rem] focus:ring-1 focus:ring-inset focus:ring-blue-500 ${colors}`
    })

    const listId = computed(() => {
      if (!props.suggestions || !props.suggestions.length) return undefined
      if (props.fieldKey === 'identification' || props.fieldKey === 'pilots') {
        return `suggestions-${props.fieldKey}-${props.builderRow}-${props.builderCol}`
      }
      return undefined
    })
    function focus() {
      if (isRole.value) roleSelectRef.value?.focus()
      else if (isCategoryClass.value && !isCategoryClassTimeColumn.value) selectRef.value?.focus()
      else if (isApproachType.value) selectRef.value?.focus()
      else if (isPilotRole.value) selectRef.value?.focus()
      else inputRef.value?.focus()
    }
    function onInput(e: Event) {
      emit('update:modelValue', (e.target as HTMLInputElement).value)
    }
    function onInputKeydown(e: KeyboardEvent) {
      // Excel-like overwrite: first printable key after focus replaces the whole cell.
      if (!overwriteOnNextKey.value) return

      const key = e.key

      if (key === 'Backspace' || key === 'Delete') {
        e.preventDefault()
        emit('update:modelValue', '')
        if (inputRef.value) inputRef.value.value = ''
        // Keep overwrite flag so the next printable key starts fresh.
        return
      }

      // Ignore control/navigation keys.
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        key.length !== 1 // non-printable (e.g. ArrowUp, Enter)
      ) {
        return
      }

      e.preventDefault()
      emit('update:modelValue', key)
      if (inputRef.value) inputRef.value.value = key
      overwriteOnNextKey.value = false
    }
    function onInputFocus() {
      overwriteOnNextKey.value = true
      emit('focus')
    }
    function onInputBlur() {
      overwriteOnNextKey.value = false

      if (props.fieldKey === 'pilots') {
        const normalized = (props.modelValue || '').trim()
        if (normalized !== props.modelValue) {
          emit('update:modelValue', normalized)
          if (inputRef.value) inputRef.value.value = normalized
        }
      }

      emit('blur')
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
      listId,
      isRole,
      isCategoryClass,
      isCategoryClassTimeColumn,
      isApproachType,
      isPilotRole,
      roleDisplayValue,
      categoryClassOptions: CATEGORY_CLASS_OPTIONS,
      roleOptions: ROLE_OPTIONS,
      approachTypeOptions: APPROACH_TYPE_OPTIONS,
      pilotRoleOptions: PILOT_ROLE_OPTIONS,
      focus,
      onInput,
      onSelectChange,
      onInputKeydown,
      onInputFocus,
      onInputBlur,
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
    @focus="$emit('focus')"
    @blur="$emit('blur')"
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
    @focus="$emit('focus')"
    @blur="$emit('blur')"
    @change="onSelectChange($event)"
  >
    <option value="">—</option>
    <option v-for="opt in categoryClassOptions" :key="opt" :value="opt">{{ opt }}</option>
  </select>
  <select
    v-else-if="isApproachType"
    ref="selectRef"
    :value="modelValue"
    :class="selectClass"
    :disabled="disabled"
    :data-builder-row="builderRow"
    :data-builder-col="builderCol"
    @focus="$emit('focus')"
    @blur="$emit('blur')"
    @change="onSelectChange($event)"
  >
    <option value="">—</option>
    <option v-for="opt in approachTypeOptions" :key="opt" :value="opt">{{ opt }}</option>
  </select>
  <select
    v-else-if="isPilotRole"
    ref="selectRef"
    :value="modelValue"
    :class="selectClass"
    :disabled="disabled"
    :data-builder-row="builderRow"
    :data-builder-col="builderCol"
    @focus="$emit('focus')"
    @blur="$emit('blur')"
    @change="onSelectChange($event)"
  >
    <option v-for="opt in pilotRoleOptions" :key="opt.value || 'empty'" :value="opt.value">{{ opt.label }}</option>
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
      :list="listId"
      :placeholder="fieldKey === 'date' ? 'MM/DD' : undefined"
      @focus="onInputFocus"
      @blur="onInputBlur"
      @keydown="onInputKeydown"
      @input="onInput($event)"
    />
    <datalist
      v-if="listId"
      :id="listId"
    >
      <option v-for="s in suggestions" :key="s" :value="s" />
    </datalist>
  </template>
</template>
