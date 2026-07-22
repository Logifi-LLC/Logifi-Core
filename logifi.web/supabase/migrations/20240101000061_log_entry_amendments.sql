-- Amendment / supersede links: corrected entry points at the signed original it replaces.
-- Original signed rows stay immutable; superseded state is derived from this FK.

ALTER TABLE log_entries
  ADD COLUMN IF NOT EXISTS amends_entry_id UUID REFERENCES log_entries(id);

COMMENT ON COLUMN log_entries.amends_entry_id IS
  'When set, this entry amends (supersedes) the referenced log entry for totals and display';

CREATE INDEX IF NOT EXISTS idx_log_entries_amends_entry_id
  ON log_entries (user_id, amends_entry_id)
  WHERE amends_entry_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_log_entries_one_amendment_per_original
  ON log_entries (user_id, amends_entry_id)
  WHERE amends_entry_id IS NOT NULL;
