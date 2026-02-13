-- Add optional tags column to log_entries (e.g. Checkride, Flight Review, IPC, Part 135)
ALTER TABLE log_entries
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

COMMENT ON COLUMN log_entries.tags IS 'Optional entry tags: Checkride, Flight Review, IPC, 61.58, NVG, Part 135, etc.';
