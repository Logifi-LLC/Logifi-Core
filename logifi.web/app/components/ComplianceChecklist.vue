<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <Icon name="ri:shield-check-line" :size="18" :class="[isDarkMode ? 'text-blue-400' : 'text-blue-600']" />
        <h3 :class="['text-sm font-semibold font-quicksand', isDarkMode ? 'text-gray-200' : 'text-gray-900']">
          Compliance Status
        </h3>
      </div>
      <button
        type="button"
        @click="isExpanded = !isExpanded"
        :class="[
          'p-1 rounded transition-colors',
          isDarkMode 
            ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300' 
            : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
        ]"
        :aria-expanded="isExpanded"
      >
        <Icon
          name="ri:arrow-down-s-line"
          :size="16"
          :class="[
            'transition-transform',
            isExpanded ? 'rotate-180' : ''
          ]"
        />
      </button>
    </div>

    <div v-show="isExpanded" class="space-y-3">
      <!-- Tab Navigation -->
      <div class="flex gap-2 border-b" :class="isDarkMode ? 'border-gray-700' : 'border-gray-300'">
        <button
          type="button"
          @click="activeTab = 'ac120'"
          :class="[
            'px-3 py-2 text-xs font-semibold font-quicksand transition-colors border-b-2 -mb-px',
            activeTab === 'ac120'
              ? (isDarkMode ? 'text-blue-400 border-blue-400' : 'text-blue-600 border-blue-600')
              : (isDarkMode ? 'text-gray-400 border-transparent hover:text-gray-300' : 'text-gray-500 border-transparent hover:text-gray-700')
          ]"
        >
          AC 120-78B
        </button>
        <button
          type="button"
          @click="activeTab = 'part61'"
          :class="[
            'px-3 py-2 text-xs font-semibold font-quicksand transition-colors border-b-2 -mb-px',
            activeTab === 'part61'
              ? (isDarkMode ? 'text-blue-400 border-blue-400' : 'text-blue-600 border-blue-600')
              : (isDarkMode ? 'text-gray-400 border-transparent hover:text-gray-300' : 'text-gray-500 border-transparent hover:text-gray-700')
          ]"
        >
          14 CFR Part 61
        </button>
      </div>

      <!-- AC 120-78B Tab Content -->
      <div v-show="activeTab === 'ac120'" class="space-y-3">
        <div
          v-for="requirement in ac120Requirements"
          :key="requirement.id"
          :class="[
            'flex items-start gap-3 p-2 rounded-lg transition-colors',
            isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-200/50'
          ]"
        >
          <!-- Status Icon -->
          <div class="flex-shrink-0 mt-0.5">
            <Icon
              v-if="requirement.status === 'complete'"
              name="ri:check-line"
              :size="20"
              :class="[isDarkMode ? 'text-green-400' : 'text-green-600']"
            />
            <Icon
              v-else-if="requirement.status === 'partial'"
              name="ri:time-line"
              :size="20"
              :class="[isDarkMode ? 'text-yellow-400' : 'text-yellow-600']"
            />
            <Icon
              v-else-if="requirement.status === 'deferred'"
              name="ri:pause-line"
              :size="20"
              :class="[isDarkMode ? 'text-yellow-400' : 'text-yellow-600']"
            />
          </div>

          <!-- Requirement Details -->
          <div class="flex-1 min-w-0">
            <div :class="['text-xs font-semibold font-quicksand mb-0.5', isDarkMode ? 'text-gray-200' : 'text-gray-900']">
              {{ requirement.name }}
            </div>
            <div :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
              {{ requirement.statusText }}
            </div>
          </div>
        </div>

        <!-- Overall Status Summary -->
        <div
          :class="[
            'mt-4 pt-3 border-t rounded-lg p-2',
            isDarkMode ? 'border-gray-700 bg-gray-800/30' : 'border-gray-300 bg-gray-100'
          ]"
        >
          <div class="flex items-center justify-between">
            <span :class="['text-xs font-semibold font-quicksand', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
              Overall Status
            </span>
            <span
              :class="[
                'text-xs font-semibold font-quicksand px-2 py-1 rounded',
                isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
              ]"
            >
              {{ ac120CompletedCount }}/{{ ac120TotalCount }} Complete
            </span>
          </div>
        </div>
      </div>

      <!-- 14 CFR Part 61 Tab Content -->
      <div v-show="activeTab === 'part61'" class="space-y-3">
        <div
          v-for="requirement in part61Requirements"
          :key="requirement.id"
          :class="[
            'flex items-start gap-3 p-2 rounded-lg transition-colors',
            isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-200/50'
          ]"
        >
          <!-- Status Icon -->
          <div class="flex-shrink-0 mt-0.5">
            <Icon
              v-if="requirement.status === 'complete'"
              name="ri:check-line"
              :size="20"
              :class="[isDarkMode ? 'text-green-400' : 'text-green-600']"
            />
            <Icon
              v-else-if="requirement.status === 'partial'"
              name="ri:time-line"
              :size="20"
              :class="[isDarkMode ? 'text-yellow-400' : 'text-yellow-600']"
            />
            <Icon
              v-else-if="requirement.status === 'deferred'"
              name="ri:pause-line"
              :size="20"
              :class="[isDarkMode ? 'text-yellow-400' : 'text-yellow-600']"
            />
          </div>

          <!-- Requirement Details -->
          <div class="flex-1 min-w-0">
            <div :class="['text-xs font-semibold font-quicksand mb-0.5', isDarkMode ? 'text-gray-200' : 'text-gray-900']">
              {{ requirement.name }}
            </div>
            <div :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
              {{ requirement.statusText }}
            </div>
          </div>
        </div>

        <!-- Overall Status Summary -->
        <div
          :class="[
            'mt-4 pt-3 border-t rounded-lg p-2',
            isDarkMode ? 'border-gray-700 bg-gray-800/30' : 'border-gray-300 bg-gray-100'
          ]"
        >
          <div class="flex items-center justify-between">
            <span :class="['text-xs font-semibold font-quicksand', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
              Overall Status
            </span>
            <span
              :class="[
                'text-xs font-semibold font-quicksand px-2 py-1 rounded',
                isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
              ]"
            >
              {{ part61CompletedCount }}/{{ part61TotalCount }} Complete
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Requirement {
  id: string
  name: string
  status: 'complete' | 'partial' | 'deferred'
  statusText: string
}

interface Props {
  isDarkMode?: boolean
  isSidebarCollapsed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isDarkMode: false,
  isSidebarCollapsed: false
})

const isExpanded = ref(false)
const activeTab = ref<'ac120' | 'part61'>('ac120')

// AC 120-78B Requirements
const ac120Requirements: Requirement[] = [
  {
    id: 'revision-history',
    name: 'Revision History / Audit Trail',
    status: 'complete',
    statusText: 'Complete'
  },
  {
    id: 'data-integrity',
    name: 'Data Integrity / Tamper Protection',
    status: 'complete',
    statusText: 'Complete'
  },
  {
    id: 'signer-identity',
    name: 'Signer Identity Recording',
    status: 'complete',
    statusText: 'Complete - user_id tracked'
  },
  {
    id: 'export-archival',
    name: 'Export and Secured Archival',
    status: 'complete',
    statusText: 'Complete'
  },
  {
    id: 'electronic-signatures',
    name: 'Electronic Signatures',
    status: 'deferred',
    statusText: 'Deferred to Phase 2'
  },
  {
    id: 'non-repudiation',
    name: 'Non-Repudiation',
    status: 'partial',
    statusText: 'Partial - audit trail provides some'
  }
]

// 14 CFR Part 61 Requirements
const part61Requirements: Requirement[] = [
  {
    id: 'required-fields',
    name: 'Required Fields Validation',
    status: 'complete',
    statusText: 'Complete - Week 1'
  },
  {
    id: 'recordkeeping',
    name: 'Recordkeeping Requirements',
    status: 'complete',
    statusText: 'Complete - Week 1'
  },
  {
    id: 'currency-tracking',
    name: 'Currency Tracking',
    status: 'complete',
    statusText: 'Complete - Available in Pilot Profile'
  }
]

const ac120CompletedCount = computed(() => {
  return ac120Requirements.filter(r => r.status === 'complete').length
})

const ac120TotalCount = computed(() => {
  return ac120Requirements.length
})

const part61CompletedCount = computed(() => {
  return part61Requirements.filter(r => r.status === 'complete').length
})

const part61TotalCount = computed(() => {
  return part61Requirements.length
})
</script>

