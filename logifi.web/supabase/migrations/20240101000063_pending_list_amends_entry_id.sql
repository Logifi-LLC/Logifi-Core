-- Include amendment link in instructor pending-signatures list.

DROP FUNCTION IF EXISTS list_pending_signatures_for_instructor();

CREATE OR REPLACE FUNCTION list_pending_signatures_for_instructor()
RETURNS TABLE (
  log_entry_id UUID,
  student_id UUID,
  student_name TEXT,
  date DATE,
  departure TEXT,
  destination TEXT,
  registration TEXT,
  aircraft_make_model TEXT,
  dual_received NUMERIC,
  total_time NUMERIC,
  updated_at TIMESTAMPTZ,
  amends_entry_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT
    le.id AS log_entry_id,
    le.user_id AS student_id,
    up.full_name AS student_name,
    le.date,
    le.departure,
    le.destination,
    le.registration,
    le.aircraft_make_model,
    COALESCE((le.flight_time->>'dual')::NUMERIC, 0) AS dual_received,
    COALESCE((le.flight_time->>'total')::NUMERIC, 0) AS total_time,
    le.updated_at,
    le.amends_entry_id
  FROM log_entries le
  INNER JOIN instructor_student_relationships r
    ON r.student_id = le.user_id
   AND r.instructor_id = v_caller
   AND r.status = 'ACTIVE'
  LEFT JOIN user_profiles up
    ON up.id = le.user_id
  WHERE le.signature_pending = true
    AND le.pending_instructor_id = v_caller
    AND NOT EXISTS (
      SELECT 1 FROM flight_signatures fs WHERE fs.log_entry_id = le.id
    )
  ORDER BY le.date DESC, le.updated_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION list_pending_signatures_for_instructor() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION list_pending_signatures_for_instructor() TO authenticated;

COMMENT ON FUNCTION list_pending_signatures_for_instructor() IS
  'Returns summary rows of student flights pending this instructor''s signature (ACTIVE roster only); includes amends_entry_id when the row is an amendment';
