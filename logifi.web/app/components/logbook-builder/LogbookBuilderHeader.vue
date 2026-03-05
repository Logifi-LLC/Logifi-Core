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
const categorySubmenuOpen = ref(false)
const categoryTriggerRef = ref<HTMLElement | null>(null)
const mainDropdownRef = ref<HTMLElement | null>(null)
const submenuRef = ref<HTMLElement | null>(null)
const submenuPosition = ref({ top: 0, left: 0 })
let closeTimeout: ReturnType<typeof setTimeout> | null = null

function updateSubmenuPositionFromTrigger() {
  nextTick(() => {
    const refVal = categoryTriggerRef.value
    const el = Array.isArray(refVal) ? refVal[0] : refVal
    if (el && el.getBoundingClientRect) {
      const rect = el.getBoundingClientRect()
      submenuPosition.value = { top: rect.top, left: rect.right + 4 }
    }
  })
}

function onCategoryMouseEnter() {
  categorySubmenuOpen.value = true
  cancelClose()
  updateSubmenuPositionFromTrigger()
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
  }
}

const dropdownId = computed(() => `logbook-builder-header-${props.column.id}`)

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (closeTimeout) clearTimeout(closeTimeout)
})

const displayLabel = computed(() => props.column.label || 'Unmapped')

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
      :title="displayLabel"
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
        <!-- Wrapper: submenu is teleported so it isn't clipped by overflow-y-auto -->
        <div
          v-else
          ref="categoryTriggerRef"
          class="relative flex cursor-pointer"
          @mouseenter="onCategoryMouseEnter"
          @mouseleave="scheduleClose()"
        >
          <div
            class="flex-1 px-2 py-1.5 text-xs text-gray-900 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/10"
            :class="column.fieldKey === 'categoryClass' && !column.categoryClassValue ? 'bg-blue-50 dark:bg-blue-900/30' : ''"
            @click.stop="categorySubmenuOpen = !categorySubmenuOpen"
          >
            <span class="flex items-center justify-between">
              Category/Class
              <span class="ml-1 text-gray-400">▸</span>
            </span>
          </div>
        </div>
      </template>
    </div>
    <!-- Submenu in body so it's never clipped by table/overflow -->
    <Teleport to="body">
      <div
        v-if="open && categorySubmenuOpen"
        ref="submenuRef"
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
