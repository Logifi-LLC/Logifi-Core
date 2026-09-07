import { ref, computed } from 'vue'
import { supabase } from '~/lib/supabase'
import { useAuth } from '~/composables/useAuth'

type DigifiSink = 'logten' | 'logifi' | null

const preferredSink = ref<DigifiSink>(null)
const isLoading = ref(false)

export function useDigifiDestination() {
  const { user } = useAuth()

  const sinkLabel = computed(() => {
    if (preferredSink.value === 'logten') return 'LogTen Pro'
    if (preferredSink.value === 'logifi') return 'Logifi logbook'
    return 'Not set'
  })

  async function loadPreferredSink(): Promise<void> {
    if (!user.value?.id) return

    isLoading.value = true
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('digifi_preferred_sink')
        .eq('id', user.value.id)
        .single()

      if (error) throw error
      preferredSink.value = (data?.digifi_preferred_sink as DigifiSink) ?? null
    } catch (error) {
      console.error('Failed to load Digifi preferred sink:', error)
    } finally {
      isLoading.value = false
    }
  }

  async function setPreferredSink(sink: DigifiSink): Promise<void> {
    if (!user.value?.id) return

    isLoading.value = true
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ digifi_preferred_sink: sink })
        .eq('id', user.value.id)

      if (error) throw error
      preferredSink.value = sink
    } catch (error) {
      console.error('Failed to set Digifi preferred sink:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  return {
    preferredSink: computed(() => preferredSink.value),
    sinkLabel,
    isLoading: computed(() => isLoading.value),
    loadPreferredSink,
    setPreferredSink,
  }
}
