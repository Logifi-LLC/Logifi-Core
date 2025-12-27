-- Audit log table for tracking all changes
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES log_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Action details
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'sign', 'export', 'restore')),
  old_data JSONB, -- Previous state (for updates/deletes)
  new_data JSONB, -- New state (for creates/updates)
  
  -- Change tracking
  changed_fields TEXT[], -- Array of field names that changed
  change_summary TEXT, -- Human-readable summary
  
  -- Metadata
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  
  -- Compliance metadata
  is_compliance_event BOOLEAN DEFAULT FALSE,
  compliance_reason TEXT
);

-- Indexes for audit queries
CREATE INDEX idx_audit_logs_entry_id ON audit_logs(entry_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_compliance ON audit_logs(is_compliance_event) WHERE is_compliance_event = TRUE;

-- RLS: Users can only see audit logs for their own entries
CREATE POLICY "Users can view own audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM log_entries
      WHERE log_entries.id = audit_logs.entry_id
      AND log_entries.user_id = auth.uid()
    )
  );

-- Function to automatically log changes
CREATE OR REPLACE FUNCTION log_entry_changes()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields_array TEXT[];
  old_json JSONB;
  new_json JSONB;
BEGIN
  -- Determine action type
  IF TG_OP = 'DELETE' THEN
    old_json := to_jsonb(OLD);
    INSERT INTO audit_logs (
      entry_id,
      user_id,
      action,
      old_data,
      changed_fields,
      change_summary,
      is_compliance_event
    ) VALUES (
      OLD.id,
      OLD.user_id,
      'delete',
      old_json,
      ARRAY[]::TEXT[],
      'Entry deleted',
      TRUE
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    old_json := to_jsonb(OLD);
    new_json := to_jsonb(NEW);
    
    -- Calculate changed fields
    SELECT ARRAY_AGG(key)
    INTO changed_fields_array
    FROM jsonb_each(old_json)
    WHERE value IS DISTINCT FROM new_json->key;
    
    INSERT INTO audit_logs (
      entry_id,
      user_id,
      action,
      old_data,
      new_data,
      changed_fields,
      change_summary,
      is_compliance_event
    ) VALUES (
      NEW.id,
      NEW.user_id,
      'update',
      old_json,
      new_json,
      changed_fields_array,
      format('Entry updated: %s fields changed', array_length(changed_fields_array, 1)),
      TRUE
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    new_json := to_jsonb(NEW);
    INSERT INTO audit_logs (
      entry_id,
      user_id,
      action,
      new_data,
      changed_fields,
      change_summary,
      is_compliance_event
    ) VALUES (
      NEW.id,
      NEW.user_id,
      'create',
      new_json,
      ARRAY[]::TEXT[],
      'Entry created',
      TRUE
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create audit logs
CREATE TRIGGER log_entry_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON log_entries
  FOR EACH ROW
  EXECUTE FUNCTION log_entry_changes();

-- Revision history table (snapshots of entries at different versions)
CREATE TABLE entry_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES log_entries(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  entry_data JSONB NOT NULL, -- Full snapshot of entry at this version
  data_hash TEXT NOT NULL, -- Hash of this version
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  reason TEXT, -- Why this revision was created
  
  UNIQUE(entry_id, version)
);

CREATE INDEX idx_entry_revisions_entry_id ON entry_revisions(entry_id, version DESC);

