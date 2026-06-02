<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PaymentMethod } from '~/utils/creditsPricing'
import { useDigifiCredits } from '~/composables/useDigifiCredits'
import { useTheme } from '~/composables/useTheme'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
  purchased: [creditsAdded: number]
}>()

const { isDark: isDarkMode } = useTheme()
const {
  purchaseCredits,
  isPurchaseValid,
  calculateTotalDollars,
  minPagesForMethod,
  rateDollarsForMethod,
} = useDigifiCredits()

type Step = 'form' | 'loading' | 'success'

const paymentMethod = ref<PaymentMethod>('lightning')
const pageCount = ref(25)
const step = ref<Step>('form')
const successCreditsAdded = ref(0)
const checkoutError = ref<string | null>(null)

const rateLabel = computed(() => `$${rateDollarsForMethod(paymentMethod.value).toFixed(2)}`)
const totalLabel = computed(() =>
  `$${calculateTotalDollars(paymentMethod.value, pageCount.value).toFixed(2)}`
)
const canCheckout = computed(() => isPurchaseValid(paymentMethod.value, pageCount.value))

const minHint = computed(() => {
  const min = minPagesForMethod(paymentMethod.value)
  if (paymentMethod.value === 'stripe') {
    return `Credit card purchases require at least ${min} pages.`
  }
  return `Minimum ${min} page.`
})

watch(paymentMethod, (method) => {
  const min = minPagesForMethod(method)
  if (pageCount.value < min) {
    pageCount.value = min
  }
})

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      step.value = 'form'
      checkoutError.value = null
      successCreditsAdded.value = 0
      paymentMethod.value = 'lightning'
      pageCount.value = 5
    }
  }
)

function decrementPages() {
  const min = minPagesForMethod(paymentMethod.value)
  pageCount.value = Math.max(min, pageCount.value - 1)
}

function incrementPages() {
  pageCount.value = Math.min(10_000, pageCount.value + 1)
}

function onPageInput(event: Event) {
  const raw = (event.target as HTMLInputElement).value
  const parsed = Number.parseInt(raw, 10)
  if (Number.isNaN(parsed)) return
  pageCount.value = Math.max(1, Math.min(10_000, parsed))
}

async function proceedToPayment() {
  if (!canCheckout.value) return
  step.value = 'loading'
  checkoutError.value = null
  try {
    const result = await purchaseCredits({
      numberOfCredits: pageCount.value,
      paymentMethod: paymentMethod.value,
    })
    successCreditsAdded.value = result.numberOfCredits
    step.value = 'success'
    emit('purchased', result.numberOfCredits)
    setTimeout(() => {
      emit('close')
    }, 1500)
  } catch (err: unknown) {
    step.value = 'form'
    checkoutError.value =
      (err as { data?: { statusMessage?: string } })?.data?.statusMessage ??
      (err instanceof Error ? err.message : 'Payment failed')
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm"
      @click.self="emit('close')"
    >
      <div
        :class="[
          'relative w-full max-w-lg rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden',
          isDarkMode
            ? 'bg-gray-900 border border-gray-800'
            : 'bg-white border border-gray-100',
        ]"
        role="dialog"
        aria-labelledby="digifi-credits-modal-title"
        aria-modal="true"
        @click.stop
      >
        <div
          class="flex items-center justify-between px-6 py-4 border-b"
          :class="isDarkMode ? 'border-gray-800' : 'border-gray-100'"
        >
          <h2
            id="digifi-credits-modal-title"
            :class="['text-lg font-bold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']"
          >
            Add Digifi Credits
          </h2>
          <button
            type="button"
            class="p-2 rounded-full transition-colors"
            :class="isDarkMode ? 'text-gray-500 hover:text-white hover:bg-gray-800' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'"
            aria-label="Close"
            :disabled="step === 'loading'"
            @click="emit('close')"
          >
            <Icon name="ri:close-line" size="20" />
          </button>
        </div>

        <div v-if="step === 'success'" class="p-10 text-center space-y-3">
          <Icon name="ri:checkbox-circle-fill" class="mx-auto text-green-500" size="48" />
          <p :class="['text-lg font-semibold font-quicksand', isDarkMode ? 'text-white' : 'text-gray-900']">
            Success! {{ successCreditsAdded }} credits added
          </p>
        </div>

        <div v-else-if="step === 'loading'" class="p-12 flex flex-col items-center gap-4">
          <Icon name="ri:loader-4-line" class="animate-spin text-blue-500" size="40" />
          <p :class="['text-sm font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
            Processing payment…
          </p>
        </div>

        <div v-else class="p-6 space-y-6">
          <div class="space-y-2">
            <label
              :class="['block text-sm font-semibold font-quicksand', isDarkMode ? 'text-gray-300' : 'text-gray-700']"
            >
            Number of credits
            </label>
            <div class="flex items-center gap-3">
              <button
                type="button"
                class="h-10 w-10 rounded-lg border font-bold text-lg"
                :class="isDarkMode ? 'border-gray-700 text-gray-200 hover:bg-gray-800' : 'border-gray-200 text-gray-800 hover:bg-gray-50'"
                aria-label="Decrease pages"
                @click="decrementPages"
              >
                −
              </button>
              <input
                :value="pageCount"
                type="number"
                min="1"
                max="10000"
                class="flex-1 h-10 text-center rounded-lg border font-quicksand font-semibold"
                :class="isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'"
                @input="onPageInput"
              >
              <button
                type="button"
                class="h-10 w-10 rounded-lg border font-bold text-lg"
                :class="isDarkMode ? 'border-gray-700 text-gray-200 hover:bg-gray-800' : 'border-gray-200 text-gray-800 hover:bg-gray-50'"
                aria-label="Increase pages"
                @click="incrementPages"
              >
                +
              </button>
            </div>
            <p :class="['text-xs font-quicksand', isDarkMode ? 'text-gray-500' : 'text-gray-500']">
              {{ minHint }}
            </p>
          </div>

          <div class="space-y-2">
            <p :class="['text-sm font-semibold font-quicksand', isDarkMode ? 'text-gray-300' : 'text-gray-700']">
              Payment method
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                class="relative text-left p-4 rounded-xl border-2 transition-all"
                :class="[
                  paymentMethod === 'stripe'
                    ? isDarkMode
                      ? 'border-blue-500 bg-blue-600/10'
                      : 'border-blue-600 bg-blue-50'
                    : isDarkMode
                      ? 'border-gray-700 hover:border-gray-600'
                      : 'border-gray-200 hover:border-gray-300',
                ]"
                @click="paymentMethod = 'stripe'"
              >
                <p :class="['font-bold font-quicksand text-sm', isDarkMode ? 'text-white' : 'text-gray-900']">
                  Credit Card (Stripe)
                </p>
                <p :class="['text-xs mt-1 font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
                  $0.40 per page
                </p>
              </button>
              <button
                type="button"
                class="relative text-left p-4 rounded-xl border-2 transition-all"
                :class="[
                  paymentMethod === 'lightning'
                    ? isDarkMode
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-amber-500 bg-amber-50'
                    : isDarkMode
                      ? 'border-gray-700 hover:border-gray-600'
                      : 'border-gray-200 hover:border-gray-300',
                ]"
                @click="paymentMethod = 'lightning'"
              >
                <span
                  class="absolute top-2 right-2 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500 text-white"
                >
                  25% Savings!
                </span>
                <p :class="['font-bold font-quicksand text-sm', isDarkMode ? 'text-white' : 'text-gray-900']">
                  Bitcoin Lightning ⚡
                </p>
                <p :class="['text-xs mt-1 font-quicksand', isDarkMode ? 'text-gray-400' : 'text-gray-600']">
                  $0.30 per page
                </p>
              </button>
            </div>
          </div>

          <p
            :class="[
              'text-center text-base font-semibold font-quicksand py-3 rounded-xl',
              isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-gray-50 text-gray-900',
            ]"
          >
            {{ pageCount }} × {{ rateLabel }} = {{ totalLabel }}
          </p>

          <p v-if="checkoutError" class="text-sm text-red-500 font-quicksand text-center">
            {{ checkoutError }}
          </p>

          <button
            type="button"
            class="w-full py-3 rounded-xl font-bold font-quicksand text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :class="[
              isDarkMode
                ? 'bg-blue-600 text-white hover:bg-blue-500'
                : 'bg-blue-600 text-white hover:bg-blue-700',
            ]"
            :disabled="!canCheckout"
            @click="proceedToPayment"
          >
            Proceed to Payment
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
