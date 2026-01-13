-- Fix entries_with_signatures view security issue
-- Remove any SECURITY DEFINER properties to ensure RLS policies are properly enforced
-- Views should inherit RLS from their underlying tables (log_entries)

-- Drop the existing view if it exists
DROP VIEW IF EXISTS entries_with_signatures;

-- Recreate the view with SECURITY INVOKER
-- This ensures Row Level Security policies from log_entries are properly enforced
-- Users will only see their own entries when querying this view
-- Note: PostgreSQL 15+ requires explicit WITH (security_invoker = true) to set SECURITY INVOKER
CREATE VIEW entries_with_signatures
WITH (security_invoker = true) AS
SELECT 
  le.*
FROM log_entries le;

-- Add comment explaining security considerations
COMMENT ON VIEW entries_with_signatures IS 
  'View for entries with signatures (placeholder for future functionality). '
  'Created with SECURITY INVOKER (security_invoker = true) to ensure RLS policies from log_entries table are enforced. '
  'Users can only access their own entries through this view.';
