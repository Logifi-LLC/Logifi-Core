/**
 * @deprecated Keyboard handling moved to LogbookBuilderGrid (Excel-style navigate/edit modes).
 * Kept as a no-op so existing imports do not break during migration.
 */
export function useLogbookBuilderKeyboard(_options?: unknown) {
  // Intentionally empty — grid owns all builder shortcuts.
}
