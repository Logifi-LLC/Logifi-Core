<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pending-signature-review-title"
    >
      <div class="absolute inset-0 bg-black/50" @click="emit('close')" />
      <div
        :class="[
          'relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border shadow-xl font-quicksand sm:rounded-2xl',
          isDarkMode ? 'border-gray-700 bg-gray-900 text-gray-100' : 'border-gray-200 bg-white text-gray-900'
        ]"
      >
        <div
          :class="[
            'flex items-start justify-between gap-3 border-b px-4 py-3 sm:px-5',
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          ]"
        >
          <div class="min-w-0">
            <h3 id="pending-signature-review-title" class="text-lg font-semibold">
              Review flight entry
            </h3>
            <p :class="['mt-0.5 text-sm', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              {{ studentName?.trim() || 'Student' }} · same layout as Add/Edit — read only
            </p>
          </div>
          <button
            type="button"
            :class="[
              'shrink-0 rounded-lg px-2 py-1 text-sm',
              isDarkMode ? 'text-gray-400 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-100'
            ]"
            @click="emit('close')"
          >
            Close
          </button>
        </div>

        <div
          v-if="view"
          class="flex-1 overflow-y-auto overflow-x-hidden p-6"
          aria-disabled="true"
        >
          <div
            v-if="isAmendedEntry"
            :class="[
              'mb-4 rounded-lg border px-3 py-2 text-sm font-quicksand',
              isDarkMode
                ? 'border-cyan-700/60 bg-cyan-900/20 text-cyan-200'
                : 'border-cyan-200 bg-cyan-50 text-cyan-900',
            ]"
          >
            Amended entry — the student corrected a previously signed flight. Review the updated record before signing.
          </div>
          <div class="grid gap-6 min-w-0 max-w-full w-full pointer-events-none opacity-95">
            <!-- Simulator layout -->
            <template v-if="view.logbookType === 'simulator'">
              <div
                v-if="view.flagged"
                :class="[
                  'text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border w-fit',
                  isDarkMode ? 'bg-amber-900/30 text-amber-300 border-amber-700' : 'bg-amber-100 text-amber-700 border-amber-200'
                ]"
              >
                Flagged
              </div>
              <div :class="['rounded-lg border p-4', cardClass]">
                <div :class="['text-[10px] uppercase font-bold mb-3', mutedClass]">Session</div>
                <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                  <div>
                    <label :class="labelClass">Date</label>
                    <input :value="view.date" type="text" readonly :class="inputClass" />
                  </div>
                  <div>
                    <label :class="labelClass">Type</label>
                    <input :value="simTypeLabel" type="text" readonly :class="inputClass" />
                  </div>
                  <div>
                    <label :class="labelClass">Time</label>
                    <input :value="formatHours(view.flightTime.total)" type="text" readonly :class="[inputClass, 'text-center font-mono']" />
                  </div>
                  <div>
                    <label :class="labelClass">Role</label>
                    <input :value="roleLabel(view.role)" type="text" readonly :class="inputClass" />
                  </div>
                </div>
                <div class="mt-4 pt-3 border-t grid gap-4 grid-cols-1 sm:grid-cols-2" :class="isDarkMode ? 'border-gray-600' : 'border-gray-200'">
                  <div>
                    <label :class="labelClass">Simulated instrument (hrs)</label>
                    <input :value="formatHours(view.flightTime.simulatedInstrument)" type="text" readonly :class="[inputClass, 'max-w-[120px] text-center font-mono']" />
                  </div>
                </div>
              </div>
            </template>

            <!-- Flight layout (matches Add/Edit entry card) -->
            <template v-else>
              <div class="flex justify-between mb-2">
                <span
                  v-if="view.flagged"
                  :class="[
                    'text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border',
                    isDarkMode ? 'bg-amber-900/30 text-amber-300 border-amber-700' : 'bg-amber-100 text-amber-700 border-amber-200'
                  ]"
                >
                  Flagged
                </span>
                <span
                  v-if="hasOoi"
                  :class="[
                    'text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ml-auto',
                    isDarkMode ? 'bg-blue-900/30 text-blue-300 border-blue-700' : 'bg-blue-100 text-blue-700 border-blue-200'
                  ]"
                >
                  OOOI Active
                </span>
              </div>

              <div v-if="hasOoi && view.oooi" class="mb-2">
                <div class="flex justify-between items-center mb-2 px-2">
                  <span :class="['text-xs font-medium', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
                    Time Format: {{ view.oooi.isZulu ? 'Zulu (UTC)' : 'Local' }}
                  </span>
                </div>
                <div class="grid gap-2 p-2 rounded border border-dashed border-gray-600/50 grid-cols-2 sm:grid-cols-4">
                  <div v-for="field in oooiFields" :key="field">
                    <label :class="['block text-[10px] uppercase font-bold mb-1 text-center', isDarkMode ? 'text-blue-400' : 'text-blue-600']">
                      {{ oooiFieldLabels[field] }}
                    </label>
                    <input
                      :value="view.oooi[field] || ''"
                      type="text"
                      readonly
                      :class="[inputClass, 'text-center font-mono']"
                    />
                  </div>
                </div>
              </div>

              <div class="grid gap-4 md:grid-cols-4">
                <div>
                  <label :class="labelClass">Date</label>
                  <input :value="view.date" type="text" readonly :class="inputClass" />
                </div>
                <div>
                  <label :class="labelClass">Role</label>
                  <input :value="roleLabel(view.role)" type="text" readonly :class="inputClass" />
                </div>
                <div>
                  <label :class="labelClass">Aircraft</label>
                  <input :value="view.aircraftMakeModel" type="text" readonly :class="inputClass" />
                </div>
                <div>
                  <label :class="labelClass">Ident</label>
                  <input :value="view.registration" type="text" readonly :class="[inputClass, 'uppercase font-mono']" />
                </div>
              </div>

              <div class="grid gap-4 mb-2 items-end md:grid-cols-4">
                <div>
                  <label :class="labelClass">Flight Number</label>
                  <input :value="view.flightNumber || ''" type="text" readonly :class="[inputClass, 'uppercase font-mono']" />
                </div>
              </div>

              <div class="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                <div>
                  <label :class="labelClass">From</label>
                  <input :value="view.departure" type="text" readonly :class="[inputClass, 'uppercase font-mono']" />
                </div>
                <div>
                  <label :class="labelClass">To</label>
                  <input :value="view.destination" type="text" readonly :class="[inputClass, 'uppercase font-mono']" />
                </div>
                <div>
                  <label :class="labelClass">Category/Class</label>
                  <input :value="view.aircraftCategoryClass" type="text" readonly :class="inputClass" />
                </div>
                <div>
                  <label :class="labelClass">Time</label>
                  <input :value="formatHours(view.categoryClassTime)" type="text" readonly :class="[inputClass, 'text-center font-mono']" />
                </div>
                <div class="col-span-2">
                  <label :class="labelClass">Route</label>
                  <input :value="view.route" type="text" readonly :class="[inputClass, 'font-mono']" />
                </div>
              </div>

              <div>
                <label :class="['block text-[10px] uppercase font-bold mb-2', mutedClass]">Time</label>
                <div class="grid gap-3 w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
                  <div v-for="field in mainTimeFields" :key="field.key">
                    <div :class="['text-[9px] uppercase font-bold mb-1 text-center', mutedClass]">
                      {{ field.label }}
                    </div>
                    <input
                      :value="formatHours(view.flightTime[field.key])"
                      type="text"
                      readonly
                      :class="[
                        inputClass,
                        'text-center font-mono',
                        isEmptyHours(view.flightTime[field.key])
                          ? (isDarkMode ? 'text-gray-500' : 'text-gray-400')
                          : ''
                      ]"
                    />
                  </div>
                </div>
              </div>

              <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                <div>
                  <label :class="labelClass">Day Ldg</label>
                  <input :value="displayNum(view.performance.dayLandings)" type="text" readonly :class="[inputClass, 'text-center font-mono']" />
                </div>
                <div>
                  <label :class="labelClass">Night Ldg</label>
                  <input :value="displayNum(view.performance.nightLandings)" type="text" readonly :class="[inputClass, 'text-center font-mono']" />
                </div>
                <div>
                  <label :class="labelClass">Holds</label>
                  <input :value="displayNum(view.performance.holdingProcedures)" type="text" readonly :class="[inputClass, 'text-center font-mono']" />
                </div>
                <div class="col-span-2 md:col-span-4">
                  <label :class="labelClass">Approaches</label>
                  <div v-if="approaches.length === 0" :class="['text-sm', isDarkMode ? 'text-gray-500' : 'text-gray-400']">
                    None
                  </div>
                  <div v-else class="space-y-1.5">
                    <div
                      v-for="(approach, aIdx) in approaches"
                      :key="'ap-' + aIdx"
                      class="flex gap-2 items-center"
                    >
                      <input :value="approach.type" type="text" readonly :class="[inputClass, 'flex-1 max-w-[120px] font-mono']" />
                      <input :value="approach.count" type="text" readonly :class="[inputClass, 'w-14 text-center font-mono']" />
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <!-- Conditions (shared) -->
            <div class="flex flex-wrap gap-3">
              <span
                v-for="condition in conditionChips"
                :key="condition.value"
                :class="[
                  'rounded-lg border text-sm font-quicksand inline-flex items-center gap-2 px-4 py-2',
                  condition.active
                    ? (isDarkMode ? 'border-blue-500 bg-blue-900/30 text-blue-300' : 'border-blue-500 bg-blue-50 text-blue-700')
                    : (isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-400' : 'border-gray-300 bg-gray-100 text-gray-500')
                ]"
              >
                {{ condition.label }}
              </span>
            </div>

            <!-- Tags / Remarks -->
            <div>
              <label :class="labelClass">Tags</label>
              <div class="flex flex-wrap gap-2 mb-3 items-center">
                <span
                  v-for="tag in allTagChips"
                  :key="tag.value"
                  :class="[
                    'rounded-lg border text-sm font-quicksand inline-flex items-center gap-2 px-3 py-1.5',
                    tag.active
                      ? (isDarkMode ? 'border-blue-500 bg-blue-900/30 text-blue-300' : 'border-blue-500 bg-blue-50 text-blue-700')
                      : (isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-500' : 'border-gray-300 bg-gray-100 text-gray-500')
                  ]"
                >
                  {{ tag.value }}
                </span>
                <span v-if="allTagChips.length === 0" :class="['text-sm', isDarkMode ? 'text-gray-500' : 'text-gray-400']">None</span>
              </div>
              <label :class="labelClass">Remarks / Applicable 61.51 Notes</label>
              <textarea
                :value="view.remarks"
                rows="3"
                readonly
                :class="[
                  'w-full rounded border px-2 py-2 text-sm font-quicksand',
                  isDarkMode
                    ? 'border-white/10 bg-black/20 text-white placeholder-gray-400 shadow-inner'
                    : 'border-gray-300 bg-gray-100 text-gray-900'
                ]"
              />
            </div>

            <!-- Crew names -->
            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label :class="labelClass">PIC / Captain</label>
                <input :value="view.picName" type="text" readonly :class="inputClass" />
              </div>
              <div>
                <label :class="labelClass">SIC / First Officer</label>
                <input :value="view.sicName" type="text" readonly :class="inputClass" />
              </div>
            </div>

            <!-- Pilot -->
            <div>
              <label :class="['block text-[10px] uppercase font-bold mb-2', mutedClass]">Pilot</label>
              <div class="grid gap-4 md:grid-cols-3">
                <div>
                  <label :class="labelClass">Job</label>
                  <input :value="view.trainingInstructor" type="text" readonly :class="inputClass" />
                </div>
                <div class="md:col-span-2">
                  <label :class="labelClass">Name</label>
                  <input :value="view.trainingElements" type="text" readonly :class="inputClass" />
                </div>
              </div>
              <div v-if="view.instructorCertificate" class="mt-3">
                <label :class="labelClass">Certificate</label>
                <input :value="view.instructorCertificate" type="text" readonly :class="inputClass" />
              </div>
            </div>
          </div>
        </div>

        <div
          :class="[
            'border-t px-4 py-3 sm:px-5 space-y-3',
            isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'
          ]"
        >
          <label class="block text-sm">
            <span :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">Your signing PIN</span>
            <input
              v-model="pin"
              type="password"
              autocomplete="off"
              maxlength="12"
              placeholder="4–12 characters"
              :disabled="isSigning"
              :class="[
                'mt-1 w-full rounded-lg border px-3 py-2 text-base',
                isDarkMode
                  ? 'border-gray-600 bg-gray-800 text-gray-100'
                  : 'border-gray-300 bg-white text-gray-900'
              ]"
              @keydown.enter.prevent="onConfirm"
            />
          </label>
          <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              :disabled="isSigning"
              :class="[
                'rounded-lg px-4 py-2 text-sm font-semibold border',
                isDarkMode
                  ? 'border-gray-600 text-gray-200 hover:bg-gray-800'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              ]"
              @click="emit('close')"
            >
              Cancel
            </button>
            <button
              type="button"
              :disabled="isSigning || pin.trim().length < 4"
              class="rounded-lg px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              @click="onConfirm"
            >
              {{ isSigning ? 'Signing…' : 'Confirm sign' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Database } from '~/types/database'
import type {
  ApproachRecord,
  FlightTimeBreakdown,
  OOOITimes,
  PerformanceMetrics
} from '~/utils/logbookTypes'
import { createEmptyFlightTime, createEmptyPerformance, OOOI_FIELD_ORDER } from '~/utils/logbookTypes'

type LogEntryRow = Database['public']['Tables']['log_entries']['Row']

type ReviewView = {
  date: string
  role: string
  aircraftCategoryClass: string
  categoryClassTime: number | null
  aircraftMakeModel: string
  registration: string
  flightNumber: string | null
  departure: string
  destination: string
  route: string
  trainingElements: string
  trainingInstructor: string
  instructorCertificate: string
  picName: string
  sicName: string
  flightConditions: string[]
  remarks: string
  tags: string[]
  logbookType: 'flight' | 'simulator'
  flightTime: FlightTimeBreakdown
  performance: PerformanceMetrics
  oooi?: OOOITimes
  flagged: boolean
}

const props = defineProps<{
  open: boolean
  isDarkMode: boolean
  studentName: string | null
  entry: LogEntryRow | null
  isSigning?: boolean
}>()

const emit = defineEmits<{
  close: []
  sign: [pin: string]
}>()

const pin = ref('')

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) pin.value = ''
  }
)

const labelClass = computed(() =>
  [
    'block text-[10px] uppercase font-bold mb-1',
    props.isDarkMode ? 'text-gray-500' : 'text-gray-400'
  ].join(' ')
)

const mutedClass = computed(() => (props.isDarkMode ? 'text-gray-500' : 'text-gray-400'))

const cardClass = computed(() =>
  props.isDarkMode
    ? 'border-white/10 bg-gray-900/50 shadow-md shadow-black/40'
    : 'border-gray-200 bg-white'
)

const inputClass = computed(() =>
  [
    'w-full rounded border px-2 py-1 text-sm',
    props.isDarkMode
      ? 'bg-black/20 border-white/10 text-white shadow-inner'
      : 'bg-white border-gray-300 text-gray-900'
  ].join(' ')
)

const mainTimeFields = [
  { key: 'total' as const, label: 'Total Time' },
  { key: 'pic' as const, label: 'PIC' },
  { key: 'sic' as const, label: 'SIC' },
  { key: 'dual' as const, label: 'Dual R' },
  { key: 'solo' as const, label: 'Solo' },
  { key: 'night' as const, label: 'Night' },
  { key: 'nvg' as const, label: 'NVG' },
  { key: 'actualInstrument' as const, label: 'Actual' },
  { key: 'dualGiven' as const, label: 'Dual G' },
  { key: 'crossCountry' as const, label: 'XC' },
  { key: 'simulatedInstrument' as const, label: 'Hood' },
]

const oooiFields = OOOI_FIELD_ORDER
const oooiFieldLabels: Record<(typeof OOOI_FIELD_ORDER)[number], string> = {
  out: 'Out',
  off: 'Off',
  on: 'On',
  in: 'In'
}

const conditionOptions = [
  { value: 'nightVfr', label: 'Night' },
  { value: 'ifr', label: 'IFR' },
  { value: 'simInstrument', label: 'Simulated Instrument' },
  { value: 'actualInstrument', label: 'Actual Instrument' },
  { value: 'crossCountry', label: 'Cross-Country' },
  { value: 'nvg', label: 'NVG' },
] as const

const fixedTagOptions = ['Checkride', 'Flight Review', 'IPC'] as const

function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function formatHours(value: number | null | undefined): string {
  if (value === null || value === undefined) return ''
  if (!Number.isFinite(value)) return ''
  return value.toFixed(1)
}

function isEmptyHours(value: number | null | undefined): boolean {
  return value === null || value === undefined || value === 0
}

function displayNum(value: number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function roleLabel(role: string): string {
  if (role === 'Dual Received') return 'Dual R'
  return role || '—'
}

function mapFlightTime(raw: unknown): FlightTimeBreakdown {
  const base = createEmptyFlightTime()
  if (!raw || typeof raw !== 'object') return base
  const ft = raw as Record<string, unknown>
  for (const key of Object.keys(base) as (keyof FlightTimeBreakdown)[]) {
    base[key] = numOrNull(ft[key]) as never
  }
  return base
}

function mapPerformance(raw: unknown): PerformanceMetrics {
  const base = createEmptyPerformance()
  if (!raw || typeof raw !== 'object') return base
  const p = raw as Record<string, unknown>
  base.dayTakeoffs = numOrNull(p.dayTakeoffs)
  base.nightTakeoffs = numOrNull(p.nightTakeoffs)
  base.dayLandings = numOrNull(p.dayLandings)
  base.nightLandings = numOrNull(p.nightLandings)
  base.approachCount = numOrNull(p.approachCount)
  base.approachType = typeof p.approachType === 'string' ? p.approachType : null
  base.holdingProcedures = numOrNull(p.holdingProcedures)
  if (Array.isArray(p.approaches)) {
    base.approaches = p.approaches.map((a: { type?: string; count?: number }) => ({
      type: a.type || 'Unknown',
      count: Math.max(1, Number(a.count) || 1)
    }))
  }
  return base
}

function mapOoi(raw: unknown): OOOITimes | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  const hasAny = Boolean(o.out || o.off || o.on || o.in)
  if (!hasAny) return undefined
  return {
    out: typeof o.out === 'string' ? o.out : null,
    off: typeof o.off === 'string' ? o.off : null,
    on: typeof o.on === 'string' ? o.on : null,
    in: typeof o.in === 'string' ? o.in : null,
    isZulu: o.isZulu === true
  }
}

const view = computed<ReviewView | null>(() => {
  const e = props.entry
  if (!e) return null
  const raw = e as LogEntryRow & { logbook_type?: string | null }
  return {
    date: (e.date || '').toString().slice(0, 10),
    role: e.role || '',
    aircraftCategoryClass: e.aircraft_category_class || '',
    categoryClassTime: numOrNull(e.category_class_time),
    aircraftMakeModel: e.aircraft_make_model || '',
    registration: e.registration || '',
    flightNumber: e.flight_number,
    departure: e.departure || '',
    destination: e.destination || '',
    route: e.route || '',
    trainingElements: e.training_elements || '',
    trainingInstructor: e.training_instructor || '',
    instructorCertificate: e.instructor_certificate || '',
    picName: e.pic_name || '',
    sicName: e.sic_name || '',
    flightConditions: Array.isArray(e.flight_conditions) ? e.flight_conditions : [],
    remarks: e.remarks || '',
    tags: Array.isArray(e.tags) ? e.tags : [],
    logbookType: raw.logbook_type === 'simulator' ? 'simulator' : 'flight',
    flightTime: mapFlightTime(e.flight_time),
    performance: mapPerformance(e.performance),
    oooi: mapOoi(e.oooi),
    flagged: e.flagged === true
  }
})

const isAmendedEntry = computed(() => Boolean(props.entry?.amends_entry_id))

const hasOoi = computed(() => Boolean(view.value?.oooi))

const approaches = computed<ApproachRecord[]>(() => {
  const p = view.value?.performance
  if (!p) return []
  if (Array.isArray(p.approaches) && p.approaches.length > 0) return p.approaches
  if (p.approachType) {
    return [{ type: p.approachType, count: p.approachCount || 1 }]
  }
  return []
})

const simTypeLabel = computed(() => {
  const ft = view.value?.flightTime
  if (!ft) return '—'
  if ((ft.ffs ?? 0) > 0) return 'FFS'
  if ((ft.ftd ?? 0) > 0) return 'FTD'
  if ((ft.atd ?? 0) > 0) return 'ATD'
  return view.value?.aircraftCategoryClass || '—'
})

const conditionChips = computed(() => {
  const selected = new Set(view.value?.flightConditions || [])
  const known = conditionOptions.map((opt) => ({
    value: opt.value,
    label: opt.label,
    active: selected.has(opt.value)
  }))
  for (const value of selected) {
    if (!conditionOptions.some((o) => o.value === value)) {
      known.push({ value, label: value, active: true })
    }
  }
  return known
})

const allTagChips = computed(() => {
  const selected = new Set(view.value?.tags || [])
  const chips = fixedTagOptions.map((tag) => ({
    value: tag,
    active: selected.has(tag)
  }))
  for (const tag of selected) {
    if (!(fixedTagOptions as readonly string[]).includes(tag)) {
      chips.push({ value: tag, active: true })
    }
  }
  return chips.filter((c) => c.active)
})

function onConfirm() {
  if (pin.value.trim().length < 4 || props.isSigning) return
  emit('sign', pin.value)
}
</script>
