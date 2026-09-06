import { ref, computed } from 'vue'
import { supabase } from '~/lib/supabase'
import { useAuth } from '~/composables/useAuth'

export function useDigifiLearning() {
  const { user } = useAuth()
  const optInStatus = ref<boolean | null>(null)
  const isLoading = ref(false)

  const isOptedIn = computed(() => optInStatus.value === true)

  async function loadOptInStatus(): Promise<void> {
    if (!user.value?.id) {
      optInStatus.value = null
      return
    }

    try {
      const { data, error } = await (supabase as any)
        .from('user_profiles')
        .select('digifi_learning_opt_in')
        .eq('id', user.value.id)
        .single()

      if (error) throw error
      optInStatus.value = data?.digifi_learning_opt_in ?? false
    } catch (error) {
      console.error('[digifi-learning] Failed to load opt-in status:', error)
      optInStatus.value = false
    }
  }

  async function setOptIn(optIn: boolean): Promise<void> {
    if (!user.value?.id) return

    isLoading.value = true
    try {
      const update: any = {
        digifi_learning_opt_in: optIn,
      }
      if (optIn) {
        update.digifi_learning_opted_in_at = new Date().toISOString()
      }

      const { error } = await (supabase as any)
        .from('user_profiles')
        .update(update)
        .eq('id', user.value.id)

      if (error) throw error
      optInStatus.value = optIn
    } catch (error) {
      console.error('[digifi-learning] Failed to update opt-in status:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function eraseDigifiLearningData(): Promise<void> {
    if (!user.value?.id) return

    isLoading.value = true
    try {
      const [feedbackResult, vocabResult] = await Promise.allSettled([
        (supabase as any)
          .from('digifi_correction_feedback')
          .delete()
          .eq('user_id', user.value.id),
        (supabase as any)
          .from('digifi_user_vocabulary')
          .delete()
          .eq('user_id', user.value.id),
      ])

      if (feedbackResult.status === 'rejected') {
        console.error('[digifi-learning] Failed to delete feedback:', feedbackResult.reason)
      }
      if (vocabResult.status === 'rejected') {
        console.error('[digifi-learning] Failed to delete vocabulary:', vocabResult.reason)
      }

      if (feedbackResult.status === 'rejected' || vocabResult.status === 'rejected') {
        throw new Error('Failed to erase some Digifi learning data')
      }
    } finally {
      isLoading.value = false
    }
  }

  return {
    optInStatus,
    isOptedIn,
    isLoading,
    loadOptInStatus,
    setOptIn,
    eraseDigifiLearningData,
  }
}
