<script setup lang="ts">
import {
  AIRPLANE_COLUMN_LABELS,
  airplaneFieldDisplay,
  formatTotalsHours,
  simTotalHours,
  type TotalsReport,
} from '~/utils/totalsReport'

defineProps<{
  report: TotalsReport
  isDarkMode: boolean
}>()

const tableWrapClass =
  'hidden md:block rounded-xl border overflow-hidden'
const cardListClass = 'md:hidden space-y-1'
const thClass = 'px-1 py-2 text-left text-xs font-semibold whitespace-normal'
const tdClass = 'px-1 py-2 text-xs font-mono tabular-nums'
const cardClass = (dark: boolean) =>
  dark
    ? 'rounded-xl border border-gray-700 bg-gray-800/60 p-3'
    : 'rounded-xl border border-gray-200 bg-white p-3'

function borderClass(dark: boolean) {
  return dark ? 'border-gray-700' : 'border-gray-200'
}

function mutedClass(dark: boolean) {
  return dark ? 'text-gray-400' : 'text-gray-500'
}

function headingClass(dark: boolean) {
  return dark ? 'text-gray-100' : 'text-gray-900'
}

const airplaneShort: Record<(typeof AIRPLANE_COLUMN_LABELS)[number]['key'], string> = {
  total: 'Total',
  pic: 'PIC',
  sic: 'SIC',
  crossCountry: 'XC',
  night: 'Night',
  actualInstrument: 'Act inst',
  simulatedInstrument: 'Sim inst',
  dualReceived: 'Dual rec',
  dualGiven: 'Dual giv',
  multiEngine: 'Multi',
  approaches: 'Appr',
  dayLandings: 'Day ldg',
  nightLandings: 'Night ldg',
}

const simColumns = [
  { key: 'ffs' as const, label: 'FFS' },
  { key: 'ftd' as const, label: 'FTD' },
  { key: 'atd' as const, label: 'ATD' },
  { key: 'unspecified' as const, label: 'Unspecified' },
]
</script>

<template>
  <div class="space-y-4">
    <section>
      <h2 class="mb-1 text-sm font-semibold" :class="headingClass(isDarkMode)">Grand total</h2>
      <p class="mb-1 text-xs" :class="mutedClass(isDarkMode)">
        Airplane time. Sim is separate and is not included in Total.
      </p>

      <div :class="cardListClass">
        <article :class="cardClass(isDarkMode)">
          <h3 class="text-sm font-semibold" :class="headingClass(isDarkMode)">{{ report.grandTotal.label }}</h3>
          <dl class="mt-1 grid grid-cols-2 gap-1">
            <div
              v-for="column in AIRPLANE_COLUMN_LABELS"
              :key="column.key"
              class="flex items-baseline justify-between gap-1"
            >
              <dt class="text-xs" :class="mutedClass(isDarkMode)">{{ column.label }}</dt>
              <dd class="text-xs font-mono tabular-nums" :class="headingClass(isDarkMode)">
                {{ airplaneFieldDisplay(report.grandTotal.airplane, column.key) }}
              </dd>
            </div>
          </dl>
        </article>
      </div>

      <div :class="[tableWrapClass, borderClass(isDarkMode)]">
        <table class="w-full table-fixed">
          <caption class="sr-only">Airplane grand total</caption>
          <thead :class="isDarkMode ? 'bg-gray-800/80' : 'bg-gray-50'">
            <tr>
              <th scope="col" :class="thClass">Group</th>
              <th
                v-for="column in AIRPLANE_COLUMN_LABELS"
                :key="column.key"
                scope="col"
                :class="thClass"
                :title="column.label"
              >
                {{ airplaneShort[column.key] }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr :class="isDarkMode ? 'bg-gray-900/40' : 'bg-white'">
              <th scope="row" class="px-1 py-2 text-left text-xs font-semibold">{{ report.grandTotal.label }}</th>
              <td
                v-for="column in AIRPLANE_COLUMN_LABELS"
                :key="column.key"
                :class="tdClass"
              >
                {{ airplaneFieldDisplay(report.grandTotal.airplane, column.key) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section>
      <h2 class="mb-1 text-sm font-semibold" :class="headingClass(isDarkMode)">Category / class</h2>
      <p v-if="report.byCategoryClass.length === 0" class="text-xs" :class="mutedClass(isDarkMode)">None</p>

      <div :class="cardListClass">
        <article
          v-for="row in report.byCategoryClass"
          :key="row.key"
          :class="cardClass(isDarkMode)"
        >
          <h3 class="text-sm font-semibold" :class="headingClass(isDarkMode)">{{ row.label }}</h3>
          <dl class="mt-1 grid grid-cols-2 gap-1">
            <div
              v-for="column in AIRPLANE_COLUMN_LABELS"
              :key="column.key"
              class="flex items-baseline justify-between gap-1"
            >
              <dt class="text-xs" :class="mutedClass(isDarkMode)">{{ column.label }}</dt>
              <dd class="text-xs font-mono tabular-nums">{{ airplaneFieldDisplay(row.airplane, column.key) }}</dd>
            </div>
          </dl>
        </article>
      </div>

      <div
        v-if="report.byCategoryClass.length > 0"
        :class="[tableWrapClass, borderClass(isDarkMode)]"
      >
        <table class="w-full table-fixed">
          <caption class="sr-only">Totals by category and class</caption>
          <thead :class="isDarkMode ? 'bg-gray-800/80' : 'bg-gray-50'">
            <tr>
              <th scope="col" :class="thClass">Category</th>
              <th
                v-for="column in AIRPLANE_COLUMN_LABELS"
                :key="column.key"
                scope="col"
                :class="thClass"
                :title="column.label"
              >
                {{ airplaneShort[column.key] }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in report.byCategoryClass"
              :key="row.key"
              :class="isDarkMode ? 'odd:bg-gray-900/40' : 'odd:bg-white even:bg-gray-50'"
            >
              <th scope="row" class="px-1 py-2 text-left text-xs font-medium">{{ row.label }}</th>
              <td
                v-for="column in AIRPLANE_COLUMN_LABELS"
                :key="column.key"
                :class="tdClass"
              >
                {{ airplaneFieldDisplay(row.airplane, column.key) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section>
      <h2 class="mb-1 text-sm font-semibold" :class="headingClass(isDarkMode)">Aircraft type</h2>
      <p v-if="report.byAircraftType.length === 0" class="text-xs" :class="mutedClass(isDarkMode)">None</p>

      <div :class="cardListClass">
        <article
          v-for="row in report.byAircraftType"
          :key="row.key"
          :class="cardClass(isDarkMode)"
        >
          <h3 class="text-sm font-semibold" :class="headingClass(isDarkMode)">{{ row.label }}</h3>
          <dl class="mt-1 grid grid-cols-2 gap-1">
            <div
              v-for="column in AIRPLANE_COLUMN_LABELS"
              :key="column.key"
              class="flex items-baseline justify-between gap-1"
            >
              <dt class="text-xs" :class="mutedClass(isDarkMode)">{{ column.label }}</dt>
              <dd class="text-xs font-mono tabular-nums">{{ airplaneFieldDisplay(row.airplane, column.key) }}</dd>
            </div>
          </dl>
        </article>
      </div>

      <div
        v-if="report.byAircraftType.length > 0"
        :class="[tableWrapClass, borderClass(isDarkMode)]"
      >
        <table class="w-full table-fixed">
          <caption class="sr-only">Totals by aircraft type</caption>
          <thead :class="isDarkMode ? 'bg-gray-800/80' : 'bg-gray-50'">
            <tr>
              <th scope="col" :class="thClass">Type</th>
              <th
                v-for="column in AIRPLANE_COLUMN_LABELS"
                :key="column.key"
                scope="col"
                :class="thClass"
                :title="column.label"
              >
                {{ airplaneShort[column.key] }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in report.byAircraftType"
              :key="row.key"
              :class="isDarkMode ? 'odd:bg-gray-900/40' : 'odd:bg-white even:bg-gray-50'"
            >
              <th scope="row" class="px-1 py-2 text-left text-xs font-medium">{{ row.label }}</th>
              <td
                v-for="column in AIRPLANE_COLUMN_LABELS"
                :key="column.key"
                :class="tdClass"
              >
                {{ airplaneFieldDisplay(row.airplane, column.key) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section>
      <h2 class="mb-1 text-sm font-semibold" :class="headingClass(isDarkMode)">Simulator</h2>
      <p class="mb-1 text-xs" :class="mutedClass(isDarkMode)">FFS / FTD / ATD. Not added to airplane Total.</p>
      <p v-if="report.bySimulator.length === 0" class="text-xs" :class="mutedClass(isDarkMode)">None</p>

      <div :class="cardListClass">
        <article
          v-for="row in report.bySimulator"
          :key="row.key"
          :class="cardClass(isDarkMode)"
        >
          <h3 class="text-sm font-semibold" :class="headingClass(isDarkMode)">{{ row.label }}</h3>
          <dl class="mt-1 grid grid-cols-2 gap-1">
            <div
              v-for="column in simColumns"
              :key="column.key"
              class="flex items-baseline justify-between gap-1"
            >
              <dt class="text-xs" :class="mutedClass(isDarkMode)">{{ column.label }}</dt>
              <dd class="text-xs font-mono tabular-nums">{{ formatTotalsHours(row.sim[column.key]) }}</dd>
            </div>
            <div class="flex items-baseline justify-between gap-1">
              <dt class="text-xs" :class="mutedClass(isDarkMode)">Sim total</dt>
              <dd class="text-xs font-mono tabular-nums">{{ formatTotalsHours(simTotalHours(row.sim)) }}</dd>
            </div>
          </dl>
        </article>
      </div>

      <div
        v-if="report.bySimulator.length > 0"
        :class="[tableWrapClass, borderClass(isDarkMode)]"
      >
        <table class="w-full table-fixed">
          <caption class="sr-only">Simulator totals</caption>
          <thead :class="isDarkMode ? 'bg-gray-800/80' : 'bg-gray-50'">
            <tr>
              <th scope="col" :class="thClass">Device</th>
              <th v-for="column in simColumns" :key="column.key" scope="col" :class="thClass">
                {{ column.label }}
              </th>
              <th scope="col" :class="thClass">Sim total</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in report.bySimulator"
              :key="row.key"
              :class="isDarkMode ? 'odd:bg-gray-900/40' : 'odd:bg-white even:bg-gray-50'"
            >
              <th scope="row" class="px-1 py-2 text-left text-xs font-medium">{{ row.label }}</th>
              <td v-for="column in simColumns" :key="column.key" :class="tdClass">
                {{ formatTotalsHours(row.sim[column.key]) }}
              </td>
              <td :class="tdClass">{{ formatTotalsHours(simTotalHours(row.sim)) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
