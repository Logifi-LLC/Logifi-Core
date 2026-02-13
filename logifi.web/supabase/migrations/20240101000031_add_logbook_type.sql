-- Add logbook type: 'flight' or 'simulator' for separate logbook views
ALTER TABLE log_entries
  ADD COLUMN IF NOT EXISTS logbook_type TEXT DEFAULT 'flight';

COMMENT ON COLUMN log_entries.logbook_type IS 'flight = airplane logbook, simulator = simulator logbook (FFS/FTD/ATD)';
