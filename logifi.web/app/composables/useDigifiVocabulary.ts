import { supabase } from '~/lib/supabase'
import type { useLogbookBuilderGrid } from '~/composables/useLogbookBuilderGrid'

interface VocabularyItem {
  vocabType: 'aircraft' | 'airport'
  value: string
}

export async function persistDigifiVocabulary(
  grid: ReturnType<typeof useLogbookBuilderGrid>,
  userId: string
): Promise<void> {
  const { data: profile } = await (supabase as any)
    .from('user_profiles')
    .select('digifi_learning_opt_in')
    .eq('id', userId)
    .single()

  if (!profile?.digifi_learning_opt_in) {
    return
  }

  const vocabItems = collectVocabularyFromGrid(grid)
  if (vocabItems.length === 0) return

  for (const item of vocabItems) {
    const { error: upsertError } = await (supabase as any)
      .from('digifi_user_vocabulary')
      .upsert(
        {
          user_id: userId,
          vocab_type: item.vocabType,
          value: item.value,
          last_seen_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,vocab_type,value',
          ignoreDuplicates: false,
        }
      )

    if (upsertError) {
      console.warn('[digifi-vocab] Failed to upsert vocabulary:', upsertError)
    }
  }
}

function collectVocabularyFromGrid(
  grid: ReturnType<typeof useLogbookBuilderGrid>
): VocabularyItem[] {
  const items: VocabularyItem[] = []
  const seenAircraft = new Set<string>()
  const seenAirports = new Set<string>()

  const columns = grid.columns.value
  const rows = grid.rows.value

  const identificationColumn = columns.find((col) => col.fieldKey === 'identification')
  const departureColumn = columns.find((col) => col.fieldKey === 'departure')
  const destinationColumn = columns.find((col) => col.fieldKey === 'destination')
  const routeColumn = columns.find((col) => col.fieldKey === 'route')

  for (const row of rows) {
    if (identificationColumn) {
      const registration = (row.cells[identificationColumn.id] ?? '').trim().toUpperCase()
      if (registration && !seenAircraft.has(registration)) {
        seenAircraft.add(registration)
        items.push({ vocabType: 'aircraft', value: registration })
      }
    }

    if (departureColumn) {
      const departure = (row.cells[departureColumn.id] ?? '').trim().toUpperCase()
      if (departure && !seenAirports.has(departure)) {
        seenAirports.add(departure)
        items.push({ vocabType: 'airport', value: departure })
      }
    }

    if (destinationColumn) {
      const destination = (row.cells[destinationColumn.id] ?? '').trim().toUpperCase()
      if (destination && !seenAirports.has(destination)) {
        seenAirports.add(destination)
        items.push({ vocabType: 'airport', value: destination })
      }
    }

    if (routeColumn) {
      const route = (row.cells[routeColumn.id] ?? '').trim()
      if (route) {
        const routeAirports = route
          .split(/[,;.\s]+/)
          .map((code) => code.trim().toUpperCase())
          .filter((code) => code.length >= 3 && code.length <= 4 && /^[A-Z0-9]+$/.test(code))
        
        for (const airport of routeAirports) {
          if (!seenAirports.has(airport)) {
            seenAirports.add(airport)
            items.push({ vocabType: 'airport', value: airport })
          }
        }
      }
    }
  }

  return items
}
