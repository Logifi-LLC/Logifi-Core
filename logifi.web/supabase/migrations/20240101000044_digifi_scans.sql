-- Digifi paper logbook scan sessions (temp image metadata, rate limiting)
CREATE TABLE digifi_scan_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  page_side TEXT NOT NULL CHECK (page_side IN ('left', 'right')),
  template_name TEXT,
  layout TEXT NOT NULL DEFAULT 'single' CHECK (layout IN ('single', 'two-page')),
  row_count INTEGER NOT NULL DEFAULT 10,
  model_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX idx_digifi_scan_sessions_user_created ON digifi_scan_sessions(user_id, created_at DESC);
CREATE INDEX idx_digifi_scan_sessions_expires ON digifi_scan_sessions(expires_at);

ALTER TABLE digifi_scan_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own digifi scan sessions"
  ON digifi_scan_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own digifi scan sessions"
  ON digifi_scan_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Private bucket for temporary scan images (24h retention via app/cron; lifecycle optional on host)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'digifi-scans',
  'digifi-scans',
  false,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own digifi scans"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'digifi-scans'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read own digifi scans"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'digifi-scans'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own digifi scans"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'digifi-scans'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
