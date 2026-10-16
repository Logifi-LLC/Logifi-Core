import { ref } from 'vue'
import { REFERRAL_PROMPT_DISMISSED_KEY } from '../../shared/referrals'

export const referralPromptOpen = ref(false)

export function noteDigifiScanSucceeded(): void {
  if (typeof window === 'undefined') return
  try {
    if (window.localStorage.getItem(REFERRAL_PROMPT_DISMISSED_KEY) === '1') return
  } catch {
    return
  }
  referralPromptOpen.value = true
}

export function dismissReferralPrompt(): void {
  referralPromptOpen.value = false
  try {
    window.localStorage.setItem(REFERRAL_PROMPT_DISMISSED_KEY, '1')
  } catch {
    // Still closed for this page view.
  }
}
