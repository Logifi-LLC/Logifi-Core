-- Export records table
CREATE TABLE exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Export details
  export_type TEXT NOT NULL CHECK (export_type IN ('pdf', 'csv', 'json', 'faa_form_8710', 'custom')),
  format_version TEXT NOT NULL DEFAULT '1.0',
  file_path TEXT, -- Path in storage bucket
  file_size BIGINT,
  mime_type TEXT,
  
  -- Export parameters
  date_range_start DATE,
  date_range_end DATE,
  entry_ids UUID[], -- Specific entries exported
  filters JSONB, -- Export filters applied
  
  -- Compliance metadata
  export_hash TEXT NOT NULL, -- Hash of exported file
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Optional expiration
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT
);

CREATE INDEX idx_exports_user_id ON exports(user_id, created_at DESC);
CREATE INDEX idx_exports_status ON exports(status);

-- RLS
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exports"
  ON exports FOR SELECT
  USING (auth.uid() = user_id);

-- Archive records table
CREATE TABLE archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Archive details
  archive_type TEXT NOT NULL CHECK (archive_type IN ('full', 'incremental', 'compliance')),
  archive_date DATE NOT NULL,
  entry_count INTEGER NOT NULL,
  
  -- Storage
  storage_path TEXT NOT NULL,
  storage_hash TEXT NOT NULL,
  file_size BIGINT,
  
  -- Compliance
  is_verified BOOLEAN DEFAULT FALSE,
  verification_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Retention
  retention_until TIMESTAMPTZ,
  is_permanent BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_archives_user_id ON archives(user_id, archive_date DESC);

-- RLS
ALTER TABLE archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own archives"
  ON archives FOR SELECT
  USING (auth.uid() = user_id);

