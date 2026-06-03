-- Clear Security Advisor: "Signed-in users can execute SECURITY DEFINER function"
-- on validate_entry_integrity. RLS on log_entries already limits reads to auth.uid().

CREATE OR REPLACE FUNCTION public.validate_entry_integrity(entry_uuid UUID)
RETURNS TABLE (
  is_valid BOOLEAN,
  current_hash TEXT,
  computed_hash TEXT
) AS $$
DECLARE
  entry_record public.log_entries%ROWTYPE;
  hash_text TEXT;
  computed TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO entry_record
  FROM public.log_entries
  WHERE id = entry_uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  hash_text := public.build_entry_hash_text(
    entry_record.date,
    entry_record.aircraft_make_model,
    entry_record.registration,
    entry_record.flight_time,
    entry_record.performance,
    entry_record.version
  );

  computed := public.compute_entry_hash_from_text(hash_text);

  RETURN QUERY
  SELECT
    (entry_record.data_hash = computed) AS is_valid,
    entry_record.data_hash AS current_hash,
    computed AS computed_hash;
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog, pg_temp;

REVOKE EXECUTE ON FUNCTION public.validate_entry_integrity(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_entry_integrity(UUID) TO authenticated;
