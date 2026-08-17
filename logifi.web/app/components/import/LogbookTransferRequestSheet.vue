<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { LOGBOOK_TRANSFER_SOURCE_OPTIONS } from '../../../shared/logbookTransfer'
import { useAuth } from '~/composables/useAuth'
import { useLogbookTransferRequest } from '~/composables/useLogbookTransferRequest'

const props = defineProps<{
  isOpen: boolean
  isDarkMode: boolean
}>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const { user } = useAuth()
const { hasPendingRequest, submitRequest, refreshStatus } = useLogbookTransferRequest()

const sourceApp = ref('')
const note = ref('')
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)
const justSubmitted = ref(false)

const userEmail = computed(() => user.value?.email ?? '')

watch(
  () => props.isOpen,
  async (open) => {
    if (!open) return
    sourceApp.value = ''
    note.value = ''
    errorMessage.value = null
    justSubmitted.value = false
    isSubmitting.value = false
    await refreshStatus()
  },
)

async function onSubmit() {
  if (hasPendingRequest.value || justSubmitted.value) {
    emit('close')
    return
  }

  errorMessage.value = null
  isSubmitting.value = true
  try {
    await submitRequest({
      sourceApp: sourceApp.value || undefined,
      note: note.value.trim() || undefined,
    })
    justSubmitted.value = true
    emit('success')
  } catch (err) {
    errorMessage.value =
      err instanceof Error ? err.message : 'Could not submit request. Try again.'
  } finally {
    isSubmitting.value = false
  }
}

function close() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      @click.self="close"
    >
      <div
        class="w-full max-w-md rounded-2xl p-5 shadow-xl font-quicksand"
        :class="isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'"
        role="dialog"
        aria-labelledby="logbook-transfer-sheet-title"
        aria-modal="true"
        @click.stop
      >
        <h2 id="logbook-transfer-sheet-title" class="text-lg font-bold">
          Logbook transfer
        </h2>
        <p
          class="mt-1 text-sm"
          :class="isDarkMode ? 'text-gray-400' : 'text-gray-500'"
        >
          We'll email you to schedule a walkthrough. Send your export when we connect.
        </p>

        <div
          v-if="hasPendingRequest || justSubmitted"
          class="mt-4 rounded-xl border p-4 text-sm"
          :class="
            isDarkMode
              ? 'border-green-800/60 bg-green-950/30 text-green-200'
              : 'border-green-200 bg-green-50 text-green-800'
          "
        >
          Requested — we'll reach out at {{ userEmail }} to schedule.
        </div>

        <form v-else class="mt-4 space-y-4" @submit.prevent="onSubmit">
          <div>
            <label
              class="block text-sm font-medium mb-1.5"
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
            >
              Email
            </label>
            <input
              type="email"
              :value="userEmail"
              readonly
              class="w-full rounded-lg border px-3 py-2 text-sm"
              :class="
                isDarkMode
                  ? 'border-gray-700 bg-gray-800/80 text-gray-300'
                  : 'border-gray-200 bg-gray-50 text-gray-600'
              "
            />
          </div>

          <div>
            <label
              for="transfer-source"
              class="block text-sm font-medium mb-1.5"
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
            >
              Coming from
            </label>
            <select
              id="transfer-source"
              v-model="sourceApp"
              class="w-full rounded-lg border px-3 py-2 text-sm"
              :class="
                isDarkMode
                  ? 'border-gray-600 bg-gray-900 text-gray-100'
                  : 'border-gray-200 bg-white text-gray-900'
              "
            >
              <option
                v-for="opt in LOGBOOK_TRANSFER_SOURCE_OPTIONS"
                :key="opt.value || 'unknown'"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>

          <div>
            <label
              for="transfer-note"
              class="block text-sm font-medium mb-1.5"
              :class="isDarkMode ? 'text-gray-300' : 'text-gray-700'"
            >
              Note <span class="font-normal text-gray-500">(optional)</span>
            </label>
            <textarea
              id="transfer-note"
              v-model="note"
              rows="2"
              maxlength="500"
              placeholder="Rough hour count, export issues, etc."
              class="w-full rounded-lg border px-3 py-2 text-sm resize-none"
              :class="
                isDarkMode
                  ? 'border-gray-600 bg-gray-900 text-gray-100 placeholder-gray-500'
                  : 'border-gray-200 bg-white text-gray-900 placeholder-gray-400'
              "
            />
          </div>

          <p
            v-if="errorMessage"
            class="text-sm"
            :class="isDarkMode ? 'text-red-400' : 'text-red-600'"
          >
            {{ errorMessage }}
          </p>

          <div class="flex gap-2 pt-1">
            <button
              type="button"
              class="flex-1 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors"
              :class="
                isDarkMode
                  ? 'border-gray-600 text-gray-200 hover:bg-gray-800'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              "
              @click="close"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              :disabled="isSubmitting || !userEmail"
            >
              {{ isSubmitting ? 'Submitting…' : 'Request transfer' }}
            </button>
          </div>
        </form>

        <button
          v-if="hasPendingRequest || justSubmitted"
          type="button"
          class="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          @click="close"
        >
          Done
        </button>
      </div>
    </div>
  </Teleport>
</template>
