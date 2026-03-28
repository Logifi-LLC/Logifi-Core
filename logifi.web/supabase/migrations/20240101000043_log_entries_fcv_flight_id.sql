-- Store FC View flight ID for deduplication; one log entry per FC View flight
ALTER TABLE log_entries
  ADD COLUMN fcv_flight_id TEXT NULL;

COMMENT ON COLUMN log_entries.fcv_flight_id IS 'External FC View flight ID for preventing duplicate imports.';

CREATE UNIQUE INDEX idx_log_entries_fcv_flight_id_unique
  ON log_entries(fcv_flight_id)
  WHERE fcv_flight_id IS NOT NULL;
