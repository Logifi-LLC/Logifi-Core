<script lang="ts">
import { defineComponent, computed, ref, watch, nextTick } from 'vue'
import type { LogbookColumnKey } from '~/utils/logbookTypes'
import {
  CATEGORY_CLASS_OPTIONS,
  ROLE_OPTIONS,
  APPROACH_TYPE_OPTIONS,
  PILOT_ROLE_OPTIONS,
} from '~/utils/logbookBuilderTypes'
import { filterPilotSuggestions, handlePilotSuggestKeydown } from '~/utils/pilotNameSuggest'
import { shouldDeferGridKeydown as shouldDeferGridKeydownUtil } from '~/utils/logbookBuilderGridKeys'
import { useTheme } from '~/composables/useTheme'

const numericKeys: LogbookColumnKey[] = [
  'pic', 'sic', 'dualR', 'solo', 'night', 'nvg', 'actual', 'hood', 'dualG', 'xc',
  'dayLandings', 'nightLandings', 'approach', 'total',
]

export default defineComponent({
  name: 'LogbookBuilderCell',
  props: {
    modelValue: { type: String, default: '' },
    fieldKey: { type: String as () => LogbookColumnKey | null, default: null },
    categoryClassValue: { type: String, default: null },
    defaultRole: { type: String, default: null },
    suggestions: { type: Array as () => string[], default: () => [] },
    disabled: { type: Boolean, default: false },
    builderRow: { type: Number, default: undefined },
    builderCol: { type: Number, default: undefined },
    isEditing: { type: Boolean, default: false },
  },
  emits: ['update:modelValue', 'focus', 'blur', 'dropdown-commit'],
  setup(props, { emit }) {
    const inputRef = ref<HTMLInputElement | null>(null)
    const textareaRef = ref<HTMLTextAreaElement | null>(null)
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
    const isPilots = computed(() => props.fieldKey === 'pilots')
    const isRemarks = computed(() => props.fieldKey === 'remarks')
    const roleDisplayValue = computed(() => (props.modelValue || props.defaultRole || 'PIC').trim() || 'PIC')
    const { isDark } = useTheme()

    const showPilotDropdown = ref(false)
    const highlightedPilotIndex = ref(-1)
    const pilotMenuPosition = ref({ top: 0, left: 0, width: 120 })
    let pilotBlurTimer: ReturnType<typeof setTimeout> | null = null

    const filteredPilotSuggestions = computed(() =>
      filterPilotSuggestions(props.suggestions ?? [], props.modelValue ?? '')
    )

    watch(
      () => props.isEditing,
      (editing) => {
        if (!editing) {
          showPilotDropdown.value = false
          highlightedPilotIndex.value = -1
        }
      }
    )

    function updatePilotMenuPosition() {
      const el = inputRef.value
      if (!el) return
      const rect = el.getBoundingClientRect()
      pilotMenuPosition.value = {
        top: rect.bottom + 2,
        left: rect.left,
        width: Math.max(rect.width, 120),
      }
    }

    function openPilotDropdown() {
      if (!props.isEditing || filteredPilotSuggestions.value.length === 0) return
      showPilotDropdown.value = true
      highlightedPilotIndex.value = filteredPilotSuggestions.value.length > 0 ? 0 : -1
      nextTick(() => updatePilotMenuPosition())
    }

    function selectPilotName(name: string) {
      emit('update:modelValue', name)
      if (inputRef.value) inputRef.value.value = name
      showPilotDropdown.value = false
      highlightedPilotIndex.value = -1
    }

    function getTextControl(): HTMLInputElement | HTMLTextAreaElement | null {
      return isRemarks.value ? textareaRef.value : inputRef.value
    }

    const inputClass = computed(() => {
      const colors = isDark.value
        ? 'text-gray-100 placeholder-gray-500'
        : 'text-gray-900 placeholder-gray-400'
      const align = isRemarks.value ? 'text-left whitespace-pre-wrap resize-none' : 'text-center'
      const minH = isRemarks.value ? 'min-h-[2.75rem]' : 'min-h-[1.75rem]'
      const base = `block h-full w-full min-w-0 border-0 bg-transparent px-1.5 py-0.5 text-sm font-quicksand outline-none ${minH} ${align} ${colors}`
      const mono = (isNumeric.value || isCategoryClassTimeColumn.value) ? 'font-mono' : ''
      return `${base} ${mono}`
    })
    const selectClass = computed(() => {
      const colors = isDark.value ? 'text-gray-100' : 'text-gray-900'
      return `block h-full w-full min-w-0 border-0 bg-transparent px-1.5 py-0.5 text-center text-sm font-quicksand outline-none min-h-[1.75rem] ${colors}`
    })

    const listId = computed(() => {
      if (!props.suggestions || !props.suggestions.length) return undefined
      if (props.fieldKey === 'identification') {
        return `suggestions-${props.fieldKey}-${props.builderRow}-${props.builderCol}`
      }
      return undefined
    })

    function focusControl() {
      if (isRole.value) roleSelectRef.value?.focus()
      else if (isCategoryClass.value && !isCategoryClassTimeColumn.value) selectRef.value?.focus()
      else if (isApproachType.value) selectRef.value?.focus()
      else if (isPilotRole.value) selectRef.value?.focus()
      else getTextControl()?.focus()
    }

    function blurControl() {
      if (isRole.value) roleSelectRef.value?.blur()
      else if (isCategoryClass.value && !isCategoryClassTimeColumn.value) selectRef.value?.blur()
      else if (isApproachType.value) selectRef.value?.blur()
      else if (isPilotRole.value) selectRef.value?.blur()
      else getTextControl()?.blur()
    }

    /** Excel F2 / double-click: edit in place; caret at end for small corrections. */
    function beginEdit(options: { overwrite: boolean }) {
      overwriteOnNextKey.value = options.overwrite
      focusControl()
      if (!options.overwrite) {
        const control = getTextControl()
        if (control) {
          const len = control.value.length
          control.setSelectionRange(len, len)
        }
      }
    }

    function commitEdit() {
      overwriteOnNextKey.value = false
      blurControl()
    }

    function cancelEdit(restoreValue: string) {
      overwriteOnNextKey.value = false
      emit('update:modelValue', restoreValue)
      const control = getTextControl()
      if (control) control.value = restoreValue
      blurControl()
    }

    function getInputElement(): HTMLInputElement | HTMLTextAreaElement | null {
      return getTextControl()
    }

    function getSelectElement(): HTMLSelectElement | null {
      return roleSelectRef.value ?? selectRef.value ?? null
    }

    function onInput(e: Event) {
      emit('update:modelValue', (e.target as HTMLInputElement | HTMLTextAreaElement).value)
    }

    function onInputKeydown(e: KeyboardEvent) {
      if (!overwriteOnNextKey.value) return

      const key = e.key

      if (key === 'Backspace' || key === 'Delete') {
        e.preventDefault()
        emit('update:modelValue', '')
        const control = getTextControl()
        if (control) control.value = ''
        return
      }

      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        key.length !== 1
      ) {
        return
      }

      e.preventDefault()
      emit('update:modelValue', key)
      const control = getTextControl()
      if (control) control.value = key
      overwriteOnNextKey.value = false
    }

    function onInputFocus() {
      emit('focus')
    }

    function onPilotFocus() {
      if (pilotBlurTimer) {
        clearTimeout(pilotBlurTimer)
        pilotBlurTimer = null
      }
      emit('focus')
      openPilotDropdown()
    }

    function onPilotInput(e: Event) {
      onInput(e)
      openPilotDropdown()
    }

    function onPilotKeydown(e: KeyboardEvent) {
      if (showPilotDropdown.value && filteredPilotSuggestions.value.length > 0) {
        const result = handlePilotSuggestKeydown({
          key: e.key,
          items: filteredPilotSuggestions.value,
          highlightIndex: highlightedPilotIndex.value,
        })
        if (result.type === 'prevent') {
          e.preventDefault()
          highlightedPilotIndex.value = result.highlightIndex
          return
        }
        if (result.type === 'select') {
          e.preventDefault()
          selectPilotName(result.value)
          emit('dropdown-commit')
          return
        }
        if (result.type === 'close') {
          e.preventDefault()
          showPilotDropdown.value = false
          highlightedPilotIndex.value = -1
          return
        }
      }
      onInputKeydown(e)
    }

    function onPilotBlur() {
      overwriteOnNextKey.value = false
      pilotBlurTimer = setTimeout(() => {
        showPilotDropdown.value = false
        highlightedPilotIndex.value = -1
        const normalized = (props.modelValue || '').trim()
        if (normalized !== props.modelValue) {
          emit('update:modelValue', normalized)
          if (inputRef.value) inputRef.value.value = normalized
        }
        emit('blur')
        pilotBlurTimer = null
      }, 150)
    }

    function onInputBlur() {
      overwriteOnNextKey.value = false
      emit('blur')
    }

    function onSelectChange(e: Event) {
      emit('update:modelValue', (e.target as HTMLSelectElement).value)
    }

    function shouldDeferGridKeydown(e: KeyboardEvent): boolean {
      const sel = getSelectElement()
      const isSelectFocused = sel != null && document.activeElement === sel
      return shouldDeferGridKeydownUtil({
        fieldKey: props.fieldKey,
        key: e.key,
        isSelectFocused,
        pilotMenuOpen: showPilotDropdown.value,
        pilotHighlightIndex: highlightedPilotIndex.value,
      })
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
      isPilots,
      isRemarks,
      textareaRef,
      isDark,
      showPilotDropdown,
      highlightedPilotIndex,
      pilotMenuPosition,
      filteredPilotSuggestions,
      selectPilotName,
      roleDisplayValue,
      categoryClassOptions: CATEGORY_CLASS_OPTIONS,
      roleOptions: ROLE_OPTIONS,
      approachTypeOptions: APPROACH_TYPE_OPTIONS,
      pilotRoleOptions: PILOT_ROLE_OPTIONS,
      focus: focusControl,
      beginEdit,
      commitEdit,
      cancelEdit,
      getInputElement,
      getSelectElement,
      shouldDeferGridKeydown,
      onInput,
      onSelectChange,
      onInputKeydown,
      onInputFocus,
      onInputBlur,
      onPilotFocus,
      onPilotInput,
      onPilotKeydown,
      onPilotBlur,
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
    :tabindex="isEditing ? 0 : -1"
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
    :tabindex="isEditing ? 0 : -1"
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
    :tabindex="isEditing ? 0 : -1"
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
    :tabindex="isEditing ? 0 : -1"
    :data-builder-row="builderRow"
    :data-builder-col="builderCol"
    @focus="$emit('focus')"
    @blur="$emit('blur')"
    @change="onSelectChange($event)"
  >
    <option v-for="opt in pilotRoleOptions" :key="opt.value || 'empty'" :value="opt.value">{{ opt.label }}</option>
  </select>
  <div
    v-else-if="isPilots"
    class="relative h-full w-full min-w-0"
  >
    <input
      ref="inputRef"
      :value="modelValue"
      type="text"
      autocomplete="off"
      :class="inputClass"
      :disabled="disabled"
      :readonly="!isEditing"
      :tabindex="isEditing ? 0 : -1"
      :data-builder-row="builderRow"
      :data-builder-col="builderCol"
      placeholder="Pilot name"
      @focus="onPilotFocus"
      @blur="onPilotBlur"
      @keydown="onPilotKeydown"
      @input="onPilotInput($event)"
    />
    <Teleport to="body">
      <div
        v-if="showPilotDropdown && isEditing && filteredPilotSuggestions.length > 0"
        class="fixed z-[100] max-h-48 overflow-y-auto rounded border shadow-lg font-quicksand text-sm"
        :class="isDark ? 'border-white/10 bg-gray-900 text-gray-100' : 'border-gray-200 bg-white text-gray-900'"
        :style="{
          top: pilotMenuPosition.top + 'px',
          left: pilotMenuPosition.left + 'px',
          width: pilotMenuPosition.width + 'px',
        }"
        data-builder-pilot-dropdown
      >
        <button
          v-for="(pilot, index) in filteredPilotSuggestions"
          :key="pilot"
          type="button"
          :data-index="index"
          class="w-full px-3 py-2 text-left text-sm transition-colors"
          :class="
            highlightedPilotIndex === index
              ? (isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
              : (isDark ? 'text-gray-100 hover:bg-white/10' : 'text-gray-900 hover:bg-gray-100')
          "
          @mousedown.prevent="selectPilotName(pilot)"
        >
          {{ pilot }}
        </button>
      </div>
    </Teleport>
  </div>
  <textarea
    v-else-if="isRemarks"
    ref="textareaRef"
    :value="modelValue"
    rows="2"
    :class="inputClass"
    :disabled="disabled"
    :readonly="!isEditing"
    :tabindex="isEditing ? 0 : -1"
    :data-builder-row="builderRow"
    :data-builder-col="builderCol"
    @focus="onInputFocus"
    @blur="onInputBlur"
    @keydown="onInputKeydown"
    @input="onInput($event)"
  />
  <template v-else>
    <input
      ref="inputRef"
      :value="modelValue"
      type="text"
      :class="inputClass"
      :disabled="disabled"
      :readonly="!isEditing"
      :tabindex="isEditing ? 0 : -1"
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
