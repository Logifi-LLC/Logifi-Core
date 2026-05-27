-- Digifi companion capture sessions and photos for phone-to-web uploads
CREATE TABLE digifi_capture_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  max_photos INTEGER NOT NULL DEFAULT 30 CHECK (max_photos > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '20 minutes'),
  closed_at TIMESTAMPTZ
);

CREATE TABLE digifi_capture_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES digifi_capture_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size > 0),
  capture_source TEXT NOT NULL DEFAULT 'mobile-web' CHECK (capture_source IN ('mobile-web', 'desktop-upload')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_digifi_capture_sessions_user_created
  ON digifi_capture_sessions(user_id, created_at DESC);
CREATE INDEX idx_digifi_capture_sessions_expires
  ON digifi_capture_sessions(expires_at);
CREATE INDEX idx_digifi_capture_sessions_token
  ON digifi_capture_sessions(token);
CREATE INDEX idx_digifi_capture_photos_session_created
  ON digifi_capture_photos(session_id, created_at DESC);
CREATE INDEX idx_digifi_capture_photos_user_created
  ON digifi_capture_photos(user_id, created_at DESC);

ALTER TABLE digifi_capture_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE digifi_capture_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own digifi capture sessions"
  ON digifi_capture_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own digifi capture sessions"
  ON digifi_capture_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own digifi capture sessions"
  ON digifi_capture_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own digifi capture photos"
  ON digifi_capture_photos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own digifi capture photos"
  ON digifi_capture_photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'digifi-capture',
  'digifi-capture',
  false,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can read own digifi capture objects"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'digifi-capture'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can upload own digifi capture objects"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'digifi-capture'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own digifi capture objects"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'digifi-capture'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

ALTER PUBLICATION supabase_realtime ADD TABLE digifi_capture_photos;
