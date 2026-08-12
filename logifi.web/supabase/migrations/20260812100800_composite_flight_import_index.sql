-- Composite unique index for external import flight ids (FC View + Flica/AeroDataBox).
-- Replaces global unique on fcv_flight_id so different import_source values may reuse the column safely.

DROP INDEX IF EXISTS idx_log_entries_fcv_flight_id_unique;

CREATE UNIQUE INDEX idx_log_entries_user_source_fcv_flight_id_unique
  ON log_entries (user_id, import_source, fcv_flight_id)
  WHERE fcv_flight_id IS NOT NULL AND import_source IS NOT NULL;

COMMENT ON COLUMN log_entries.fcv_flight_id IS
  'External import flight id for deduplication (FC View id or synthetic Flica key). Unique per user and import_source.';
