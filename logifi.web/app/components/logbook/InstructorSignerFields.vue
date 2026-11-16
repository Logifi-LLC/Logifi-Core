<template>
  <div class="space-y-3">
    <label :for="`${idPrefix}-name`" class="block text-sm">
      <span :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">Instructor name</span>
      <input
        :id="`${idPrefix}-name`"
        :value="name"
        type="text"
        autocomplete="name"
        placeholder="Full name"
        :readonly="nameLocked"
        :disabled="disabled"
        :class="inputClass"
        :aria-invalid="nameError ? 'true' : 'false'"
        :aria-describedby="nameError ? `${idPrefix}-name-error` : undefined"
        @input="onNameInput"
        @blur="emit('blur-name')"
      />
      <p v-if="nameError" :id="`${idPrefix}-name-error`" class="mt-1 text-xs text-red-600 dark:text-red-300">
        {{ nameError }}
      </p>
    </label>
    <label :for="`${idPrefix}-certificate`" class="block text-sm">
      <span :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">Certificate #</span>
      <input
        :id="`${idPrefix}-certificate`"
        :value="certificateNumber"
        type="text"
        autocomplete="off"
        placeholder="CFI / certificate number"
        :disabled="disabled"
        :class="inputClass"
        :aria-invalid="certificateError ? 'true' : 'false'"
        :aria-describedby="certificateError ? `${idPrefix}-certificate-error` : undefined"
        @input="onCertInput"
        @blur="emit('blur-certificate')"
      />
      <p
        v-if="certificateError"
        :id="`${idPrefix}-certificate-error`"
        class="mt-1 text-xs text-red-600 dark:text-red-300"
      >
        {{ certificateError }}
      </p>
    </label>
    <label :for="`${idPrefix}-expiration`" class="block text-sm">
      <span :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'">Certificate expiration</span>
      <input
        :id="`${idPrefix}-expiration`"
        :value="expiration"
        type="date"
        :disabled="disabled"
        :class="inputClass"
        :aria-invalid="expirationError ? 'true' : 'false'"
        :aria-describedby="expirationError ? `${idPrefix}-expiration-error` : undefined"
        @input="onExpInput"
        @blur="emit('blur-expiration')"
      />
      <p
        v-if="expirationError"
        :id="`${idPrefix}-expiration-error`"
        class="mt-1 text-xs text-red-600 dark:text-red-300"
      >
        {{ expirationError }}
      </p>
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  idPrefix: string
  isDarkMode: boolean
  name: string
  certificateNumber: string
  expiration: string
  nameError?: string | null
  certificateError?: string | null
  expirationError?: string | null
  nameLocked?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:name': [value: string]
  'update:certificateNumber': [value: string]
  'update:expiration': [value: string]
  'blur-name': []
  'blur-certificate': []
  'blur-expiration': []
}>()

const inputClass = computed(() =>
  [
    'mt-1 min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm',
    props.isDarkMode
      ? 'border-gray-600 bg-gray-900 text-gray-100'
      : 'border-gray-300 bg-white text-gray-900',
    props.nameLocked ? 'opacity-90' : '',
  ].join(' ')
)

function onNameInput(event: Event) {
  if (props.nameLocked) return
  emit('update:name', (event.target as HTMLInputElement).value)
}

function onCertInput(event: Event) {
  emit('update:certificateNumber', (event.target as HTMLInputElement).value)
}

function onExpInput(event: Event) {
  emit('update:expiration', (event.target as HTMLInputElement).value)
}
</script>
