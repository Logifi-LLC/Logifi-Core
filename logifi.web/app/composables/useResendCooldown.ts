import { ref, computed, onUnmounted } from 'vue'
import {
  AUTH_RESEND_COOLDOWN_SECONDS,
  cooldownEndsAt,
  remainingCooldownSeconds,
} from '~/utils/resendCooldown'

export function useResendCooldown(cooldownSeconds: number = AUTH_RESEND_COOLDOWN_SECONDS) {
  const cooldownEndsAtMs = ref<number | null>(null)
  const nowMs = ref(Date.now())
  let timer: ReturnType<typeof setInterval> | null = null

  function tickNow() {
    nowMs.value = Date.now()
    if (cooldownEndsAtMs.value != null && remainingCooldownSeconds(cooldownEndsAtMs.value, nowMs.value) === 0) {
      cooldownEndsAtMs.value = null
      stopTicker()
    }
  }

  function startTicker() {
    if (timer) return
    timer = setInterval(tickNow, 500)
  }

  function stopTicker() {
    if (!timer) return
    clearInterval(timer)
    timer = null
  }

  const secondsRemaining = computed(() =>
    remainingCooldownSeconds(cooldownEndsAtMs.value, nowMs.value)
  )

  const canResend = computed(() => secondsRemaining.value === 0)

  function startCooldown() {
    cooldownEndsAtMs.value = cooldownEndsAt(Date.now(), cooldownSeconds)
    startTicker()
    tickNow()
  }

  function resetCooldown() {
    cooldownEndsAtMs.value = null
    stopTicker()
  }

  onUnmounted(stopTicker)

  return {
    secondsRemaining,
    canResend,
    startCooldown,
    resetCooldown,
  }
}
