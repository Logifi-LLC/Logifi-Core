import { computed, type ComputedRef } from 'vue'

export function useSettingsClasses(isDarkMode: ComputedRef<boolean> | boolean) {
  const dark = computed(() => (typeof isDarkMode === 'boolean' ? isDarkMode : isDarkMode.value))

  const section = computed(() =>
    dark.value
      ? 'rounded-lg border border-gray-700 bg-gray-800/50 p-4 sm:p-5'
      : 'rounded-lg border border-gray-200 bg-white p-4 sm:p-5'
  )

  const input = computed(() =>
    [
      'w-full rounded-lg border px-3 py-2 text-base sm:text-sm font-quicksand focus:outline-none focus:ring-2 transition-colors',
      dark.value
        ? 'border-gray-600 bg-gray-900 text-gray-100 focus:ring-blue-500/40'
        : 'border-gray-200 bg-white text-gray-900 focus:ring-blue-500',
    ].join(' ')
  )

  const listGroup = computed(() =>
    dark.value
      ? 'overflow-hidden rounded-xl border border-gray-700 bg-gray-800/60'
      : 'overflow-hidden rounded-xl border border-gray-200 bg-white'
  )

  const listGroupHeader = computed(() =>
    dark.value
      ? 'px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide font-quicksand text-gray-500'
      : 'px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide font-quicksand text-gray-500'
  )

  const listRow = computed(() =>
    [
      'flex w-full items-center gap-3 px-4 py-3.5 text-left font-quicksand transition-colors',
      dark.value ? 'hover:bg-gray-700/50 active:bg-gray-700/70' : 'hover:bg-gray-50 active:bg-gray-100',
    ].join(' ')
  )

  const listRowSeparator = computed(() =>
    dark.value ? 'border-b border-gray-700/80 last:border-b-0' : 'border-b border-gray-100 last:border-b-0'
  )

  const destructiveRow = computed(() =>
    dark.value ? 'text-red-400' : 'text-red-600'
  )

  const readOnlyField = computed(() =>
    [
      'w-full rounded-lg border px-3 py-2 text-sm font-quicksand',
      dark.value ? 'border-gray-600 bg-gray-900/80 text-gray-100' : 'border-gray-200 bg-gray-50 text-gray-900',
    ].join(' ')
  )

  const label = computed(() =>
    dark.value
      ? 'text-sm font-medium font-quicksand text-gray-300'
      : 'text-sm font-medium font-quicksand text-gray-700'
  )

  const helper = computed(() =>
    dark.value ? 'text-sm font-quicksand text-gray-400' : 'text-sm font-quicksand text-gray-500'
  )

  const sectionTitle = computed(() =>
    dark.value
      ? 'text-sm font-semibold font-quicksand text-gray-100'
      : 'text-sm font-semibold font-quicksand text-gray-900'
  )

  const btnPrimary =
    'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold font-quicksand bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors'

  const btnSecondary = computed(() =>
    dark.value
      ? 'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium font-quicksand border border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700 transition-colors'
      : 'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium font-quicksand border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors'
  )

  return {
    section,
    input,
    readOnlyField,
    label,
    helper,
    sectionTitle,
    btnPrimary,
    btnSecondary,
    listGroup,
    listGroupHeader,
    listRow,
    listRowSeparator,
    destructiveRow,
    dark,
  }
}
