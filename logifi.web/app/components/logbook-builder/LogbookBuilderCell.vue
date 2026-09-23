<script lang="ts">
import { defineComponent, computed, ref, watch, nextTick, onBeforeUnmount } from 'vue'
import type { LogbookColumnKey } from '~/utils/logbookTypes'
import {
  CATEGORY_CLASS_OPTIONS,
  ROLE_OPTIONS,
  APPROACH_TYPE_OPTIONS,
  PILOT_ROLE_OPTIONS,
} from '~/utils/logbookBuilderTypes'
import {
  filterPilotSuggestions,
  filterLabelValueSuggestions,
  handlePilotSuggestKeydown,
} from '~/utils/pilotNameSuggest'
import {
  computeTypeaheadMenuPosition,
  scrollTypeaheadAnchorIntoView,
} from '~/utils/typeaheadMenuPosition'
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
    rowLock: { type: Boolean, default: false },
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

    const showTypeaheadDropdown = ref(false)
    const highlightedTypeaheadIndex = ref(-1)
    const typeaheadMenuPosition = ref({
      top: 0,
      left: 0,
      width: 120,
      maxHeight: 192,
      placement: 'below' as 'above' | 'below',
    })
    let typeaheadBlurTimer: ReturnType<typeof setTimeout> | null = null
    let typeaheadRepositionHandler: (() => void) | null = null

    const isTypeaheadField = computed(() => isPilots.value || isPilotRole.value)

    const filteredTypeaheadSuggestions = computed((): string[] => {
      if (isPilots.value) {
        return filterPilotSuggestions(props.suggestions ?? [], props.modelValue ?? '')
      }
      if (isPilotRole.value) {
        return filterLabelValueSuggestions(PILOT_ROLE_OPTIONS, props.modelValue ?? '').map(
          (opt) => opt.value
        )
      }
      return []
    })

    function typeaheadSuggestionLabel(value: string): string {
      if (!isPilotRole.value) return value
      const opt = PILOT_ROLE_OPTIONS.find((o) => o.value === value)
      return opt?.label ?? value
    }

    watch(
      () => props.isEditing,
      (editing) => {
        if (!editing) {
          detachTypeaheadViewportListeners()
          showTypeaheadDropdown.value = false
          highlightedTypeaheadIndex.value = -1
        }
      }
    )

    function detachTypeaheadViewportListeners() {
      if (!typeaheadRepositionHandler) return
      const onReposition = typeaheadRepositionHandler
      const vv = window.visualViewport
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
      vv?.removeEventListener('resize', onReposition)
      vv?.removeEventListener('scroll', onReposition)
      typeaheadRepositionHandler = null
    }

    function attachTypeaheadViewportListeners(onReposition: () => void) {
      detachTypeaheadViewportListeners()
      const vv = window.visualViewport
      window.addEventListener('resize', onReposition)
      window.addEventListener('scroll', onReposition, true)
      vv?.addEventListener('resize', onReposition)
      vv?.addEventListener('scroll', onReposition)
      typeaheadRepositionHandler = onReposition
    }

    function updateTypeaheadMenuPosition() {
      const el = inputRef.value
      if (!el) return
      typeaheadMenuPosition.value = computeTypeaheadMenuPosition(el)
    }

    function openTypeaheadDropdown() {
      if (!props.isEditing || filteredTypeaheadSuggestions.value.length === 0) return
      showTypeaheadDropdown.value = true
      highlightedTypeaheadIndex.value =
        filteredTypeaheadSuggestions.value.length > 0 ? 0 : -1
      nextTick(() => {
        const el = inputRef.value
        if (el) scrollTypeaheadAnchorIntoView(el)
        updateTypeaheadMenuPosition()
        attachTypeaheadViewportListeners(() => updateTypeaheadMenuPosition())
      })
    }

    function selectTypeaheadValue(value: string) {
      emit('update:modelValue', value)
      if (inputRef.value) inputRef.value.value = value
      showTypeaheadDropdown.value = false
      highlightedTypeaheadIndex.value = -1
      detachTypeaheadViewportListeners()
    }

    onBeforeUnmount(() => {
      detachTypeaheadViewportListeners()
      if (typeaheadBlurTimer) clearTimeout(typeaheadBlurTimer)
    })

    function getTextControl(): HTMLInputElement | HTMLTextAreaElement | null {
      return isRemarks.value ? textareaRef.value : inputRef.value
    }

    const inputClass = computed(() => {
      const colors = isDark.value
        ? 'text-gray-100 placeholder-gray-500'
        : 'text-gray-900 placeholder-gray-400'
      const align = isRemarks.value ? 'text-left whitespace-pre-wrap resize-none' : 'text-center'
      const minH = isRemarks.value ? 'min-h-[2.75rem]' : 'min-h-[1.75rem]'
      const rowLockClass =
        props.rowLock && isRemarks.value
          ? 'max-h-[4.5rem] overflow-y-auto resize-none'
          : props.rowLock
            ? 'overflow-hidden text-ellipsis'
            : ''
      const base = `block h-full w-full min-w-0 border-0 bg-transparent px-1.5 py-0.5 text-sm font-quicksand outline-none ${minH} ${align} ${colors} ${rowLockClass}`
      const mono = (isNumeric.value || isCategoryClassTimeColumn.value) ? 'font-mono' : ''
      return `${base} ${mono}`
    })
    const selectClass = computed(() => {
      const colors = isDark.value ? 'text-gray-100' : 'text-gray-900'
      return `block h-full w-full min-w-0 border-0 bg-transparent px-1.5 py-0.5 text-center text-sm font-quicksand outline-none min-h-[1.75rem] ${colors}`
    })

    const listId = computed(() => {
      if (!props.suggestions || !props.suggestions.length) return undefined
      if (
        props.fieldKey === 'identification' ||
        props.fieldKey === 'departure' ||
        props.fieldKey === 'destination' ||
        props.fieldKey === 'route'
      ) {
        return `suggestions-${props.fieldKey}-${props.builderRow}-${props.builderCol}`
      }
      return undefined
    })

    function focusControl() {
      if (isRole.value) roleSelectRef.value?.focus()
      else if (isCategoryClass.value && !isCategoryClassTimeColumn.value) selectRef.value?.focus()
      else if (isApproachType.value) selectRef.value?.focus()
      else getTextControl()?.focus()
    }

    function blurControl() {
      if (isRole.value) roleSelectRef.value?.blur()
      else if (isCategoryClass.value && !isCategoryClassTimeColumn.value) selectRef.value?.blur()
      else if (isApproachType.value) selectRef.value?.blur()
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

    function onTypeaheadFocus() {
      if (typeaheadBlurTimer) {
        clearTimeout(typeaheadBlurTimer)
        typeaheadBlurTimer = null
      }
      emit('focus')
      openTypeaheadDropdown()
    }

    function onTypeaheadInput(e: Event) {
      onInput(e)
      openTypeaheadDropdown()
    }

    function onTypeaheadKeydown(e: KeyboardEvent) {
      if (showTypeaheadDropdown.value && filteredTypeaheadSuggestions.value.length > 0) {
        const result = handlePilotSuggestKeydown({
          key: e.key,
          items: filteredTypeaheadSuggestions.value,
          highlightIndex: highlightedTypeaheadIndex.value,
        })
        if (result.type === 'prevent') {
          e.preventDefault()
          highlightedTypeaheadIndex.value = result.highlightIndex
          return
        }
        if (result.type === 'select') {
          e.preventDefault()
          selectTypeaheadValue(result.value)
          emit('dropdown-commit')
          return
        }
        if (result.type === 'close') {
          e.preventDefault()
          showTypeaheadDropdown.value = false
          highlightedTypeaheadIndex.value = -1
          detachTypeaheadViewportListeners()
          return
        }
      }
      onInputKeydown(e)
    }

    function onTypeaheadBlur() {
      overwriteOnNextKey.value = false
      typeaheadBlurTimer = setTimeout(() => {
        showTypeaheadDropdown.value = false
        highlightedTypeaheadIndex.value = -1
        detachTypeaheadViewportListeners()
        const normalized = (props.modelValue || '').trim()
        if (normalized !== props.modelValue) {
          emit('update:modelValue', normalized)
          if (inputRef.value) inputRef.value.value = normalized
        }
        emit('blur')
        typeaheadBlurTimer = null
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
        pilotMenuOpen: showTypeaheadDropdown.value,
        pilotHighlightIndex: highlightedTypeaheadIndex.value,
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
      isTypeaheadField,
      showTypeaheadDropdown,
      highlightedTypeaheadIndex,
      typeaheadMenuPosition,
      filteredTypeaheadSuggestions,
      typeaheadSuggestionLabel,
      selectTypeaheadValue,
      roleDisplayValue,
      categoryClassOptions: CATEGORY_CLASS_OPTIONS,
      roleOptions: ROLE_OPTIONS,
      approachTypeOptions: APPROACH_TYPE_OPTIONS,
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
      onTypeaheadFocus,
      onTypeaheadInput,
      onTypeaheadKeydown,
      onTypeaheadBlur,
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
  <div
    v-else-if="isTypeaheadField"
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
      :placeholder="isPilotRole ? 'Pilot role' : 'Pilot name'"
      @focus="onTypeaheadFocus"
      @blur="onTypeaheadBlur"
      @keydown="onTypeaheadKeydown"
      @input="onTypeaheadInput($event)"
    />
    <Teleport to="body">
      <div
        v-if="showTypeaheadDropdown && isEditing && filteredTypeaheadSuggestions.length > 0"
        class="fixed z-[100] overflow-y-auto rounded border shadow-lg font-quicksand text-sm"
        :class="isDark ? 'border-white/10 bg-gray-900 text-gray-100' : 'border-gray-200 bg-white text-gray-900'"
        :style="{
          top: typeaheadMenuPosition.top + 'px',
          left: typeaheadMenuPosition.left + 'px',
          width: typeaheadMenuPosition.width + 'px',
          maxHeight: typeaheadMenuPosition.maxHeight + 'px',
        }"
        data-builder-typeahead-dropdown
      >
        <button
          v-for="(item, index) in filteredTypeaheadSuggestions"
          :key="item + '-' + index"
          type="button"
          :data-index="index"
          class="w-full px-3 py-2 text-left text-sm transition-colors"
          :class="
            highlightedTypeaheadIndex === index
              ? (isDark ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
              : (isDark ? 'text-gray-100 hover:bg-white/10' : 'text-gray-900 hover:bg-gray-100')
          "
          @mousedown.prevent="selectTypeaheadValue(item)"
        >
          {{ typeaheadSuggestionLabel(item) }}
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
