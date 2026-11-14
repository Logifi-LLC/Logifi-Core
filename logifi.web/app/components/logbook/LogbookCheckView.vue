<template>
  <div class="font-quicksand">
    <p class="text-sm" :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
      Finds entries worth a second look. Not a legal or FAA review.
    </p>

    <p
      v-if="errorCount + checkCount > 0"
      class="mt-1 text-xs"
      :class="isDarkMode ? 'text-gray-500' : 'text-gray-500'"
    >
      {{ errorCount }} error{{ errorCount === 1 ? '' : 's' }} · {{ checkCount }} check{{ checkCount === 1 ? '' : 's' }}
    </p>

    <div v-if="loading" class="mt-4 text-sm" :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
      Checking…
    </div>

    <p
      v-else-if="!hasEntries"
      class="mt-4 text-sm"
      :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
      data-testid="logbook-check-no-entries"
    >
      No entries to check
    </p>

    <p
      v-else-if="groups.length === 0"
      class="mt-4 text-sm"
      :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
      data-testid="logbook-check-empty"
    >
      No issues found
    </p>

    <div v-else class="mt-4 space-y-4">
      <section
        v-for="group in groups"
        :key="group.ruleId"
        :data-testid="`logbook-check-group-${group.ruleId}`"
      >
        <div
          class="flex items-center justify-between gap-2 px-1"
          :class="isDarkMode ? 'text-gray-200' : 'text-gray-900'"
        >
          <h2 class="min-w-0 truncate text-sm font-semibold">{{ group.title }}</h2>
          <span class="flex shrink-0 items-center gap-1">
            <span
              class="rounded px-1.5 py-0.5 text-xs font-medium uppercase"
              :class="severityClass(group.severity)"
            >
              {{ group.severity }}
            </span>
            <span class="text-xs tabular-nums" :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
              {{ group.count }}
            </span>
          </span>
        </div>

        <ul class="mt-1 space-y-1">
          <li
            v-for="item in group.findings"
            :key="item.id"
            class="md:rounded-none"
          >
            <button
              type="button"
              class="flex min-h-11 w-full flex-col gap-1 rounded-lg border px-3 py-2 text-left transition-colors md:flex-row md:items-center md:gap-3"
              :class="rowClass"
              @click="$emit('open-entry', item.entryId)"
            >
              <span
                class="shrink-0 text-xs font-medium uppercase"
                :class="severityClass(item.severity)"
              >
                {{ item.severity }}
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-sm" :class="isDarkMode ? 'text-gray-100' : 'text-gray-900'">
                  {{ formatDate(item.date) }}
                  <span class="text-xs font-normal" :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'">
                    {{ item.summary }}
                  </span>
                </span>
              </span>
              <span class="text-xs" :class="isDarkMode ? 'text-blue-300' : 'text-blue-700'">
                Open
              </span>
            </button>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AuditRuleGroup, AuditSeverity } from '~/utils/logbookAudit'
import { formatDisplayDate } from '~/utils/entryFieldDisplay'

const props = defineProps<{
  isDarkMode: boolean
  groups: AuditRuleGroup[]
  errorCount: number
  checkCount: number
  loading?: boolean
  hasEntries: boolean
}>()

defineEmits<{
  'open-entry': [entryId: string]
}>()

const rowClass = computed(() =>
  props.isDarkMode
    ? 'border-gray-700 bg-gray-800/60 hover:bg-gray-700/50'
    : 'border-gray-200 bg-white hover:bg-gray-50'
)

function severityClass(severity: AuditSeverity): string {
  if (severity === 'error') {
    return props.isDarkMode ? 'text-red-300' : 'text-red-700'
  }
  return props.isDarkMode ? 'text-amber-300' : 'text-amber-800'
}

function formatDate(date: string): string {
  return formatDisplayDate(date)
}
</script>
