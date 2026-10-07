<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useTheme } from '~/composables/useTheme'
import type { BuilderColumn } from '~/utils/logbookBuilderTypes'
import type { LogbookColumnKey } from '~/utils/logbookTypes'
import { CATEGORY_CLASS_OPTIONS } from '~/utils/logbookBuilderTypes'

const props = defineProps<{ column: BuilderColumn }>()
const emit = defineEmits<{ update: [col: BuilderColumn, updates: Partial<Pick<BuilderColumn, 'fieldKey' | 'label' | 'categoryClassValue'>>] }>()

const { isDark } = useTheme()

const FIELD_OPTIONS: { value: LogbookColumnKey | ''; label: string }[] = [
  { value: '', label: 'Unmapped' },
  { value: 'date', label: 'Date' },
  { value: 'aircraft', label: 'Aircraft' },
  { value: 'identification', label: 'Identification' },
  { value: 'flightNumber', label: 'Flight Number' },
  { value: 'departure', label: 'From' },
  { value: 'destination', label: 'To' },
  { value: 'route', label: 'Route' },
  { value: 'simulator', label: 'Simulator' },
  { value: 'categoryClass', label: 'Category/Class' },
  { value: 'conditions', label: 'Conditions' },
  { value: 'remarks', label: 'Remarks' },
  { value: 'pic', label: 'PIC' },
  { value: 'sic', label: 'SIC' },
  { value: 'dualR', label: 'Dual R' },
  { value: 'solo', label: 'Solo' },
  { value: 'night', label: 'Night' },
  { value: 'nvg', label: 'NVG' },
  { value: 'actual', label: 'Actual' },
  { value: 'hood', label: 'Hood' },
  { value: 'dualG', label: 'Dual G' },
  { value: 'xc', label: 'XC' },
  { value: 'dayLandings', label: 'Day Landings' },
  { value: 'nightLandings', label: 'Night Landings' },
  { value: 'approach', label: 'Approach' },
  { value: 'approachType', label: 'Approach Type' },
  { value: 'pilots', label: 'Pilots' },
  { value: 'pilotRole', label: 'Pilot Role' },
  { value: 'role', label: 'Role' },
  { value: 'total', label: 'Total' },
]

const open = ref(false)
/** Desktop hover flyout (teleported). Unchanged for a real mouse on a fine pointer. */
const categorySubmenuOpen = ref(false)
/** Touch / coarse pointer: class list inline under the Category/Class row. */
const categoryInlineOpen = ref(false)
const coarsePointer = ref(false)
const categoryTriggerRef = ref<HTMLElement | null>(null)
const mainDropdownRef = ref<HTMLElement | null>(null)
const submenuRef = ref<HTMLElement | null>(null)
const submenuPosition = ref({ top: 0, left: 0 })
let closeTimeout: ReturnType<typeof setTimeout> | null = null
let coarseMedia: MediaQueryList | null = null
/** Last pointer that interacted with the row. Touch taps must not open the hover flyout. */
const activePointerType = ref('mouse')

function categoryTriggerElement(): HTMLElement | null {
  const refVal = categoryTriggerRef.value
  const el = Array.isArray(refVal) ? refVal[0] : refVal
  return el ?? null
}

function wantsInlineMenu(): boolean {
  return coarsePointer.value || activePointerType.value === 'touch' || activePointerType.value === 'pen'
}

function syncCoarsePointer() {
  coarsePointer.value = coarseMedia?.matches ?? false
}

function updateSubmenuPositionFromTrigger() {
  nextTick(() => {
    const el = categoryTriggerElement()
    if (el && el.getBoundingClientRect) {
      const rect = el.getBoundingClientRect()
      submenuPosition.value = { top: rect.top, left: rect.right + 4 }
    }
  })
}

function onCategoryPointerEnter(e: PointerEvent) {
  if (e.pointerType) activePointerType.value = e.pointerType
  if (wantsInlineMenu()) {
    categorySubmenuOpen.value = false
    cancelClose()
    return
  }
  onCategoryMouseEnter()
}

function onCategoryPointerDown(e: PointerEvent) {
  if (e.pointerType) activePointerType.value = e.pointerType
  if (wantsInlineMenu()) {
    categorySubmenuOpen.value = false
    cancelClose()
  }
}

function onCategoryMouseEnter() {
  if (wantsInlineMenu()) return
  categorySubmenuOpen.value = true
  cancelClose()
  updateSubmenuPositionFromTrigger()
}

function onCategoryMouseLeave() {
  if (wantsInlineMenu()) return
  scheduleClose()
}

function scrollInlineIntoView() {
  nextTick(() => {
    const menu = mainDropdownRef.value
    const trigger = categoryTriggerElement()
    if (!menu || !trigger) return
    const top = trigger.offsetTop
    const bottom = top + trigger.offsetHeight
    const viewBottom = menu.scrollTop + menu.clientHeight
    if (top < menu.scrollTop || bottom > viewBottom) {
      menu.scrollTop = Math.max(0, top)
    }
  })
}

function onCategoryRowClick(e: MouseEvent) {
  e.stopPropagation()
  if (wantsInlineMenu()) {
    categoryInlineOpen.value = !categoryInlineOpen.value
    categorySubmenuOpen.value = false
    cancelClose()
    if (categoryInlineOpen.value) scrollInlineIntoView()
    return
  }
  categorySubmenuOpen.value = !categorySubmenuOpen.value
  if (categorySubmenuOpen.value) {
    cancelClose()
    updateSubmenuPositionFromTrigger()
  }
}

function applyOption(value: LogbookColumnKey | '', label: string, categoryClassValue?: string) {
  const fieldKey = value === '' ? null : value
  const updates: Partial<Pick<BuilderColumn, 'fieldKey' | 'label' | 'categoryClassValue'>> = {
    fieldKey: fieldKey ?? undefined,
    label: value === '' ? 'Notes' : label,
  }
  updates.categoryClassValue = value === 'categoryClass' ? (categoryClassValue ?? undefined) : undefined
  emit('update', props.column, updates)
  open.value = false
  categorySubmenuOpen.value = false
  categoryInlineOpen.value = false
}

function onSelectOption(opt: { value: LogbookColumnKey | ''; label: string }) {
  if (opt.value !== 'categoryClass') {
    applyOption(opt.value, opt.label)
  }
}

function onSelectCategoryClass(cc: string) {
  applyOption('categoryClass', cc, cc)
}

function scheduleClose() {
  if (closeTimeout) clearTimeout(closeTimeout)
  closeTimeout = setTimeout(() => {
    categorySubmenuOpen.value = false
    closeTimeout = null
  }, 300)
}

function cancelClose() {
  if (closeTimeout) {
    clearTimeout(closeTimeout)
    closeTimeout = null
  }
}

function handleClickOutside(e: MouseEvent) {
  const target = e.target as Node
  if (!target) return
  const el = (document.getElementById as (id: string) => HTMLElement | null)(dropdownId.value)
  if (submenuRef.value?.contains(target)) return
  if (el && !el.contains(target)) {
    open.value = false
    categorySubmenuOpen.value = false
    categoryInlineOpen.value = false
  }
}

const dropdownId = computed(() => `logbook-builder-header-${props.column.id}`)

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    coarseMedia = window.matchMedia('(hover: none), (pointer: coarse)')
    syncCoarsePointer()
    coarseMedia.addEventListener('change', syncCoarsePointer)
  }
})
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  coarseMedia?.removeEventListener('change', syncCoarsePointer)
  if (closeTimeout) clearTimeout(closeTimeout)
})

const displayLabel = computed(() => props.column.label || 'Unmapped')

const columnHeaderTitle = computed(() => {
  if (props.column.fieldKey === 'role') {
    return 'Your role on this flight (PIC, Student/Dual Received, Instructor, etc.)'
  }
  if (props.column.fieldKey === 'pilotRole') {
    return "Other crew member's job (Student, Instructor, Captain, First Officer, etc.)"
  }
  return displayLabel.value
})

const isNumeric = computed(() => {
  const k = props.column.fieldKey
  return k != null && ['pic','sic','dualR','solo','night','actual','hood','dualG','xc','dayLandings','nightLandings','approach','total'].includes(k)
})

const isCategoryClassTime = computed(() =>
  props.column.fieldKey === 'categoryClass' && props.column.categoryClassValue != null
)

const categoryClassOptions = CATEGORY_CLASS_OPTIONS
</script>

<template>
  <div :id="dropdownId" class="relative flex min-w-0 flex-col gap-0.5">
    <button
      type="button"
      :class="[
        'w-full min-w-0 truncate rounded border-0 bg-transparent py-0.5 text-center text-xs font-semibold uppercase tracking-wider focus:ring-1 focus:ring-blue-500 transition-colors',
        isDark ? 'text-gray-400 hover:bg-white/10 hover:text-gray-300' : 'text-black hover:bg-gray-50'
      ]"
      :title="columnHeaderTitle"
      @click="open = !open"
    >
      {{ displayLabel }}
    </button>
    <div
      v-if="open"
      ref="mainDropdownRef"
      class="absolute left-0 top-full z-50 mt-0.5 max-h-64 min-w-[160px] overflow-y-auto rounded border bg-white shadow-lg dark:border-white/10 dark:bg-gray-900 dark:shadow-xl dark:shadow-black/50"
    >
      <template v-for="opt in FIELD_OPTIONS" :key="opt.value || 'none'">
        <div
          v-if="opt.value !== 'categoryClass'"
          class="cursor-pointer px-2 py-1.5 text-xs text-gray-900 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/10"
          :class="opt.value !== '' && column.fieldKey === opt.value && !column.categoryClassValue ? 'bg-blue-50 dark:bg-blue-900/30' : ''"
          @click="onSelectOption(opt)"
        >
          {{ opt.label }}
        </div>
        <!-- Hover flyout stays teleported. Touch opens an in-flow list so max-height scrolls instead of clipping. -->
        <div
          v-else
          ref="categoryTriggerRef"
          data-testid="category-class-trigger"
          class="relative"
          @pointerenter="onCategoryPointerEnter"
          @pointerdown="onCategoryPointerDown"
          @mouseenter="onCategoryMouseEnter"
          @mouseleave="onCategoryMouseLeave"
        >
          <div class="flex cursor-pointer">
            <div
              data-testid="category-class-row"
              class="lb-cat-row flex-1 px-2 py-1.5 text-xs text-gray-900 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/10"
              :class="column.fieldKey === 'categoryClass' && !column.categoryClassValue ? 'bg-blue-50 dark:bg-blue-900/30' : ''"
              @click.stop="onCategoryRowClick"
            >
              <span class="flex w-full items-center justify-between">
                Category/Class
                <span
                  class="lb-cat-chevron ml-1 text-gray-400"
                  :class="{ 'lb-cat-chevron-open': categoryInlineOpen }"
                  aria-hidden="true"
                >▸</span>
              </span>
            </div>
          </div>
          <div
            v-if="categoryInlineOpen"
            data-testid="category-inline"
          >
            <button
              v-for="cc in categoryClassOptions"
              :key="cc"
              type="button"
              class="lb-cat-option w-full cursor-pointer py-1.5 pl-6 pr-2 text-left text-xs text-gray-900 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/10"
              :class="column.categoryClassValue === cc ? 'bg-blue-50 dark:bg-blue-900/30' : ''"
              @click="onSelectCategoryClass(cc)"
            >
              {{ cc }}
            </button>
          </div>
        </div>
      </template>
    </div>
    <!-- Submenu in body so it's never clipped by table/overflow -->
    <Teleport to="body">
      <div
        v-if="open && categorySubmenuOpen && !wantsInlineMenu()"
        ref="submenuRef"
        data-testid="category-flyout"
        class="fixed z-[100] w-[5rem] max-h-[11rem] overflow-y-auto rounded border bg-white py-px shadow dark:border-white/10 dark:bg-gray-900 dark:shadow-xl dark:shadow-black/50"
        :style="{ top: submenuPosition.top + 'px', left: submenuPosition.left + 'px' }"
        @mouseenter="cancelClose()"
        @mouseleave="scheduleClose()"
      >
        <button
          v-for="cc in categoryClassOptions"
          :key="cc"
          type="button"
          class="w-full px-1.5 py-px text-left text-[10px] leading-tight text-gray-900 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/10"
          :class="column.categoryClassValue === cc ? 'bg-blue-50 dark:bg-blue-900/30' : ''"
          @click="onSelectCategoryClass(cc)"
        >
          {{ cc }}
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.lb-cat-chevron {
  display: inline-block;
}
.lb-cat-chevron-open {
  transform: rotate(90deg);
}
@media (pointer: coarse), (hover: none) {
  .lb-cat-row,
  .lb-cat-option {
    min-height: 44px;
    display: flex;
    align-items: center;
  }
}
</style>
