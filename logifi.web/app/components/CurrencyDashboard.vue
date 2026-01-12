<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    @click.self="close"
  >
    <div
      :class="[
        'relative w-full max-w-4xl max-h-[90vh] rounded-xl border shadow-2xl flex flex-col',
        isDarkMode 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-300'
      ]"
    >
      <!-- Header -->
      <div
        :class="[
          'flex items-center justify-between p-6 border-b',
          isDarkMode ? 'border-gray-700' : 'border-gray-300'
        ]"
      >
        <div>
          <h2 :class="['text-xl font-bold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
            Currency Status
          </h2>
          <p :class="['text-sm mt-1 font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            Part 61.57 Recent Flight Experience Requirements
          </p>
        </div>
        <button
          @click="close"
          :class="[
            'p-2 rounded-lg transition-colors',
            isDarkMode 
              ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          ]"
          aria-label="Close"
        >
          <Icon name="ri:close-line" size="24" />
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <div v-if="isLoading" class="flex items-center justify-center py-12">
          <Icon name="ri:loader-4-line" size="32" class="animate-spin" :class="isDarkMode ? 'text-blue-400' : 'text-blue-600'" />
        </div>

        <div v-else-if="error" :class="['p-4 rounded-lg', isDarkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200']">
          <p :class="['text-sm font-quicksand', isDarkMode ? 'text-red-300' : 'text-red-700']">
            {{ error }}
          </p>
        </div>

        <div v-else class="space-y-6">
          <!-- 90-Day Passenger Currency -->
          <div
            :class="[
              'rounded-lg border p-5',
              isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
            ]"
          >
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <Icon
                  :name="getStatusIcon(passengerCurrency?.status)"
                  :size="24"
                  :class="getStatusColor(passengerCurrency?.status)"
                />
                <div>
                  <h3 :class="['text-lg font-semibold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
                    90-Day Passenger Currency
                  </h3>
                  <p :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                    Part 61.57(a) - 3 takeoffs & 3 landings within 90 days
                  </p>
                </div>
              </div>
              <span
                :class="[
                  'px-3 py-1 rounded-full text-xs font-semibold font-quicksand',
                  getStatusBadgeColor(passengerCurrency?.status)
                ]"
              >
                {{ getStatusText(passengerCurrency?.status) }}
              </span>
            </div>

            <div v-if="passengerCurrency" class="space-y-3">
              <!-- Progress -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <span :class="['text-sm font-quicksand', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                      Takeoffs
                    </span>
                    <span :class="['text-sm font-semibold font-quicksand', isDarkMode ? 'text-gray-200' : 'text-gray-900']">
                      {{ passengerCurrency.takeoffs || 0 }} / 3
                    </span>
                  </div>
                  <div :class="['h-2 rounded-full overflow-hidden', isDarkMode ? 'bg-gray-600' : 'bg-gray-200']">
                    <div
                      :class="[
                        'h-full transition-all',
                        passengerCurrency.takeoffs >= 3 
                          ? (isDarkMode ? 'bg-green-500' : 'bg-green-600')
                          : (isDarkMode ? 'bg-yellow-500' : 'bg-yellow-500')
                      ]"
                      :style="{ width: `${Math.min((passengerCurrency.takeoffs || 0) / 3 * 100, 100)}%` }"
                    ></div>
                  </div>
                </div>
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <span :class="['text-sm font-quicksand', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                      Landings
                    </span>
                    <span :class="['text-sm font-semibold font-quicksand', isDarkMode ? 'text-gray-200' : 'text-gray-900']">
                      {{ passengerCurrency.landings || 0 }} / 3
                    </span>
                  </div>
                  <div :class="['h-2 rounded-full overflow-hidden', isDarkMode ? 'bg-gray-600' : 'bg-gray-200']">
                    <div
                      :class="[
                        'h-full transition-all',
                        passengerCurrency.landings >= 3 
                          ? (isDarkMode ? 'bg-green-500' : 'bg-green-600')
                          : (isDarkMode ? 'bg-yellow-500' : 'bg-yellow-500')
                      ]"
                      :style="{ width: `${Math.min((passengerCurrency.landings || 0) / 3 * 100, 100)}%` }"
                    ></div>
                  </div>
                </div>
              </div>

              <!-- Status Info -->
              <div class="flex items-center gap-4 pt-2 border-t" :class="isDarkMode ? 'border-gray-600' : 'border-gray-300'">
                <div>
                  <span :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                    Expiration:
                  </span>
                  <span :class="['text-sm font-semibold font-quicksand ml-1', isDarkMode ? 'text-gray-200' : 'text-gray-900']">
                    {{ formatDate(passengerCurrency.expirationDate) }}
                  </span>
                </div>
                <div v-if="passengerCurrency.isCurrent && passengerCurrency.daysRemaining !== undefined">
                  <span :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                    Days Remaining:
                  </span>
                  <span :class="['text-sm font-semibold font-quicksand ml-1', isDarkMode ? 'text-gray-200' : 'text-gray-900']">
                    {{ passengerCurrency.daysRemaining }}
                  </span>
                </div>
                <div>
                  <span :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                    Qualifying Entries:
                  </span>
                  <span :class="['text-sm font-semibold font-quicksand ml-1', isDarkMode ? 'text-gray-200' : 'text-gray-900']">
                    {{ passengerCurrency.qualifyingEntries.length }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 90-Day Night Currency -->
          <div
            :class="[
              'rounded-lg border p-5',
              isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
            ]"
          >
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <Icon
                  :name="getStatusIcon(nightCurrency?.status)"
                  :size="24"
                  :class="getStatusColor(nightCurrency?.status)"
                />
                <div>
                  <h3 :class="['text-lg font-semibold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
                    90-Day Night Currency
                  </h3>
                  <p :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                    Part 61.57(b) - 3 night takeoffs & 3 night landings to full stop within 90 days
                  </p>
                </div>
              </div>
              <span
                :class="[
                  'px-3 py-1 rounded-full text-xs font-semibold font-quicksand',
                  getStatusBadgeColor(nightCurrency?.status)
                ]"
              >
                {{ getStatusText(nightCurrency?.status) }}
              </span>
            </div>

            <div v-if="nightCurrency" class="space-y-3">
              <!-- Progress -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <span :class="['text-sm font-quicksand', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                      Night Takeoffs
                    </span>
                    <span :class="['text-sm font-semibold font-quicksand', isDarkMode ? 'text-gray-200' : 'text-gray-900']">
                      {{ nightCurrency.takeoffs || 0 }} / 3
                    </span>
                  </div>
                  <div :class="['h-2 rounded-full overflow-hidden', isDarkMode ? 'bg-gray-600' : 'bg-gray-200']">
                    <div
                      :class="[
                        'h-full transition-all',
                        nightCurrency.takeoffs >= 3 
                          ? (isDarkMode ? 'bg-green-500' : 'bg-green-600')
                          : (isDarkMode ? 'bg-yellow-500' : 'bg-yellow-500')
                      ]"
                      :style="{ width: `${Math.min((nightCurrency.takeoffs || 0) / 3 * 100, 100)}%` }"
                    ></div>
                  </div>
                </div>
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <span :class="['text-sm font-quicksand', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                      Night Landings
                    </span>
                    <span :class="['text-sm font-semibold font-quicksand', isDarkMode ? 'text-gray-200' : 'text-gray-900']">
                      {{ nightCurrency.landings || 0 }} / 3
                    </span>
                  </div>
                  <div :class="['h-2 rounded-full overflow-hidden', isDarkMode ? 'bg-gray-600' : 'bg-gray-200']">
                    <div
                      :class="[
                        'h-full transition-all',
                        nightCurrency.landings >= 3 
                          ? (isDarkMode ? 'bg-green-500' : 'bg-green-600')
                          : (isDarkMode ? 'bg-yellow-500' : 'bg-yellow-500')
                      ]"
                      :style="{ width: `${Math.min((nightCurrency.landings || 0) / 3 * 100, 100)}%` }"
                    ></div>
                  </div>
                </div>
              </div>

              <!-- Status Info -->
              <div class="flex items-center gap-4 pt-2 border-t" :class="isDarkMode ? 'border-gray-600' : 'border-gray-300'">
                <div>
                  <span :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                    Expiration:
                  </span>
                  <span :class="['text-sm font-semibold font-quicksand ml-1', isDarkMode ? 'text-gray-200' : 'text-gray-900']">
                    {{ formatDate(nightCurrency.expirationDate) }}
                  </span>
                </div>
                <div v-if="nightCurrency.isCurrent && nightCurrency.daysRemaining !== undefined">
                  <span :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                    Days Remaining:
                  </span>
                  <span :class="['text-sm font-semibold font-quicksand ml-1', isDarkMode ? 'text-gray-200' : 'text-gray-900']">
                    {{ nightCurrency.daysRemaining }}
                  </span>
                </div>
                <div>
                  <span :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                    Qualifying Entries:
                  </span>
                  <span :class="['text-sm font-semibold font-quicksand ml-1', isDarkMode ? 'text-gray-200' : 'text-gray-900']">
                    {{ nightCurrency.qualifyingEntries.length }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 6-Month Instrument Currency -->
          <div
            :class="[
              'rounded-lg border p-5',
              isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
            ]"
          >
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <Icon
                  :name="getStatusIcon(instrumentCurrency?.status)"
                  :size="24"
                  :class="getStatusColor(instrumentCurrency?.status)"
                />
                <div>
                  <h3 :class="['text-lg font-semibold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
                    6-Month Instrument Currency
                  </h3>
                  <p :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                    Part 61.57(c) - 6 approaches, holding procedures, and intercept/track tasks within 6 months
                  </p>
                </div>
              </div>
              <span
                :class="[
                  'px-3 py-1 rounded-full text-xs font-semibold font-quicksand',
                  getStatusBadgeColor(instrumentCurrency?.status)
                ]"
              >
                {{ getStatusText(instrumentCurrency?.status) }}
              </span>
            </div>

            <div v-if="instrumentCurrency" class="space-y-3">
              <!-- Progress -->
              <div class="space-y-3">
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <span :class="['text-sm font-quicksand', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
                      Approaches
                    </span>
                    <span :class="['text-sm font-semibold font-quicksand', isDarkMode ? 'text-gray-200' : 'text-gray-900']">
                      {{ instrumentCurrency.approaches || 0 }} / 6
                    </span>
                  </div>
                  <div :class="['h-2 rounded-full overflow-hidden', isDarkMode ? 'bg-gray-600' : 'bg-gray-200']">
                    <div
                      :class="[
                        'h-full transition-all',
                        instrumentCurrency.approaches >= 6 
                          ? (isDarkMode ? 'bg-green-500' : 'bg-green-600')
                          : (isDarkMode ? 'bg-yellow-500' : 'bg-yellow-500')
                      ]"
                      :style="{ width: `${Math.min((instrumentCurrency.approaches || 0) / 6 * 100, 100)}%` }"
                    ></div>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <span :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                      Holding Procedures:
                    </span>
                    <span :class="['text-sm font-semibold font-quicksand ml-1', isDarkMode ? 'text-gray-200' : 'text-gray-900']">
                      {{ instrumentCurrency.holdingProcedures || 0 }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Status Info -->
              <div class="flex items-center gap-4 pt-2 border-t" :class="isDarkMode ? 'border-gray-600' : 'border-gray-300'">
                <div>
                  <span :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                    Expiration:
                  </span>
                  <span :class="['text-sm font-semibold font-quicksand ml-1', isDarkMode ? 'text-gray-200' : 'text-gray-900']">
                    {{ formatDate(instrumentCurrency.expirationDate) }}
                  </span>
                </div>
                <div v-if="instrumentCurrency.isCurrent && instrumentCurrency.monthsRemaining !== undefined">
                  <span :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                    Months Remaining:
                  </span>
                  <span :class="['text-sm font-semibold font-quicksand ml-1', isDarkMode ? 'text-gray-200' : 'text-gray-900']">
                    {{ instrumentCurrency.monthsRemaining.toFixed(1) }}
                  </span>
                </div>
                <div>
                  <span :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                    Qualifying Entries:
                  </span>
                  <span :class="['text-sm font-semibold font-quicksand ml-1', isDarkMode ? 'text-gray-200' : 'text-gray-900']">
                    {{ instrumentCurrency.qualifyingEntries.length }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Annual Requirements (Framework) -->
          <div
            :class="[
              'rounded-lg border p-5',
              isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
            ]"
          >
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <Icon
                  name="ri:information-line"
                  :size="24"
                  :class="isDarkMode ? 'text-blue-400' : 'text-blue-600'"
                />
                <div>
                  <h3 :class="['text-lg font-semibold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
                    Annual Requirements
                  </h3>
                  <p :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                    Framework for future expansion - certificate/rating-specific requirements
                  </p>
                </div>
              </div>
              <span
                :class="[
                  'px-3 py-1 rounded-full text-xs font-semibold font-quicksand',
                  isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
                ]"
              >
                Framework
              </span>
            </div>

            <div v-if="annualRequirements" class="pt-2">
              <p :class="['text-sm font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
                Annual requirements vary by certificate and rating type. This section will be expanded in future updates.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CurrencyStatusType } from '~/utils/logbookTypes'
import type { CurrencyStatus, AnnualCurrencyStatus } from '~/utils/logbookTypes'

interface Props {
  isOpen: boolean
  isDarkMode?: boolean
  passengerCurrency: CurrencyStatus | null
  nightCurrency: CurrencyStatus | null
  instrumentCurrency: CurrencyStatus | null
  annualRequirements: AnnualCurrencyStatus | null
  isLoading?: boolean
  error?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  isDarkMode: false,
  isLoading: false,
  error: null
})

const emit = defineEmits<{
  close: []
}>()

const close = () => {
  emit('close')
}

const getStatusIcon = (status: CurrencyStatusType | undefined): string => {
  if (!status) return 'ri:question-line'
  switch (status) {
    case 'current':
      return 'ri:check-line'
    case 'expiring_soon':
      return 'ri:time-line'
    case 'expired':
      return 'ri:close-line'
    default:
      return 'ri:question-line'
  }
}

const getStatusColor = (status: CurrencyStatusType | undefined): string => {
  if (!status) return ''
  switch (status) {
    case 'current':
      return props.isDarkMode ? 'text-green-400' : 'text-green-600'
    case 'expiring_soon':
      return props.isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
    case 'expired':
      return props.isDarkMode ? 'text-red-400' : 'text-red-600'
    default:
      return ''
  }
}

const getStatusBadgeColor = (status: CurrencyStatusType | undefined): string => {
  if (!status) return props.isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
  switch (status) {
    case 'current':
      return props.isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
    case 'expiring_soon':
      return props.isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700'
    case 'expired':
      return props.isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'
    default:
      return props.isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
  }
}

const getStatusText = (status: CurrencyStatusType | undefined): string => {
  if (!status) return 'Unknown'
  switch (status) {
    case 'current':
      return 'Current'
    case 'expiring_soon':
      return 'Expiring Soon'
    case 'expired':
      return 'Expired'
    default:
      return 'Unknown'
  }
}

const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>
