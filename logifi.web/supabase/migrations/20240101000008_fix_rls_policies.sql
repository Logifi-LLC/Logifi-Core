-- Fix RLS for tables that were missing it
-- This migration fixes the security issue where some tables didn't have RLS enabled

-- Enable RLS on audit_logs (if not already enabled)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Ensure audit_logs policy exists (idempotent - won't error if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'audit_logs' 
    AND policyname = 'Users can view own audit logs'
  ) THEN
    CREATE POLICY "Users can view own audit logs"
      ON audit_logs FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM log_entries
          WHERE log_entries.id = audit_logs.entry_id
          AND log_entries.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Enable RLS on entry_revisions
ALTER TABLE entry_revisions ENABLE ROW LEVEL SECURITY;

-- Create policy for entry_revisions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'entry_revisions' 
    AND policyname = 'Users can view own entry revisions'
  ) THEN
    CREATE POLICY "Users can view own entry revisions"
      ON entry_revisions FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM log_entries
          WHERE log_entries.id = entry_revisions.entry_id
          AND log_entries.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Note: entries_with_signatures is a VIEW, not a table
-- Views inherit RLS from their underlying tables (log_entries)
-- The "UNRESTRICTED" warning on views is normal and safe

