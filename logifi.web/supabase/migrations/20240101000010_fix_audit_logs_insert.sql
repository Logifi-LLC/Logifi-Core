-- Fix audit_logs RLS and foreign key constraint issues
-- The trigger function needs to insert audit logs, but RLS and FK constraints were blocking it

-- First, make entry_id nullable for delete operations (or we can store it differently)
-- Actually, let's keep it NOT NULL but fix the trigger to work correctly

-- Add INSERT policy for audit_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'audit_logs' 
    AND policyname = 'Allow audit log inserts via trigger'
  ) THEN
    CREATE POLICY "Allow audit log inserts via trigger"
      ON audit_logs FOR INSERT
      WITH CHECK (true); -- Allow all inserts (trigger function handles security)
  END IF;
END $$;

-- Fix the trigger function to handle deletes properly
-- The issue is that AFTER DELETE, the entry_id FK constraint fails
-- Solution: Change trigger to BEFORE DELETE for delete operations, or store entry_id differently
CREATE OR REPLACE FUNCTION log_entry_changes()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields_array TEXT[];
  old_json JSONB;
  new_json JSONB;
BEGIN
  -- Determine action type
  IF TG_OP = 'DELETE' THEN
    -- For DELETE, we need to insert BEFORE the row is deleted to satisfy FK constraint
    -- But we're using AFTER trigger, so we need to work around this
    -- Store the entry_id before it's deleted
    old_json := to_jsonb(OLD);
    
    -- Insert audit log - entry_id will be valid since we're in the trigger
    -- The FK constraint should pass because the row still exists in the transaction
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

-- Recreate the triggers - need separate triggers for different timings
-- Drop the old trigger first
DROP TRIGGER IF EXISTS log_entry_audit_trigger ON log_entries;
DROP TRIGGER IF EXISTS log_entry_audit_trigger_insert ON log_entries;
DROP TRIGGER IF EXISTS log_entry_audit_trigger_update ON log_entries;
DROP TRIGGER IF EXISTS log_entry_audit_trigger_delete ON log_entries;

-- Create separate triggers for INSERT, UPDATE, and DELETE
-- INSERT and UPDATE use AFTER (entry exists)
CREATE TRIGGER log_entry_audit_trigger_insert
  AFTER INSERT ON log_entries
  FOR EACH ROW
  EXECUTE FUNCTION log_entry_changes();

CREATE TRIGGER log_entry_audit_trigger_update
  AFTER UPDATE ON log_entries
  FOR EACH ROW
  EXECUTE FUNCTION log_entry_changes();

-- DELETE uses BEFORE (entry still exists for FK constraint)
CREATE TRIGGER log_entry_audit_trigger_delete
  BEFORE DELETE ON log_entries
  FOR EACH ROW
  EXECUTE FUNCTION log_entry_changes();

-- Also ensure the function is properly configured
ALTER FUNCTION log_entry_changes() SECURITY DEFINER;

-- Fix entry_revisions RLS - the revision trigger needs to insert
-- Add INSERT policy for entry_revisions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'entry_revisions' 
    AND policyname = 'Allow revision inserts via trigger'
  ) THEN
    CREATE POLICY "Allow revision inserts via trigger"
      ON entry_revisions FOR INSERT
      WITH CHECK (true); -- Allow all inserts (trigger function handles security)
  END IF;
END $$;

-- Ensure the revision function has SECURITY DEFINER
ALTER FUNCTION create_revision_before_update() SECURITY DEFINER;

