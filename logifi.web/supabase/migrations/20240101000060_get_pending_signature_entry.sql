-- Full pending-entry detail for instructor review before remote sign.
-- Narrow SECURITY DEFINER access (no broad log_entries SELECT for instructors).

CREATE OR REPLACE FUNCTION get_pending_signature_entry(p_entry_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_entry log_entries%ROWTYPE;
  v_student_name TEXT;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_entry_id IS NULL THEN
    RAISE EXCEPTION 'entry id is required';
  END IF;

  SELECT * INTO v_entry
  FROM log_entries
  WHERE id = p_entry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'log entry not found';
  END IF;

  IF v_entry.signature_pending IS NOT TRUE THEN
    RAISE EXCEPTION 'entry is not pending signature';
  END IF;

  IF v_entry.pending_instructor_id IS DISTINCT FROM v_caller THEN
    RAISE EXCEPTION 'not authorized to review this entry';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM instructor_student_relationships r
    WHERE r.student_id = v_entry.user_id
      AND r.instructor_id = v_caller
      AND r.status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'no active instructor relationship for this entry';
  END IF;

  IF EXISTS (
    SELECT 1 FROM flight_signatures fs WHERE fs.log_entry_id = p_entry_id
  ) THEN
    RAISE EXCEPTION 'entry is already signed';
  END IF;

  SELECT up.full_name INTO v_student_name
  FROM user_profiles up
  WHERE up.id = v_entry.user_id;

  RETURN jsonb_build_object(
    'student_name', v_student_name,
    'entry', to_jsonb(v_entry)
  );
END;
$$;

REVOKE ALL ON FUNCTION get_pending_signature_entry(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_pending_signature_entry(UUID) TO authenticated;

COMMENT ON FUNCTION get_pending_signature_entry(UUID) IS
  'Returns full log entry JSON for instructor review when the entry is pending their signature';
