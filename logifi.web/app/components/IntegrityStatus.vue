<template>
  <div class="flex items-center gap-2">
    <!-- Status indicator -->
    <button
      v-if="!showDetails"
      @click="showDetails = true"
      :class="[
        'p-1.5 rounded-lg transition-colors',
        isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
      ]"
      :title="statusText"
      aria-label="Integrity status"
    >
      <Icon
        v-if="status === 'valid'"
        name="ri:check-line"
        size="18"
        class="text-green-500"
      />
      <Icon
        v-else-if="status === 'invalid'"
        name="ri:error-warning-line"
        size="18"
        class="text-red-500"
      />
      <Icon
        v-else-if="status === 'validating'"
        name="ri:loader-4-line"
        size="18"
        class="animate-spin text-blue-500"
      />
      <Icon
        v-else
        name="ri:question-line"
        size="18"
        :class="isDarkMode ? 'text-gray-500' : 'text-gray-400'"
      />
    </button>

    <!-- Detailed view -->
    <div
      v-if="showDetails"
      :class="[
        'rounded-lg border p-4 min-w-[300px] max-w-md',
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
      ]"
    >
      <div class="flex items-start justify-between mb-3">
        <h3 :class="['text-sm font-semibold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
          Data Integrity Status
        </h3>
        <button
          @click="showDetails = false"
          :class="[
            'p-1 rounded transition-colors',
            isDarkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          ]"
          aria-label="Close"
        >
          <Icon name="ri:close-line" size="16" />
        </button>
      </div>

      <div v-if="isValidating" class="flex items-center gap-2 py-2">
        <Icon name="ri:loader-4-line" size="16" class="animate-spin text-blue-500" />
        <span :class="['text-sm font-quicksand', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
          Validating...
        </span>
      </div>

      <div v-else-if="integrityStatus" class="space-y-3">
        <!-- Status badge -->
        <div class="flex items-center gap-2">
          <Icon
            v-if="integrityStatus.isValid"
            name="ri:check-line"
            size="20"
            class="text-green-500"
          />
          <Icon
            v-else
            name="ri:error-warning-line"
            size="20"
            class="text-red-500"
          />
          <span
            :class="[
              'text-sm font-semibold font-quicksand',
              integrityStatus.isValid
                ? (isDarkMode ? 'text-green-400' : 'text-green-600')
                : (isDarkMode ? 'text-red-400' : 'text-red-600')
            ]"
          >
            {{ integrityStatus.isValid ? 'Valid' : 'Invalid' }}
          </span>
        </div>

        <!-- Hash comparison -->
        <div v-if="!integrityStatus.isValid && integrityStatus.currentHash && integrityStatus.computedHash" class="space-y-2">
          <div>
            <div :class="['text-xs font-semibold uppercase tracking-wide mb-1 font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              Stored Hash
            </div>
            <div
              :class="[
                'p-2 rounded text-xs font-mono break-all',
                isDarkMode ? 'bg-gray-900 text-red-300' : 'bg-gray-100 text-red-700'
              ]"
            >
              {{ integrityStatus.currentHash.substring(0, 32) }}...
            </div>
          </div>
          <div>
            <div :class="['text-xs font-semibold uppercase tracking-wide mb-1 font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
              Computed Hash
            </div>
            <div
              :class="[
                'p-2 rounded text-xs font-mono break-all',
                isDarkMode ? 'bg-gray-900 text-green-300' : 'bg-gray-100 text-green-700'
              ]"
            >
              {{ integrityStatus.computedHash.substring(0, 32) }}...
            </div>
          </div>
          <p :class="['text-xs font-quicksand', isDarkMode ? 'text-red-300' : 'text-red-600']">
            Hash mismatch detected. Entry data may have been tampered with.
          </p>
        </div>

        <!-- Last validated -->
        <div v-if="integrityStatus.lastValidated" class="pt-2 border-t" :class="isDarkMode ? 'border-gray-700' : 'border-gray-200'">
          <div :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
            Last validated: {{ formatTime(integrityStatus.lastValidated) }}
          </div>
        </div>
      </div>

      <div v-else class="py-2">
        <p :class="['text-sm font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-500']">
          Not yet validated
        </p>
      </div>

      <!-- Actions -->
      <div class="flex gap-2 mt-4 pt-3 border-t" :class="isDarkMode ? 'border-gray-700' : 'border-gray-200'">
        <button
          @click="handleValidate"
          :disabled="isValidating"
          :class="[
            'px-3 py-1.5 text-xs rounded-lg font-quicksand transition-colors flex-1',
            isValidating
              ? 'opacity-50 cursor-not-allowed'
              : isDarkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
          ]"
        >
          {{ isValidating ? 'Validating...' : 'Verify Integrity' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useDataIntegrity, type IntegrityStatus } from '~/composables/useDataIntegrity'

interface Props {
  entryId: string
  isDarkMode?: boolean
  autoValidate?: boolean
  localEntry?: any // Optional local entry data to help find UUID
}

const props = withDefaults(defineProps<Props>(), {
  isDarkMode: false,
  autoValidate: false,
  localEntry: undefined
})

const emit = defineEmits<{
  validated: [status: IntegrityStatus]
}>()

const {
  validateEntry,
  getIntegrityStatus
} = useDataIntegrity()

const showDetails = ref(false)
const isValidating = ref(false)
const integrityStatus = ref<IntegrityStatus | null>(null)

// Compute status for icon display
const status = computed<'valid' | 'invalid' | 'validating' | 'unknown'>(() => {
  if (isValidating.value) return 'validating'
  if (!integrityStatus.value) return 'unknown'
  return integrityStatus.value.isValid ? 'valid' : 'invalid'
})

const statusText = computed(() => {
  switch (status.value) {
    case 'valid':
      return 'Data integrity verified'
    case 'invalid':
      return 'Data integrity check failed'
    case 'validating':
      return 'Validating integrity...'
    default:
      return 'Not validated'
  }
})

// Load cached status on mount
watch(() => props.entryId, (entryId) => {
  if (entryId) {
    integrityStatus.value = getIntegrityStatus(entryId)
    if (props.autoValidate && !integrityStatus.value) {
      handleValidate()
    }
  }
}, { immediate: true })

const handleValidate = async () => {
  isValidating.value = true
  try {
    const result = await validateEntry(props.entryId, false, props.localEntry)
    integrityStatus.value = result
    emit('validated', result)
  } catch (error) {
    console.error('Error validating integrity:', error)
  } finally {
    isValidating.value = false
  }
}

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

// Expose validate method for parent components
defineExpose({
  validate: handleValidate,
  status: integrityStatus
})
</script>



