-- View for entry with latest signature (placeholder for future)
CREATE OR REPLACE VIEW entries_with_signatures AS
SELECT 
  le.*
FROM log_entries le;

-- Function to get entry audit trail
CREATE OR REPLACE FUNCTION get_entry_audit_trail(entry_uuid UUID)
RETURNS TABLE (
  id UUID,
  action TEXT,
  "timestamp" TIMESTAMPTZ,
  user_id UUID,
  change_summary TEXT,
  changed_fields TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.action,
    al.timestamp,
    al.user_id,
    al.change_summary,
    al.changed_fields
  FROM audit_logs al
  WHERE al.entry_id = entry_uuid
  ORDER BY al.timestamp DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

