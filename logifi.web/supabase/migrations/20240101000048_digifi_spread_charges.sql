-- One Digifi credit per logbook spread (left + right + rescans within same spreadId)

ALTER TABLE digifi_scan_sessions
  ADD COLUMN IF NOT EXISTS spread_id UUID;

CREATE INDEX IF NOT EXISTS idx_digifi_scan_sessions_user_spread
  ON digifi_scan_sessions(user_id, spread_id, page_side);

CREATE TABLE IF NOT EXISTS digifi_spread_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spread_id UUID NOT NULL,
  layout TEXT NOT NULL CHECK (layout IN ('single', 'two-page')),
  credits_charged INTEGER NOT NULL DEFAULT 1 CHECK (credits_charged > 0),
  first_scan_session_id UUID REFERENCES digifi_scan_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, spread_id)
);

CREATE INDEX IF NOT EXISTS idx_digifi_spread_charges_user_created
  ON digifi_spread_charges(user_id, created_at DESC);

ALTER TABLE digifi_spread_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own digifi spread charges"
  ON digifi_spread_charges FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON TABLE digifi_spread_charges IS 'Tracks which builder spreadId consumed a Digifi credit (1 per spread session)';

COMMENT ON COLUMN user_profiles.credits IS 'Digifi spread scan credits (1 credit per logbook spread: left+right+rescans)';
