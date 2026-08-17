-- Logbook transfer requests: user asks for reviewed import help (early stage = email/Slack follow-up).

CREATE TABLE logbook_transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  source_app TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'contacted', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_logbook_transfer_requests_user_id
  ON logbook_transfer_requests(user_id, created_at DESC);

CREATE INDEX idx_logbook_transfer_requests_status
  ON logbook_transfer_requests(status, created_at DESC);

CREATE UNIQUE INDEX idx_logbook_transfer_requests_one_pending_per_user
  ON logbook_transfer_requests(user_id)
  WHERE status = 'pending';

ALTER TABLE logbook_transfer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logbook transfer requests"
  ON logbook_transfer_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logbook transfer requests"
  ON logbook_transfer_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE logbook_transfer_requests IS
  'User requests for reviewed logbook import / transfer (manual follow-up until self-serve portal exists).';
