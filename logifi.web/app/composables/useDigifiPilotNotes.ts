import { ref } from 'vue'
import { supabase } from '~/lib/supabase'
import { useAuth } from '~/composables/useAuth'
import { extractDigifiPilotNotesPriors, type DigifiPilotNotesPriors } from '~/utils/digifiPilotNotesExtraction'

export function useDigifiPilotNotes() {
  const { user } = useAuth()
  const notes = ref<string>('')
  const priors = ref<DigifiPilotNotesPriors | null>(null)
  const isLoading = ref(false)
  const isSaving = ref(false)

  async function loadNotes(): Promise<void> {
    if (!user.value?.id) return

    isLoading.value = true
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('digifi_pilot_notes, digifi_pilot_notes_priors')
        .eq('id', user.value.id)
        .single()

      if (error) throw error
      
      notes.value = data?.digifi_pilot_notes || ''
      priors.value = data?.digifi_pilot_notes_priors as DigifiPilotNotesPriors | null
    } catch (error) {
      console.error('Failed to load Digifi pilot notes:', error)
    } finally {
      isLoading.value = false
    }
  }

  async function saveNotes(newNotes: string): Promise<void> {
    if (!user.value?.id) return

    isSaving.value = true
    try {
      // Extract priors from notes
      const extractedPriors = extractDigifiPilotNotesPriors(newNotes)

      const { error } = await supabase
        .from('user_profiles')
        .update({
          digifi_pilot_notes: newNotes || null,
          digifi_pilot_notes_priors: newNotes ? extractedPriors : null,
        })
        .eq('id', user.value.id)

      if (error) throw error
      
      notes.value = newNotes
      priors.value = newNotes ? extractedPriors : null
    } catch (error) {
      console.error('Failed to save Digifi pilot notes:', error)
      throw error
    } finally {
      isSaving.value = false
    }
  }

  async function eraseNotes(): Promise<void> {
    await saveNotes('')
  }

  return {
    notes,
    priors,
    isLoading,
    isSaving,
    loadNotes,
    saveNotes,
    eraseNotes,
  }
}
