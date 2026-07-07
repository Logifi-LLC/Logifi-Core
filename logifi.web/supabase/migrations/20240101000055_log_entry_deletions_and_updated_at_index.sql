-- Delta sync: index for updated_at pulls and tombstone table for delete propagation.

CREATE INDEX IF NOT EXISTS idx_log_entries_user_updated_at
  ON log_entries(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS log_entry_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_log_entry_deletions_user_entry
  ON log_entry_deletions(user_id, entry_id);

CREATE INDEX IF NOT EXISTS idx_log_entry_deletions_user_deleted_at
  ON log_entry_deletions(user_id, deleted_at DESC);

ALTER TABLE log_entry_deletions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own log entry deletions"
  ON log_entry_deletions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own log entry deletions"
  ON log_entry_deletions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE log_entry_deletions IS 'Tombstones for log entry deletes; used by delta inbound sync.';
